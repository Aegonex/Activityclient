# API Reference — Gacha Roll Activity

## Flow หลัก

```
Discord Activity เปิด
  → discordSdk.ready()
  → discordSdk.commands.authorize() → ได้ code
  → POST /api/token (แลก code → access_token)
  → discordSdk.commands.authenticate({ access_token }) → ได้ auth object
  → เก็บ discordUserId = auth.user.id
  → loadUI()
      → fetch /api/balance + /api/rolls/available (พร้อมกัน)
      → renderMain(balance, canRoll)
```

**สำคัญ:** ทุก API ที่ใช้ `discordUserId` ต้องรอ auth สำเร็จก่อนเสมอ

---

## Client APIs (ไม่ต้อง auth header)

### 1. แลก Token

```
POST /api/token
Body: { "code": "..." }
Response: { "access_token": "..." }
```

### 2. เช็คยอดเงิน

```
GET /api/balance?discordUserId=123456789
Response: { "balance": 50 }
```

- ถ้า user ยังไม่มีในระบบ → `{ "balance": 0 }`

### 3. เช็คสถานะสุ่มฟรี

```
GET /api/rolls/available?discordUserId=123456789
Response: { "canRoll": true }
```

- `true` = ยังไม่สุ่มฟรีวันนี้
- `false` = ใช้ไปแล้ว (reset ตอนเปลี่ยนวัน)

### 4. สุ่มยศ

```
POST /api/rolls
Body: { "discordUserId": "123456789", "rollType": "free" | "paid" }
Response: {
  "role": {
    "id": 1,
    "name": "Dragon Slayer",
    "discordRoleId": "111222333",
    "tierId": 2,
    "imageUrl": "https://...",
    "isActive": 1
  },
  "tier": {
    "id": 2,
    "name": "Legendary",
    "color": "#FFD700"
  }
}
```

**Errors:**
| Status | Error | สาเหตุ |
|--------|-------|---------|
| 400 | `discordUserId is required` | ไม่ส่ง discordUserId |
| 403 | `Already used free roll today` | สุ่มฟรีไปแล้ววันนี้ |
| 403 | `Insufficient balance` | เงินไม่พอ (paid ต้องมี ≥ 10) |

### 5. ดึง Roles ทั้งหมด (สำหรับ animation)

```
GET /api/roles
Response: [
  {
    "id": 1,
    "name": "Dragon Slayer",
    "discordRoleId": "111222333",
    "tierId": 2,
    "imageUrl": "https://...",
    "isActive": 1,
    "tierName": "Legendary",
    "tierColor": "#FFD700"
  },
  ...
]
```

---

## Admin APIs (ต้องใส่ Bearer token)

Header: `Authorization: Bearer <ADMIN_API_KEY>`

### Tiers

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/tiers` | - | ดึง tier ทั้งหมด |
| POST | `/api/admin/tiers` | `{ name, color, dropRate, pityThreshold }` | สร้าง tier |
| PUT | `/api/admin/tiers/:id` | `{ name, color, dropRate, pityThreshold }` | แก้ไข tier |
| DELETE | `/api/admin/tiers/:id` | - | ลบ tier |

### Roles

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/roles` | - | ดึง role ทั้งหมด |
| POST | `/api/admin/roles` | `{ name, discordRoleId, tierId, imageUrl }` | สร้าง role |
| PUT | `/api/admin/roles/:id` | `{ name, discordRoleId, tierId, imageUrl, isActive }` | แก้ไข role |
| DELETE | `/api/admin/roles/:id` | - | ลบ role |

### Balance

```
POST /api/admin/balance
Body: { "discordUserId": "123456789", "amount": 100 }
Response: { "discordUserId": "123456789", "balance": 150 }
```

---

## Database Tables

| Table | คำอธิบาย |
|-------|----------|
| `User` | discordUserId (PK), username, balance, lastFreeRollDate, createdAt |
| `Tier` | id, name, color, dropRate (DECIMAL 5,2), pityThreshold (nullable) |
| `Role` | id, name, discordRoleId, tierId (FK), imageUrl, isActive |
| `UserRoll` | id, discordUserId (FK), roleId (FK), rollType, rolledAt |
| `UserPity` | discordUserId + tierId (composite PK), counter |

### Pity System
- ทุกครั้งที่สุ่ม: tier ที่ได้ → reset counter = 0, tier อื่นๆ → counter + 1
- ถ้า counter ≥ pityThreshold → การันตี tier นั้นครั้งถัดไป
- tier ที่ไม่มี pityThreshold → ไม่เข้าระบบ pity

### Roll Cost
- Free: ฟรีวันละ 1 ครั้ง
- Paid: 10 บาท/ครั้ง
