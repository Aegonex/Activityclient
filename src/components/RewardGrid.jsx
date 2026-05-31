import { useEffect, useRef, useState } from 'react'
import { playTick } from '../utils/sound'

const TIER_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

function tierRank(name) {
  return TIER_ORDER[(name || 'common').toLowerCase()] ?? 99
}

const REVEAL_BUDGET_MS = 1800

function RewardGrid({ results, onClose }) {
  const [revealed, setRevealed] = useState(0)
  const timerRef = useRef(null)

  // เปิดการ์ดทีละใบแบบ stagger (คุมเวลารวมไม่เกิน budget)
  useEffect(() => {
    if (!results || results.length === 0) {
      return
    }

    const delay = Math.min(120, REVEAL_BUDGET_MS / results.length)
    let count = 0

    timerRef.current = setInterval(() => {
      count += 1
      setRevealed(count)
      playTick(680 + Math.random() * 220)

      if (count >= results.length) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, delay)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [results])

  function revealAll() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRevealed(results.length)
  }

  const allRevealed = revealed >= results.length

  // สรุปจำนวนตาม tier เรียงจากสูง → ต่ำ
  const tierSummary = []
  const seen = new Map()
  for (const entry of results) {
    const name = entry.tier?.name || 'Common'
    if (!seen.has(name)) {
      const bucket = { name, color: entry.tier?.color || '#94a3b8', count: 0 }
      seen.set(name, bucket)
      tierSummary.push(bucket)
    }
    seen.get(name).count += 1
  }
  tierSummary.sort((a, b) => tierRank(a.name) - tierRank(b.name))

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <div className="relative z-10 flex max-h-[88%] w-full max-w-[22rem] flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[#181b1f] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ผลการสุ่ม ×{results.length}</h2>
          {!allRevealed && (
            <button
              type="button"
              onClick={revealAll}
              className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/15"
            >
              เปิดทั้งหมด
            </button>
          )}
        </div>

        {/* แถบสรุป tier */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tierSummary.map((tier) => (
            <span
              key={tier.name}
              className="inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-1 text-[11px] font-semibold"
              style={{ color: tier.color }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tier.color }} />
              {tier.name} ×{tier.count}
            </span>
          ))}
        </div>

        {/* กริดการ์ด */}
        <div className="hide-scrollbar grid grid-cols-3 gap-2 overflow-y-auto">
          {results.map((entry, index) => {
            const isUp = index < revealed
            const color = entry.tier?.color || '#4b5563'

            return (
              <div
                key={index}
                className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[14px] px-1.5 py-2 transition-colors duration-300 ${
                  isUp ? 'bg-[#2b3035]' : 'bg-[#15181b]'
                }`}
              >
                {isUp ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 opacity-15"
                      style={{ background: `radial-gradient(circle at 50% 25%, ${color}, transparent 70%)` }}
                    />
                    {entry.role?.imageUrl ? (
                      <img
                        src={entry.role.imageUrl}
                        alt={entry.role.name}
                        className="relative h-12 w-12 rounded-[12px] object-cover"
                      />
                    ) : (
                      <div className="relative h-12 w-12 rounded-[12px]" style={{ backgroundColor: color }} />
                    )}
                    <p className="relative line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white">
                      {entry.role?.name}
                    </p>
                    <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: color }} />
                  </>
                ) : (
                  <span className="text-lg font-black text-white/15">?</span>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[1.4rem] bg-[linear-gradient(180deg,#f7f0d1,#d8b35d)] px-4 py-3 text-sm font-bold text-[#251a06] shadow-[0_10px_30px_rgba(216,179,93,0.28)] active:scale-[0.99]"
        >
          เก็บเข้าคลัง
        </button>
      </div>
    </div>
  )
}

export default RewardGrid
