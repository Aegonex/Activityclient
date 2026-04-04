function ReelSpinner({
  wrapperRef,
  reelTrackRef,
  reelItems,
  trackOffset,
  isSpinning,
  status,
  freeRollDisabled,
  paidRollDisabled,
  freeButtonLabel,
  paidRollCost,
  rollInFlight,
  onFreeRoll,
  onPaidRoll,
}) {
  return (
    <div className="shrink-0 rounded-[28px] bg-[#1c1f22] p-3 ring-1 ring-white/6">
      <div className="rounded-[24px] bg-[#111315] px-3 py-4">
        <div
          ref={wrapperRef}
          className="relative overflow-hidden rounded-[20px] bg-[#0d0f10] px-2 py-5"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0d0f10] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0d0f10] to-transparent" />
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 flex-col items-center">
            <div className="h-0 w-0 border-x-[10px] border-t-[14px] border-x-transparent border-t-[#ffcc66]" />
            <div className="h-8 w-[2px] rounded-full bg-[#ffcc66]" />
          </div>

          <div
            ref={reelTrackRef}
            className="flex w-max gap-2 pt-5"
            style={{
              transform: `translateX(-${trackOffset}px)`,
              transition: isSpinning ? 'transform 8s cubic-bezier(0.1, 0, 0.05, 1)' : 'none',
              width: 'max-content',
            }}
          >
            {reelItems.map((role, index) => (
              <div
                key={`${role.id ?? role.name}-${index}`}
                className="relative flex h-28 w-[5.5rem] shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] border border-white/6 bg-[#23272a] px-2 py-3"
              >
                {role.imageUrl ? (
                  <img
                    src={role.imageUrl}
                    alt={role.name}
                    className="h-11 w-11 rounded-[14px] object-cover"
                  />
                ) : (
                  <div
                    className="h-11 w-11 rounded-[14px]"
                    style={{ backgroundColor: role.tierColor || '#555' }}
                  />
                )}
                <p className="line-clamp-2 text-center text-xs font-medium text-white/90">
                  {role.name}
                </p>
                <div
                  className="absolute inset-x-0 bottom-0 h-1.5"
                  style={{ backgroundColor: role.tierColor || '#60a5fa' }}
                />
              </div>
            ))}
          </div>

          {status === 'loading' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0d0f10]/88 text-sm text-white/65">
              กำลังโหลด...
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onFreeRoll}
          disabled={freeRollDisabled}
          className="rounded-[20px] bg-linear-to-br from-[#667eea] to-[#764ba2] px-4 py-4 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(102,126,234,0.3)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {freeButtonLabel}
        </button>

        <button
          type="button"
          onClick={onPaidRoll}
          disabled={paidRollDisabled}
          className="rounded-[20px] bg-linear-to-br from-[#f093fb] to-[#f5576c] px-4 py-4 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(245,87,108,0.3)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {rollInFlight ? 'กำลังสุ่ม...' : `สุ่มเสียเงิน ${paidRollCost}`}
        </button>
      </div>
    </div>
  )
}

export default ReelSpinner
