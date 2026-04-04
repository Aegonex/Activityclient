const TIER_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

function getTierOrder(tierName) {
  return TIER_ORDER[(tierName || 'common').toLowerCase()] ?? 99
}

function Collection({ allRoles, rollHistory }) {
  // set ของ role id ที่เคยได้
  const ownedIds = new Set()
  for (const entry of rollHistory) {
    const key = entry.role?.id
    if (key) ownedIds.add(key)
  }

  // sort ตาม tier (legendary ก่อน) แล้วตามชื่อ
  const sorted = [...allRoles].sort((a, b) => {
    const tierDiff = getTierOrder(a.tierName) - getTierOrder(b.tierName)
    if (tierDiff !== 0) return tierDiff
    return (a.name || '').localeCompare(b.name || '')
  })

  const ownedCount = sorted.filter(r => ownedIds.has(r.id)).length

  return (
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[22px] bg-white/5 px-3 py-3 ring-1 ring-white/8">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
          คลังยศ
        </p>
        <span className="text-[11px] text-white/35">
          {ownedCount}/{sorted.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[16px] bg-[#2b3035] px-3 py-3 text-sm text-white/40">
          ยังไม่มียศในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map((role) => {
            const owned = ownedIds.has(role.id)
            return (
              <div
                key={role.id}
                className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-[16px] px-2 py-3 ${
                  owned ? 'bg-[#2b3035]' : 'bg-[#1a1d20]'
                }`}
              >
                {/* tier glow — เฉพาะตัวที่ได้แล้ว */}
                {owned && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                      background: `radial-gradient(circle at 50% 20%, ${role.tierColor || '#555'}, transparent 70%)`,
                    }}
                  />
                )}

                {role.imageUrl ? (
                  <img
                    src={role.imageUrl}
                    alt={role.name}
                    className={`relative h-14 w-14 rounded-[14px] object-cover ${
                      owned ? '' : 'grayscale opacity-30'
                    }`}
                  />
                ) : (
                  <div
                    className={`relative h-14 w-14 rounded-[14px] ${
                      owned ? '' : 'opacity-30'
                    }`}
                    style={{ backgroundColor: role.tierColor || '#4b5563' }}
                  />
                )}

                <p className={`relative line-clamp-2 text-center text-[11px] font-semibold leading-tight ${
                  owned ? 'text-white' : 'text-white/25'
                }`}>
                  {owned ? role.name : '???'}
                </p>

                <span
                  className={`relative text-[9px] font-bold uppercase tracking-wider ${
                    owned ? '' : 'opacity-30'
                  }`}
                  style={{ color: role.tierColor || '#94a3b8' }}
                >
                  {role.tierName || 'Common'}
                </span>

                {/* bottom tier bar */}
                <div
                  className={`absolute inset-x-0 bottom-0 h-1 ${owned ? '' : 'opacity-20'}`}
                  style={{ backgroundColor: role.tierColor || '#60a5fa' }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Collection
