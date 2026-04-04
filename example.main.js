import { DiscordSDK } from "@discord/embedded-app-sdk";
import "./style.css";

let auth;
let discordUserId;
let allRoles = []; // roles ทั้งหมดสำหรับ animation

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

setupDiscordSdk().then(() => {
  console.log("Discord SDK is authenticated");
  discordUserId = auth.user.id;
  loadUI();
});

async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "applications.commands"],
  });

  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await response.json();

  auth = await discordSdk.commands.authenticate({ access_token });
  if (auth == null) throw new Error("Authenticate command failed");
}

// --- โหลดข้อมูลแล้ว render ---
async function loadUI() {
  const [balanceData, rollData, rolesData] = await Promise.all([
    fetch(`/api/balance?discordUserId=${discordUserId}`).then(r => r.json()),
    fetch(`/api/rolls/available?discordUserId=${discordUserId}`).then(r => r.json()),
    fetch('/api/roles').then(r => r.json()),
  ]);

  allRoles = rolesData;
  renderMain(balanceData.balance ?? 0, rollData.canRoll);
}

// --- Avatar URL ---
function getAvatarUrl() {
  const user = auth.user;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const index = (BigInt(user.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

// --- Render หน้าหลัก ---
function renderMain(balance, canRoll) {
  const app = document.querySelector('#app');

  app.innerHTML = `
    <div class="profile">
      <img class="avatar" src="${getAvatarUrl()}" alt="avatar" />
      <span class="username">${auth.user.global_name || auth.user.username}</span>
    </div>

    <div class="balance-box">
      <span class="balance-label">ยอดเงิน</span>
      <span class="balance-amount">${balance} บาท</span>
    </div>

    <div class="roll-section">
      <button id="btn-free-roll" class="btn-roll btn-free" ${!canRoll ? 'disabled' : ''}>
        สุ่มฟรี (${canRoll ? 'พร้อม!' : 'ใช้แล้ววันนี้'})
      </button>
      <button id="btn-paid-roll" class="btn-roll btn-paid" ${balance < 10 ? 'disabled' : ''}>
        สุ่มเสียเงิน (10 บาท)
      </button>
    </div>

    <div class="spinner-wrapper">
      <div class="spinner-pointer"></div>
      <div class="spinner-track" id="spinner-track"></div>
    </div>

    <div id="result" class="result"></div>
  `;

  document.getElementById('btn-free-roll').addEventListener('click', () => doRoll('free'));
  document.getElementById('btn-paid-roll').addEventListener('click', () => doRoll('paid'));
}

// --- สร้างแถบ roles สำหรับ animation ---
const ITEM_WIDTH = 120; // px ต่อ 1 ช่อง
const VISIBLE_ITEMS = 50; // จำนวนช่องทั้งหมดในแถบ
const WINNER_INDEX = 42; // ตำแหน่งที่ role ที่ได้จะอยู่ (ใกล้ปลาย)

function buildSpinnerItems(winnerRole) {
  const items = [];
  for (let i = 0; i < VISIBLE_ITEMS; i++) {
    if (i === WINNER_INDEX) {
      items.push(winnerRole);
    } else {
      // สุ่มจาก allRoles มาเติม
      items.push(allRoles[Math.floor(Math.random() * allRoles.length)]);
    }
  }
  return items;
}

function renderSpinnerItems(items) {
  const track = document.getElementById('spinner-track');
  track.innerHTML = '';
  track.style.transform = 'translateX(0px)';

  for (const role of items) {
    const el = document.createElement('div');
    el.className = 'spinner-item';
    el.style.borderBottomColor = role.tierColor || '#555';
    el.innerHTML = `
      ${role.imageUrl
        ? `<img class="spinner-item-img" src="${role.imageUrl}" />`
        : `<div class="spinner-item-placeholder" style="background:${role.tierColor || '#555'}"></div>`
      }
      <span class="spinner-item-name">${role.name}</span>
    `;
    track.appendChild(el);
  }
}

// --- Animation easing ---
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateSpinner(onDone) {
  const track = document.getElementById('spinner-track');
  const wrapper = document.querySelector('.spinner-wrapper');
  const wrapperWidth = wrapper.clientWidth;

  // ระยะที่ต้องเลื่อน: ให้ WINNER_INDEX อยู่ตรงกลาง
  const targetX = (WINNER_INDEX * ITEM_WIDTH) - (wrapperWidth / 2) + (ITEM_WIDTH / 2);

  const duration = 4000; // ms
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);

    track.style.transform = `translateX(-${eased * targetX}px)`;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }

  requestAnimationFrame(frame);
}

// --- กดสุ่ม ---
async function doRoll(rollType) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';

  // disable ปุ่ม
  document.getElementById('btn-free-roll').disabled = true;
  document.getElementById('btn-paid-roll').disabled = true;

  try {
    // 1. สุ่มจาก server ก่อน
    const res = await fetch('/api/rolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordUserId, rollType }),
    });

    if (!res.ok) {
      const err = await res.json();
      resultDiv.innerHTML = `<p class="error">${err.error}</p>`;
      await loadUI();
      return;
    }

    const { role, tier } = await res.json();

    // 2. สร้างแถบ animation โดยแทรก role ที่ได้
    const winnerForSpinner = { ...role, tierColor: tier.color, tierName: tier.name };
    const items = buildSpinnerItems(winnerForSpinner);
    renderSpinnerItems(items);

    // 3. เล่น animation
    await new Promise(resolve => animateSpinner(resolve));

    // 4. แสดงผลลัพธ์
    resultDiv.innerHTML = `
      <div class="result-card" style="border-color: ${tier.color}">
        ${role.imageUrl ? `<img class="result-img" src="${role.imageUrl}" />` : ''}
        <div class="result-info">
          <span class="result-tier" style="color: ${tier.color}">${tier.name}</span>
          <span class="result-role">${role.name}</span>
        </div>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `<p class="error">เกิดข้อผิดพลาด</p>`;
    console.error(err);
  }

  // 5. โหลด UI ใหม่
  await loadUI();
}
