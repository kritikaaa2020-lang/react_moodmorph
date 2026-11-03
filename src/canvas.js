const mood = {
  happy: { tint: 'rgba(255,104,184,0.17)', accent: '#ff6fbd' },
  surprised: { tint: 'rgba(99,222,255,0.16)', accent: '#6de7ff' },
  sad: { tint: 'rgba(113,154,255,0.14)', accent: '#9ac0ff' },
  angry: { tint: 'rgba(255,55,84,0.17)', accent: '#ff3b4f' },
  neutral: { tint: 'rgba(221,218,255,0.12)', accent: '#e7e2ff' }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawNoise(ctx, w, h, amount) {
  const count = Math.floor((w * h) / 1200 * amount)
  ctx.save()
  ctx.globalAlpha = 0.08
  for (let i = 0; i < count; i++) {
    const v = 150 + Math.floor(Math.random() * 105)
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  }
  ctx.restore()
}

function drawMoodFx(ctx, emotion, w, h, intensity) {
  const a = mood[emotion] || mood.neutral
  ctx.save()
  ctx.fillStyle = a.tint
  ctx.fillRect(0, 0, w, h)
  const count = Math.floor(7 + intensity * 16)
  ctx.font = `${18 + intensity * 16}px Arial`
  ctx.textAlign = 'center'
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    if (emotion === 'happy') ctx.fillText(i % 2 ? '♥' : '✦', x, y)
    if (emotion === 'surprised') ctx.fillText(i % 2 ? '⚡' : '✶', x, y)
    if (emotion === 'sad') ctx.fillText(i % 2 ? '•' : '☂', x, y)
    if (emotion === 'angry') ctx.fillText(i % 2 ? '×' : '✹', x, y)
    if (emotion === 'neutral') ctx.fillText(i % 2 ? '✧' : '◇', x, y)
  }
  ctx.restore()
}

function drawLandmarkFx(ctx, emotion, landmarks, scaleX, scaleY, intensity) {
  if (!landmarks || landmarks.length < 68) return
  const leftEye = landmarks[36]
  const rightEye = landmarks[45]
  const mouth = landmarks[62]
  const lx = leftEye.x * scaleX
  const ly = leftEye.y * scaleY
  const rx = rightEye.x * scaleX
  const ry = rightEye.y * scaleY
  const mx = mouth.x * scaleX
  const my = mouth.y * scaleY
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = `${28 + intensity * 24}px Arial`
  if (emotion === 'happy') {
    ctx.fillText('✦', lx - 26, ly - 32)
    ctx.fillText('♥', rx + 28, ry - 22)
  }
  if (emotion === 'surprised') {
    ctx.fillText('✶', lx - 30, ly - 30)
    ctx.fillText('⚡', rx + 32, ry - 18)
  }
  if (emotion === 'sad') {
    ctx.fillStyle = 'rgba(160,210,255,0.85)'
    ctx.beginPath()
    ctx.ellipse(lx, ly + 34, 7, 18, 0, 0, Math.PI * 2)
    ctx.ellipse(rx, ry + 34, 7, 18, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (emotion === 'angry') {
    ctx.fillStyle = '#ff334f'
    ctx.fillText('╱', lx, ly - 20)
    ctx.fillText('╲', rx, ry - 20)
  }
  if (emotion === 'neutral') ctx.fillText('✧', mx + 44, my - 18)
  ctx.restore()
}

export function renderPhoto({ source, emotion, intensity, stickers, caption, flash, inference }) {
  const canvas = document.createElement('canvas')
  const sw = source.videoWidth || source.naturalWidth || source.width
  const sh = source.videoHeight || source.naturalHeight || source.height
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  const size = Math.min(sw, sh)
  const sx = (sw - size) / 2
  const sy = (sh - size) / 2
  ctx.filter = `saturate(${1 + intensity * 0.13}) contrast(${1 + intensity * 0.08}) brightness(${1 + intensity * 0.03})`
  ctx.drawImage(source, sx, sy, size, size, 0, 0, 1080, 1080)
  ctx.filter = 'none'
  drawMoodFx(ctx, emotion, 1080, 1080, intensity)
  if (inference?.landmarks) {
    const scale = 1080 / size
    const translated = inference.landmarks.map(p => ({ x: p.x - sx, y: p.y - sy }))
    drawLandmarkFx(ctx, emotion, translated, scale, scale, intensity)
  }
  drawNoise(ctx, 1080, 1080, 1 + intensity)
  const gradient = ctx.createRadialGradient(540, 500, 120, 540, 500, 680)
  gradient.addColorStop(0, 'rgba(255,255,255,0.06)')
  gradient.addColorStop(1, 'rgba(35,8,48,0.22)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1080)
  if (flash) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, 0, 1080, 1080)
  }
  stickers.forEach(sticker => {
    const x = sticker.x / 100 * 1080
    const y = sticker.y / 100 * 1080
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(sticker.rotation * Math.PI / 180)
    ctx.font = `${sticker.size * 2}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = sticker.color
    ctx.shadowColor = 'rgba(0,0,0,.25)'
    ctx.shadowBlur = 10
    ctx.fillText(sticker.icon, 0, 0)
    ctx.restore()
  })
  ctx.fillStyle = 'rgba(255,255,255,.82)'
  ctx.font = '22px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(new Date().toLocaleString(), 30, 1040)
  ctx.textAlign = 'right'
  ctx.fillText(`MOODMORPH/${emotion.toUpperCase()}`, 1050, 1040)
  if (caption) {
    roundedRect(ctx, 260, 72, 560, 64, 16)
    ctx.fillStyle = 'rgba(255,255,255,.88)'
    ctx.fill()
    ctx.fillStyle = '#4f155f'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(caption.slice(0, 42), 540, 114)
  }
  return canvas.toDataURL('image/png')
}

export async function buildLayout(images, layout) {
  if (!images.length) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const loaded = await Promise.all(images.map(src => new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = src
  })))

  if (layout === 'single') {
    canvas.width = 1080
    canvas.height = 1080
    ctx.drawImage(loaded[loaded.length - 1], 0, 0, 1080, 1080)
  }
  if (layout === 'three') {
    canvas.width = 820
    canvas.height = 2460
    ctx.fillStyle = '#fff7fd'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 3; i++) {
      const img = loaded[Math.max(0, loaded.length - 3 + i)] || loaded[0]
      ctx.drawImage(img, 70, 100 + i * 760, 680, 680)
    }
    ctx.fillStyle = '#66216f'
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('MOODMORPH.EXE / 03 CUT', 410, 2380)
  }
  if (layout === 'four') {
    canvas.width = 1600
    canvas.height = 1600
    ctx.fillStyle = '#fff7fd'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < 4; i++) {
      const img = loaded[Math.max(0, loaded.length - 4 + i)] || loaded[0]
      const x = 60 + (i % 2) * 770
      const y = 60 + Math.floor(i / 2) * 770
      ctx.drawImage(img, x, y, 710, 710)
    }
  }
  return canvas.toDataURL('image/png')
}

export function downloadImage(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
