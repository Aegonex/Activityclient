import { useEffect, useRef, useState } from 'react'
import { DiscordSDK } from '@discord/embedded-app-sdk'
import api from './api/client'
import ReelSpinner from './components/ReelSpinner'
import TopUpModal from './components/TopUpModal'
import { playTick, playWin, playRareWin } from './utils/sound'

const ITEM_WIDTH = 88   // w-[5.5rem] = 88px
const ITEM_GAP = 8      // gap-2 = 8px
const REEL_SIZE = 50
const WINNER_INDEX = 45
const PAID_ROLL_COST = 10
const SPIN_DURATION = 8000
let discordBootstrapPromise = null
let discordSdkInstance = null

function getDiscordSdk() {
  if (!discordSdkInstance) {
    discordSdkInstance = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID)
  }

  return discordSdkInstance
}

async function bootstrapDiscord() {
  if (!import.meta.env.VITE_DISCORD_CLIENT_ID) {
    throw new Error('Missing VITE_DISCORD_CLIENT_ID')
  }

  if (!discordBootstrapPromise) {
    discordBootstrapPromise = (async () => {
      const discordSdk = getDiscordSdk()

      await discordSdk.ready()
      window.__DEBUG = 'SDK ready ✓'

      const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: ['identify', 'guilds'],
      })
      window.__DEBUG = 'Authorize ✓'

      const tokenResponse = await api.post('/token', { code })
      window.__DEBUG = 'Token ✓'

      const auth = await discordSdk.commands.authenticate({
        access_token: tokenResponse.data.access_token,
      })
      window.__DEBUG = 'Authenticate ✓'

      if (!auth?.user?.id) {
        throw new Error('Authenticate command failed')
      }

      return auth
    })().catch((error) => {
      discordBootstrapPromise = null
      throw error
    })
  }

  return discordBootstrapPromise
}

function getAvatarUrl(user) {
  if (!user?.id) {
    return ''
  }

  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
  }

  const index = Number((BigInt(user.id) >> 22n) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}

function buildSpinnerItems(allRoles, winnerRole) {
  const sourceRoles = allRoles.length > 0 ? allRoles : [winnerRole]

  return Array.from({ length: REEL_SIZE }, (_, index) => {
    if (index === WINNER_INDEX) {
      return winnerRole
    }

    return sourceRoles[Math.floor(Math.random() * sourceRoles.length)]
  })
}

function buildPreviewItems(allRoles) {
  if (allRoles.length === 0) {
    return []
  }

  return Array.from({ length: REEL_SIZE }, (_, index) => allRoles[index % allRoles.length])
}

function isRareTier(tierName = '') {
  const normalized = tierName.toLowerCase()
  return ['legendary', 'epic', 'mythic', 'rare'].some((tier) => normalized.includes(tier))
}

function formatRollTime(date) {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).format(date)
}

