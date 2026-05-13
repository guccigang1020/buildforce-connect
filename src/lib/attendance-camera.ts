// Helper utilities for live camera capture + watermarking
export async function getGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('דפדפן לא תומך ב-GPS'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('לא ניתן לקבל מיקום: ' + err.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

export async function watermarkImage(file: File, opts: { project: string; gps: { lat: number; lng: number } }): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = URL.createObjectURL(file)
  })
  const max = 1280
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  // overlay
  const pad = 12
  const lines = [
    opts.project,
    new Date().toLocaleString('he-IL'),
    `GPS ${opts.gps.lat.toFixed(5)}, ${opts.gps.lng.toFixed(5)}`,
  ]
  ctx.font = `bold ${Math.max(14, Math.floor(w / 36))}px sans-serif`
  const lineH = Math.max(18, Math.floor(w / 30))
  const boxH = lineH * lines.length + pad * 2
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, h - boxH, w, boxH)
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'top'
  lines.forEach((t, i) => ctx.fillText(t, pad, h - boxH + pad + i * lineH))
  return c.toDataURL('image/jpeg', 0.82)
}
