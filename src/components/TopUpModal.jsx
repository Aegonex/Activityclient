import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

const POLL_INTERVAL = 3000
const PRESET_AMOUNTS = [10, 50, 100, 500]

function TopUpModal({ discordUserId, onClose, onSuccess }) {
  const [step, setStep] = useState('input') // input | qr | success
  const [amount, setAmount] = useState('')
  const [qrData, setQrData] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [displayAmount, setDisplayAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pollRef = useRef(null)

  // cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleCreateSession() {
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('กรุณากรอกจำนวนเงิน')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await api.post('/payment/create', {
        discordUserId,
        amount: numAmount,
      })

      setQrData(res.data.qr)
      setSessionId(res.data.sessionId)
      setDisplayAmount(res.data.amount)
      setStep('qr')

      // เริ่ม poll สถานะ
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payment/status/${res.data.sessionId}`)
          if (statusRes.data.status === 'success') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setStep('success')
            onSuccess()
          } else if (statusRes.data.status === 'deny') {
            clearInterval(pollRef.current)
            pollRef.current = null
            setError('หมดเวลาชำระเงิน กรุณาลองใหม่')
            setStep('input')
          }
        } catch {
          // ignore poll errors
        }
      }, POLL_INTERVAL)
    } catch (err) {
      setError(err?.response?.data?.error || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={handleCancel}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-white/12 bg-[#181b1f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">เติมเงิน</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-sm text-white/70"
          >
            ปิด
          </button>
        </div>

        {/* Step: Input */}
        {step === 'input' && (
          <div>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-xl py-2 text-sm font-semibold transition ${
                    amount === String(preset)
                      ? 'bg-[#d8b35d] text-[#251a06]'
                      : 'bg-white/8 text-white/70 hover:bg-white/12'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <input
                type="number"
                inputMode="numeric"
                placeholder="หรือกรอกจำนวน (บาท)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl bg-white/8 px-4 py-3 text-center text-lg font-bold text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#d8b35d]"
              />
            </div>

            {error && (
              <p className="mt-2 text-center text-sm text-red-400">{error}</p>
            )}

            <button
              type="button"
              onClick={handleCreateSession}
              disabled={loading || !amount}
              className="mt-4 w-full rounded-[1.4rem] bg-[linear-gradient(180deg,#f7f0d1,#d8b35d)] px-4 py-3 text-sm font-bold text-[#251a06] shadow-[0_10px_30px_rgba(216,179,93,0.28)] disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? 'กำลังสร้าง QR...' : 'สร้าง QR ชำระเงิน'}
            </button>
          </div>
        )}

        {/* Step: QR */}
        {step === 'qr' && (
          <div className="text-center">
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              <img src={qrData} alt="QR Payment" className="h-52 w-52" />
            </div>

            <p className="mt-3 text-2xl font-black text-[#d8b35d]">
              {displayAmount} บาท
            </p>
            <p className="mt-1 text-xs text-white/45">
              สแกนจ่ายภายใน 10 นาที
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span className="text-sm text-white/55">รอการชำระเงิน...</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (pollRef.current) {
                  clearInterval(pollRef.current)
                  pollRef.current = null
                }
                setStep('input')
                setError('')
              }}
              className="mt-4 w-full rounded-[1.4rem] bg-white/8 px-4 py-3 text-sm font-semibold text-white/70 active:scale-[0.99]"
            >
              ยกเลิก
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
              ✓
            </div>
            <p className="mt-4 text-lg font-bold text-emerald-400">
              เติมเงินสำเร็จ!
            </p>
            <p className="mt-1 text-sm text-white/55">
              เพิ่ม {Math.floor(Number(displayAmount))} บาท เข้ายอดเงินแล้ว
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-[1.4rem] bg-[linear-gradient(180deg,#f7f0d1,#d8b35d)] px-4 py-3 text-sm font-bold text-[#251a06] shadow-[0_10px_30px_rgba(216,179,93,0.28)] active:scale-[0.99]"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TopUpModal
