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

// Common — เสียงสั้น เรียบๆ
export function playWinCommon() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const notes = [440, 554] // A4, C#5

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)

    const t = now + i * 0.12
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t)
    osc.stop(t + 0.3)
  })
}

// Rare — 3 โน้ตขึ้น ชัดขึ้น
export function playWinRare() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const notes = [523, 659, 784] // C5, E5, G5

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
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

// Epic — 4 โน้ต + ดังขึ้น + เสียงซ้อน
export function playWinEpic() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq
    osc2.type = 'sine'
    osc2.frequency.value = freq * 1.005 // detune เล็กน้อย สร้างความหนา

    osc.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    const t = now + i * 0.1
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.start(t)
    osc.stop(t + 0.5)
    osc2.start(t)
    osc2.stop(t + 0.5)
  })
}

// Legendary — 5 โน้ต + ดังสุด + reverb-like tail + shimmer
export function playWinLegendary() {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const notes = [523, 659, 784, 1047, 1319] // C5, E5, G5, C6, E6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const osc3 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq
    osc2.type = 'sine'
    osc2.frequency.value = freq * 1.003
    osc3.type = 'sine'
    osc3.frequency.value = freq * 2 // octave shimmer

    osc.connect(gain)
    osc2.connect(gain)
    osc3.connect(gain)
    gain.connect(ctx.destination)

    const t = now + i * 0.09
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.22, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
    osc.start(t)
    osc.stop(t + 0.8)
    osc2.start(t)
    osc2.stop(t + 0.8)
    osc3.start(t + 0.04)
    osc3.stop(t + 0.6)
  })

  // Impact boom ตอนเริ่ม
  const boom = ctx.createOscillator()
  const boomGain = ctx.createGain()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(120, now)
  boom.frequency.exponentialRampToValueAtTime(40, now + 0.3)
  boom.connect(boomGain)
  boomGain.connect(ctx.destination)
  boomGain.gain.setValueAtTime(0.2, now)
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  boom.start(now)
  boom.stop(now + 0.4)
}

// Helper: เล่นเสียงตาม tier name
export function playWinByTier(tierName) {
  const tier = (tierName || 'common').toLowerCase()
  switch (tier) {
    case 'legendary': return playWinLegendary()
    case 'epic': return playWinEpic()
    case 'rare': return playWinRare()
    default: return playWinCommon()
  }
}
