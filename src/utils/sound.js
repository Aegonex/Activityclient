let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

// เสียง tick สั้นๆ ตอน item ผ่านเส้นกลาง
export function playTick(pitch = 800) {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = pitch
  gain.gain.value = 0.08

  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  osc.start(now)
  osc.stop(now + 0.06)
}

// เสียงตอนได้รางวัล
export function playWin() {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  // เล่น 3 โน้ตขึ้น
  const notes = [523, 659, 784] // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.value = 0

    osc.connect(gain)
    gain.connect(ctx.destination)

    const t = now + i * 0.12
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.15, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

    osc.start(t)
    osc.stop(t + 0.4)
  })
}

// เสียงตอนได้ของหายาก (ดังกว่า + โน้ตเพิ่ม)
export function playRareWin() {
  const ctx = getAudioContext()
  const now = ctx.currentTime

  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.value = 0

    osc.connect(gain)
    gain.connect(ctx.destination)

    const t = now + i * 0.1
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)

    osc.start(t)
    osc.stop(t + 0.6)
  })
}