function normalizeHistoryRows(rows) {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.map((entry) => ({
    ...entry,
    rolledAt: entry.rolledAt ? new Date(entry.rolledAt) : new Date(),
  }))
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-300">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h10.38a2 2 0 0 1 1.42.59l1.53 1.53A2 2 0 0 1 19.41 8H20a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="16.5" cy="13" r="1.25" fill="currentColor" />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-amber-300">
      <path
        d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Zm0 0V7.5A1.5 1.5 0 0 1 5.5 6H18.5A1.5 1.5 0 0 1 20 7.5V10M12 6v15M8.5 6c-1.38 0-2.5-.9-2.5-2s1.12-2 2.5-2C10.43 2 12 6 12 6s-2.12 0-3.5 0Zm7 0C16.88 6 18 5.1 18 4s-1.12-2-2.5-2C14.12 2 12 6 12 6s2.12 0 3.5 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ErrorScreen({ title, message }) {
  return (
    <main className="safe-screen flex h-screen items-center justify-center overflow-hidden bg-[#23272a] px-6 text-white">
      <div className="w-full max-w-sm rounded-[28px] bg-[#1c1f22] px-6 py-8 text-center ring-1 ring-white/8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-xl font-bold text-red-300">
          !
        </div>
        <p className="mt-5 text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-white/55">{message}</p>
        <p className="mt-3 text-xs text-white/30">Last step: {window.__DEBUG || 'none'}</p>
        <p className="mt-1 text-xs text-white/30">Client ID: {import.meta.env.VITE_DISCORD_CLIENT_ID || 'missing'}</p>
      </div>
    </main>
  )
}

function formatApiError(error, fallback) {
  const message = error?.response?.data?.error
  const details = error?.response?.data?.details

  if (message === 'discordUserId is required') {
    return 'ไม่พบรหัสผู้ใช้ Discord'
  }

  if (message === 'Already used free roll today') {
    return 'คุณใช้สิทธิ์สุ่มฟรีวันนี้ไปแล้ว'
  }

  if (message === 'Insufficient balance') {
    return 'ยอดเงินไม่พอ'
  }

  if (message === 'Internal server error') {
    return 'เซิร์ฟเวอร์เกิดข้อผิดพลาด'
  }

  if (message === 'Discord token exchange failed') {
    return details
      ? `Discord login ไม่สำเร็จ: ${details}`
      : 'Discord login ไม่สำเร็จ'
  }

  if (message === 'Failed to reach Discord token API') {
    return 'เซิร์ฟเวอร์เชื่อมต่อ Discord ไม่สำเร็จ'
  }

  return message || fallback
}

function explainBootstrapError(error) {
  if (error?.message === 'Missing VITE_DISCORD_CLIENT_ID') {
    return 'ยังไม่ได้ตั้งค่า VITE_DISCORD_CLIENT_ID'
  }

  if (error?.message === 'Authenticate command failed') {
    return 'Discord authenticate ไม่สำเร็จ'
  }

  if (error?.response?.data?.error || error?.response?.data?.details) {
    return formatApiError(error, 'เชื่อมต่อ Discord ไม่สำเร็จ')
  }

  if (error?.message) {
    return `เชื่อมต่อ Discord ไม่สำเร็จ: ${error.message}`
  }

  return 'เชื่อมต่อ Discord ไม่สำเร็จ'
}

function App() {
  const [auth, setAuth] = useState(null)
  const [balance, setBalance] = useState(0)
  const [canRoll, setCanRoll] = useState(false)
  const [allRoles, setAllRoles] = useState([])
  const [spinnerItems, setSpinnerItems] = useState([])
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('booting')
  const [errorMessage, setErrorMessage] = useState('')
  const [rollInFlight, setRollInFlight] = useState(false)
  const [trackOffset, setTrackOffset] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rollHistory, setRollHistory] = useState([])
  const [showTopUp, setShowTopUp] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const wrapperRef = useRef(null)
  const reelTrackRef = useRef(null)
  const spinTimeoutRef = useRef(null)

  const discordUserId = auth?.user?.id ?? ''
  const displayName = auth?.user?.global_name || auth?.user?.username || 'Unknown User'
  const avatarUrl = getAvatarUrl(auth?.user)
  const reelItems = spinnerItems.length > 0 ? spinnerItems : buildPreviewItems(allRoles)
  const showResultModal = Boolean(result)
  const rareResult = isRareTier(result?.tier?.name)

  function stopSpinnerAnimation() {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current)
      spinTimeoutRef.current = null
    }
  }

  function resetReelPosition() {
    const track = reelTrackRef.current

    setIsSpinning(false)
    setTrackOffset(0)

    if (!track) {
      return
    }

    track.style.transition = 'none'
    track.style.transform = 'translateX(0px)'
    // Force layout so the reset is committed before the next animated transform.
    void track.offsetHeight
  }

  async function animateSpinner(isRare) {
    stopSpinnerAnimation()
    resetReelPosition()

    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve)
      })
    })

    const wrapperWidth = wrapperRef.current?.clientWidth ?? 0
    const itemStep = ITEM_WIDTH + ITEM_GAP
    const rawTargetOffset = Math.max(
      0,
      WINNER_INDEX * itemStep - wrapperWidth / 2 + ITEM_WIDTH / 2
    )
    const maxOffset = Math.max(
      0,
      (reelTrackRef.current?.scrollWidth ?? 0) - wrapperWidth
    )
    const targetOffset = Math.min(rawTargetOffset, maxOffset)

    await new Promise((resolve) => {
      let lastItemIndex = -1
      let tickRafId = null

      // ติดตาม transform เพื่อเล่นเสียง tick
      function tickLoop() {
        const track = reelTrackRef.current
        if (!track) return

        const matrix = new DOMMatrix(getComputedStyle(track).transform)
        const currentOffset = Math.abs(matrix.m41)
        const currentItemIndex = Math.floor(currentOffset / itemStep)

        if (currentItemIndex !== lastItemIndex) {
          lastItemIndex = currentItemIndex
          // pitch สูงขึ้นเมื่อใกล้หยุด
          const progress = currentOffset / targetOffset
          const pitch = 600 + progress * 600
          playTick(pitch)
        }

        tickRafId = requestAnimationFrame(tickLoop)
      }

      requestAnimationFrame(() => {
        setIsSpinning(true)
        setTrackOffset(targetOffset)
        tickRafId = requestAnimationFrame(tickLoop)
      })

      spinTimeoutRef.current = setTimeout(() => {
        spinTimeoutRef.current = null
        if (tickRafId) cancelAnimationFrame(tickRafId)
        setIsSpinning(false)

        // เสียง win
        if (isRare) {
          playRareWin()
        } else {
          playWin()
        }

        resolve()
      }, SPIN_DURATION)
    })
  }

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        setStatus('booting')
        setErrorMessage('')

        const authenticatedUser = await bootstrapDiscord()
        if (cancelled) {
          return
        }

        setAuth(authenticatedUser)
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('bootstrapDiscord failed:', error)
        console.error('bootstrapDiscord response:', error?.response?.data)
        setStatus('error')
        setErrorMessage(explainBootstrapError(error))
      }
    }

    initialize()

    return () => {
      cancelled = true
      stopSpinnerAnimation()
    }
  }, [])

  useEffect(() => {
    if (!discordUserId) {
      return
    }

    let cancelled = false

    async function loadUi() {
      try {
        setStatus('loading')
        setErrorMessage('')

        const [balanceResponse, availableResponse, rolesResponse, historyResponse] = await Promise.all([
          api.get('/balance', { params: { discordUserId } }),
          api.get('/rolls/available', { params: { discordUserId } }),
          api.get('/roles'),
          api.get('/rolls/history', { params: { discordUserId, limit: 100 } }),
        ])

        if (cancelled) {
          return
        }

        setBalance(balanceResponse.data.balance ?? 0)
        setCanRoll(Boolean(availableResponse.data.canRoll))
        setAllRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : [])
        setRollHistory(normalizeHistoryRows(historyResponse.data))
        setStatus('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setStatus('error')
        setErrorMessage(formatApiError(error, 'โหลดข้อมูลไม่สำเร็จ'))
      }
    }

    loadUi()

    return () => {
      cancelled = true
    }
  }, [discordUserId])

  async function refreshUi() {
    if (!discordUserId) {
      return
    }

    try {
      const [balanceResponse, availableResponse, historyResponse] = await Promise.all([
        api.get('/balance', { params: { discordUserId } }),
        api.get('/rolls/available', { params: { discordUserId } }),
        api.get('/rolls/history', { params: { discordUserId, limit: 5 } }),
      ])

      setBalance(balanceResponse.data.balance ?? 0)
      setCanRoll(Boolean(availableResponse.data.canRoll))
      setRollHistory(normalizeHistoryRows(historyResponse.data))
    } catch (error) {
      console.error('refreshUi failed:', error)
    }
  }

  async function handleRefreshBalance() {
    if (!discordUserId || refreshing) return
    setRefreshing(true)
    try {
      const res = await api.get('/balance', { params: { discordUserId } })
      setBalance(res.data.balance ?? 0)
    } catch (err) {
      console.error('refresh balance failed:', err)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleRoll(rollType) {
    if (!discordUserId || rollInFlight) {
      return
    }

    setRollInFlight(true)
    setResult(null)
    setErrorMessage('')
    resetReelPosition()

    try {
      const guildId = getDiscordSdk().guildId
      const response = await api.post('/rolls', { discordUserId, username: displayName, rollType, guildId })
      const { role, tier } = response.data
      const winnerRole = {
        ...role,
        tierColor: tier?.color,
        tierName: tier?.name,
      }

      setSpinnerItems(buildSpinnerItems(allRoles, winnerRole))
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
      })
      await animateSpinner(isRareTier(tier?.name))

      setResult({ role, tier })

      await refreshUi()
    } catch (error) {
      setErrorMessage(formatApiError(error, 'เกิดข้อผิดพลาดที่ไม่คาดคิด'))
      await refreshUi()
    } finally {
      setRollInFlight(false)
    }
  }

  const freeRollDisabled = status !== 'ready' || rollInFlight || !canRoll
  const paidRollDisabled = status !== 'ready' || rollInFlight || balance < PAID_ROLL_COST
  const freeButtonLabel = rollInFlight
    ? 'กำลังสุ่ม...'
    : canRoll
      ? 'สุ่มฟรี'
      : 'ใช้สิทธิ์แล้ววันนี้'
  const showInitialLoadingScreen = status === 'booting' || status === 'loading'

  function handleConfirmResult() {
    setResult(null)
  }

  if (showInitialLoadingScreen) {
    return (
      <main className="safe-screen flex h-screen items-center justify-center overflow-hidden bg-[#23272a] px-6 text-white">
        <div className="w-full max-w-sm rounded-[28px] bg-[#1c1f22] px-6 py-8 text-center ring-1 ring-white/8">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-[#ffcc66]" />
          <p className="mt-5 text-lg font-semibold">กำลังโหลด...</p>
          <p className="mt-2 text-sm text-white/45">
            กำลังเชื่อมต่อ Discord Activity
          </p>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <ErrorScreen
        title="เข้าใช้งานไม่ได้"
        message={errorMessage || 'เกิดข้อผิดพลาดระหว่างเชื่อมต่อ Discord'}
      />
    )
  }

  return (
    <main className="safe-screen flex h-screen flex-col overflow-hidden bg-[#23272a] pt-[calc(0.75rem+10px)] text-white">
      <div className="mx-auto flex h-full w-full max-w-sm flex-col">
        <header className="border-b border-white/8 px-4 pb-3 pt-[calc(1.25rem+10px)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-[22px] bg-white/5 px-3 py-3 ring-1 ring-white/8">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/10">
                {avatarUrl ? (
                  <img className="h-full w-full object-cover" src={avatarUrl} alt={displayName} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                    ไม่มี
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold leading-tight text-white sm:text-xl">
                  {displayName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/6 px-3 py-2 ring-1 ring-white/8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/55">
                    <WalletIcon />
                    <span>ยอดเงิน</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshBalance}
                    disabled={refreshing}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/8 text-xs text-white/50 transition hover:bg-white/15 disabled:opacity-40"
                    title="รีเฟรชยอดเงิน"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}>
                      <path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-lg font-bold text-white">{balance}</p>
                <button
                  type="button"
                  onClick={() => setShowTopUp(true)}
                  className="mt-1 w-full rounded-lg bg-emerald-500/20 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
                >
                  + เติมเงิน
                </button>
              </div>

              <div className="rounded-2xl bg-white/6 px-3 py-2 ring-1 ring-white/8">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/55">
                  <GiftIcon />
                  <span>สุ่มฟรี</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">
                  {canRoll ? 'พร้อมสุ่มฟรี' : 'ใช้สิทธิ์แล้ว'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="hide-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <ReelSpinner
              wrapperRef={wrapperRef}
              reelTrackRef={reelTrackRef}
              reelItems={reelItems}
              trackOffset={trackOffset}
              isSpinning={isSpinning}
              status={status}
              freeRollDisabled={freeRollDisabled}
              paidRollDisabled={paidRollDisabled}
              freeButtonLabel={freeButtonLabel}
              paidRollCost={PAID_ROLL_COST}
              rollInFlight={rollInFlight}
              onFreeRoll={() => handleRoll('free')}
              onPaidRoll={() => handleRoll('paid')}
            />

            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[22px] bg-white/5 px-3 py-3 ring-1 ring-white/8">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  ประวัติการสุ่ม
                </p>
                <span className="text-[11px] text-white/35">ล่าสุด 100 ครั้ง</span>
              </div>

              {rollHistory.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {rollHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-[16px] bg-[#2b3035] px-3 py-2.5"
                    >
                      {entry.role?.imageUrl ? (
                        <img
                          src={entry.role.imageUrl}
                          alt={entry.role.name}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-xl"
                          style={{ backgroundColor: entry.tier?.color || '#4b5563' }}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {entry.role?.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.tier?.color || '#94a3b8' }}
                          />
                          <span
                          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                          style={{ color: entry.tier?.color || '#cbd5e1' }}
                        >
                          {entry.tier?.name || 'ไม่ทราบระดับ'}
                        </span>
                      </div>
                    </div>

                      <span className="text-[11px] text-white/38">
                        {formatRollTime(entry.rolledAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-[#2b3035] px-3 py-3 text-sm text-white/40">
                  ยังไม่มีประวัติการสุ่ม
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {showTopUp && (
        <TopUpModal
          discordUserId={discordUserId}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            refreshUi()
          }}
        />
      )}

      {showResultModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <button
            type="button"
            aria-label="Close result"
            onClick={handleConfirmResult}
            className="absolute inset-0"
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="result-glow absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ backgroundColor: `${result?.tier?.color || '#fbbf24'}55` }}
            />

            {rareResult &&
              Array.from({ length: 14 }, (_, index) => (
                <span
                  key={index}
                  className="result-particle absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: result?.tier?.color || '#fbbf24',
                    '--tx': `${(index % 2 === 0 ? 1 : -1) * (28 + (index % 4) * 14)}px`,
                    '--ty': `${-80 - (index % 5) * 18}px`,
                    '--delay': `${index * 60}ms`,
                  }}
                />
              ))}
          </div>

          <div className="result-modal relative z-10 w-full max-w-[21rem] overflow-hidden rounded-[2rem] border border-white/12 bg-[#181b1f] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              aria-label="Close result"
            onClick={handleConfirmResult}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/70"
          >
              ปิด
            </button>

            <div className="rounded-[1.6rem] bg-[#101214] px-4 py-5 text-center ring-1 ring-white/8">
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[1.6rem] ring-1 ring-white/10"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${result?.tier?.color || '#64748b'}66, #111315)`,
                }}
              >
                {result?.role?.imageUrl ? (
                  <img
                    src={result.role.imageUrl}
                    alt={result.role.name}
                    className="h-20 w-20 rounded-[1.2rem] object-cover"
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-[1.2rem]"
                    style={{ backgroundColor: result?.tier?.color || '#64748b' }}
                  />
                )}
              </div>

              <p
                className="mt-4 text-[11px] font-black uppercase tracking-[0.34em]"
                style={{ color: result?.tier?.color || '#f8fafc' }}
              >
                {result?.tier?.name || 'รางวัล'}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {result?.role?.name}
              </h2>
              <p className="mt-2 text-sm text-white/45">
                ได้รับยศใหม่เรียบร้อยแล้ว
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmResult}
              className="mt-4 w-full rounded-[1.4rem] bg-[linear-gradient(180deg,#f7f0d1,#d8b35d)] px-4 py-3 text-sm font-bold text-[#251a06] shadow-[0_10px_30px_rgba(216,179,93,0.28)] active:scale-[0.99]"
            >
              เก็บเข้าคลัง
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
