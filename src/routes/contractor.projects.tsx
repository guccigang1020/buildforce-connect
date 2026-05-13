import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  listContractorProjects,
  setProjectSiteLocation,
  upsertProjectTeam,
  listProjectTeams,
} from '@/lib/attendance.functions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Users, Phone, Smartphone, QrCode, Printer } from 'lucide-react'

export const Route = createFileRoute('/contractor/projects')({
  head: () => ({ meta: [{ title: 'הגדרת פרויקט — קבלן' }] }),
  component: Page,
})

function Page() {
  const list = useServerFn(listContractorProjects)
  const { data, refetch } = useQuery({ queryKey: ['contractor-projects'], queryFn: () => list() })
  const projects = data?.projects ?? []
  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">הגדרת פרויקטים פעילים</h1>
      <p className="text-muted-foreground mb-6">לאחר זכייה במכרז: סמן את מיקום האתר, הוסף את הטלפון של מנהל האתר ושל ראש הצוות. ללא זה לא ניתן לרשום נוכחות.</p>
      {projects.length === 0 && <p className="text-muted-foreground">אין פרויקטים פעילים עדיין.</p>}
      <div className="space-y-4">
        {projects.map((p: any) => (
          <ProjectCard key={p.id} project={p} onChange={refetch} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, onChange }: { project: any; onChange: () => void }) {
  const qc = useQueryClient()
  const setSite = useServerFn(setProjectSiteLocation)
  const listTeams = useServerFn(listProjectTeams)
  const upsert = useServerFn(upsertProjectTeam)

  const [lat, setLat] = useState(project.site_lat ?? '')
  const [lng, setLng] = useState(project.site_lng ?? '')
  const [radius, setRadius] = useState(project.site_radius_meters ?? 200)
  const [smName, setSmName] = useState(project.site_manager_name ?? '')
  const [smPhone, setSmPhone] = useState(project.site_manager_phone ?? '')
  const [savingSite, setSavingSite] = useState(false)

  const teamsQ = useQuery({ queryKey: ['teams', project.id], queryFn: () => listTeams({ data: { projectId: project.id } }) })

  const useGps = () => {
    if (!navigator.geolocation) return toast.error('דפדפן לא תומך ב-GPS')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); toast.success('מיקום נלכד') },
      () => toast.error('לא ניתן לקבל מיקום'),
      { enableHighAccuracy: true },
    )
  }

  const saveSite = async () => {
    if (!lat || !lng) return toast.error('יש להזין מיקום')
    if (!smPhone || !smName) return toast.error('יש להזין שם וטלפון של מנהל האתר')
    setSavingSite(true)
    try {
      await setSite({ data: {
        projectId: project.id,
        siteLat: Number(lat), siteLng: Number(lng), radiusMeters: Number(radius),
        siteManagerName: smName, siteManagerPhone: smPhone,
      } })
      toast.success('הוגדר בהצלחה')
      onChange()
    } catch (e: any) { toast.error(e.message) } finally { setSavingSite(false) }
  }

  const isReady = project.site_lat && project.site_manager_phone

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">{project.name}</div>
          <div className="text-sm text-muted-foreground">{project.address || 'ללא כתובת'}</div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${isReady ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {isReady ? '✓ מוכן לעבודה' : 'דרושה הגדרה'}
        </span>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> מיקום האתר וגאו-פנס</div>
        <Button type="button" variant="outline" size="sm" onClick={useGps}>📍 קח מיקום נוכחי</Button>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>קו רוחב</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="32.0853" /></div>
          <div><Label>קו אורך</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="34.7818" /></div>
        </div>
        <div><Label>רדיוס מותר (מטר)</Label><Input type="number" min={50} max={2000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></div>

        <div className="font-semibold flex items-center gap-2 mt-4"><Phone className="w-4 h-4" /> מנהל אתר / קבלן באתר</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>שם מנהל האתר</Label><Input value={smName} onChange={(e) => setSmName(e.target.value)} /></div>
          <div><Label>טלפון נייד</Label><Input value={smPhone} onChange={(e) => setSmPhone(e.target.value)} placeholder="050-1234567" /></div>
        </div>
        <Button onClick={saveSite} disabled={savingSite} className="w-full">{savingSite ? 'שומר…' : 'שמור הגדרות אתר'}</Button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> צוותי עבודה</div>
        {(teamsQ.data?.teams ?? []).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between text-sm bg-muted/40 rounded p-2">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">ראש צוות: {t.team_leader_name} · {t.team_leader_phone} · {t.expected_workers} עובדים · ₪{t.hourly_rate}/שעה</div>
            </div>
            <TeamQr teamId={t.id} teamName={t.name} projectName={project.name} />
          </div>
        ))}
        <AddTeamForm projectId={project.id} onSaved={() => qc.invalidateQueries({ queryKey: ['teams', project.id] })} />
      </div>

      {isReady && (teamsQ.data?.teams ?? []).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900">
          ✅ הפרויקט מוכן. ראש הצוות יכול להיכנס ל-<Link to="/team-leader" className="underline font-bold">דף ראש צוות</Link> ולפתוח יום עבודה.
        </div>
      )}
    </Card>
  )
}

function AddTeamForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const upsert = useServerFn(upsertProjectTeam)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [tlName, setTlName] = useState('')
  const [tlPhone, setTlPhone] = useState('')
  const [tlUserId, setTlUserId] = useState('')
  const [workers, setWorkers] = useState(5)
  const [rate, setRate] = useState(60)
  const [busy, setBusy] = useState(false)

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ הוסף צוות</Button>

  const save = async () => {
    if (!name || !tlName || !tlPhone || !tlUserId) return toast.error('כל השדות חובה')
    setBusy(true)
    try {
      await upsert({ data: { projectId, name, teamLeaderName: tlName, teamLeaderPhone: tlPhone, teamLeaderUserId: tlUserId, expectedWorkers: workers, hourlyRate: rate } })
      toast.success('הצוות נוסף')
      setOpen(false); setName(''); setTlName(''); setTlPhone(''); setTlUserId(''); onSaved()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-card">
      <Input placeholder="שם הצוות (למשל: צוות שלד)" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="שם ראש הצוות" value={tlName} onChange={(e) => setTlName(e.target.value)} />
      <Input placeholder="טלפון ראש צוות 050-..." value={tlPhone} onChange={(e) => setTlPhone(e.target.value)} />
      <Input placeholder="מזהה משתמש (UUID) של ראש הצוות במערכת" value={tlUserId} onChange={(e) => setTlUserId(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="עובדים" value={workers} onChange={(e) => setWorkers(Number(e.target.value))} />
        <Input type="number" placeholder="₪/שעה" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} size="sm">שמור</Button>
        <Button variant="ghost" onClick={() => setOpen(false)} size="sm">בטל</Button>
      </div>
    </div>
  )
}

function TeamQr({ teamId, teamName, projectName }: { teamId: string; teamName: string; projectName: string }) {
  const [open, setOpen] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/team-leader?team=${teamId}` : ''
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(url)}`
  const printQr = () => {
    const w = window.open('', '_blank', 'width=420,height=600')
    if (!w) return
    w.document.write(`<!doctype html><html dir="rtl"><head><title>QR — ${projectName} · ${teamName}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:24px}h2{margin:6px 0}p{color:#555;margin:4px 0}img{margin-top:12px;border:1px solid #ddd;border-radius:8px}</style>
      </head><body><h2>${projectName}</h2><p>${teamName}</p><img src="${qrSrc}" alt="QR" />
      <p style="margin-top:14px;font-size:13px">סרוק כדי לפתוח את מסך הנוכחות לצוות זה</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`)
    w.document.close()
  }
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}><QrCode className="w-4 h-4" /> QR לאתר</Button>
      {open && (
        <div className="absolute mt-2 bg-card border rounded-lg p-3 shadow-lg z-10">
          <img src={qrSrc} alt={`QR ${teamName}`} width={180} height={180} />
          <div className="text-xs text-muted-foreground mt-1 max-w-[180px] truncate">{url}</div>
          <Button size="sm" className="w-full mt-2" onClick={printQr}><Printer className="w-4 h-4" /> הדפס מדבקה</Button>
        </div>
      )}
    </>
  )
}