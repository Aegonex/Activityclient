const TIER_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

function getTierOrder(tierName) {
  return TIER_ORDER[(tierName || 'common').toLowerCase()] ?? 99
}

function Collection({ rollHistory }) {
  // unique roles จาก history (เอาตัวแรกที่เจอ = ล่าสุด)
  const seen = new Set()
  const uniqueRoles = []
  for (const entry of rollHistory) {
    const key = entry.role?.id ?? entry.role?.name
    if (key && !seen.has(key)) {
      seen.add(key)
      uniqueRoles.push(entry)
    }
  }

  // sort ตาม tier (legendary ก่อน)
  uniqueRoles.sort((a, b) => getTierOrder(a.tier?.name) - getTierOrder(b.tier?.name))

  if (uniqueRoles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[22px] bg-white/5 px-3 py-8 ring-1 ring-white/8">
        <p className="text-sm text-white/40">ยังไม่มียศในคลัง</p>
      </div>
    )
  }

  return (
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[22px] bg-white/5 px-3 py-3 ring-1 ring-white/8">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
          คลังยศ
        </p>
        <span className="text-[11px] text-white/35">
          {uniqueRoles.length} ยศ
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {uniqueRoles.map((entry) => (
          <div
            key={entry.role?.id ?? entry.role?.name}
            className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[16px] bg-[#2b3035] px-2 py-3"
          >
            {/* tier glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle at 50% 20%, ${entry.tier?.color || '#555'}, transparent 70%)`,
              }}
            />

            {entry.role?.imageUrl ? (
              <img
                src={entry.role.imageUrl}
                alt={entry.role.name}
                className="relative h-14 w-14 rounded-[14px] object-cover"
              />
            ) : (
              <div
                className="relative h-14 w-14 rounded-[14px]"
                style={{ backgroundColor: entry.tier?.color || '#4b5563' }}
              />
            )}

            <p className="relative line-clamp-2 text-center text-[11px] font-semibold leading-tight text-white">
              {entry.role?.name}
            </p>

            <span
              className="relative text-[9px] font-bold uppercase tracking-wider"
              style={{ color: entry.tier?.color || '#94a3b8' }}
            >
              {entry.tier?.name || 'Common'}
            </span>

            {/* bottom tier bar */}
            <div
              className="absolute inset-x-0 bottom-0 h-1"
              style={{ backgroundColor: entry.tier?.color || '#60a5fa' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Collection
