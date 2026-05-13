import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { listMyTeamLeaderProjects, startWorkday, endWorkday, reportException } from '@/lib/attendance.functions'
import { getGps, watermarkImage } from '@/lib/attendance-camera'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/team-leader')({
  head: () => ({ meta: [{ title: 'נוכחות יומית — ראש צוות' }] }),
  component: Page,
})

function Page() {
  const list = useServerFn(listMyTeamLeaderProjects)
  const { data, isLoading, refetch } = useQuery({ queryKey: ['tl-teams'], queryFn: () => list() })
  if (isLoading) return <div className="p-6 text-center" dir="rtl">טוען…</div>
  const teams = data?.teams ?? []
  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">הצוותים שלי</h1>
      {teams.length === 0 && <p className="text-muted-foreground">אין צוותים פעילים. צור קשר עם הקבלן.</p>}
      <div className="space-y-3">
        {teams.map((t: any) => (
          <TeamCard key={t.id} team={t} onChange={refetch} />
        ))}
      </div>
      <div className="fixed bottom-4 inset-x-4">
        <Link to="/dashboard"><Button variant="outline" className="w-full">חזרה לדשבורד</Button></Link>
      </div>
    </div>
  )
}

function TeamCard({ team, onChange }: { team: any; onChange: () => void }) {
  const qc = useQueryClient()
  const startFn = useServerFn(startWorkday)
  const endFn = useServerFn(endWorkday)
  const excFn = useServerFn(reportException)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'start' | 'end' | null>(null)
  const [workers, setWorkers] = useState(team.expected_workers)
  const [busy, setBusy] = useState(false)

  const today = team.today
  const status = today?.status

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const gps = await getGps()
      const dataUrl = await watermarkImage(file, { project: team.projects?.name ?? '', gps })
      if (mode === 'start') {
        await startFn({ data: { teamId: team.id, workersActual: workers, gpsLat: gps.lat, gpsLng: gps.lng, photoBase64: dataUrl } })
        toast.success('יום העבודה נפתח')
      } else if (mode === 'end' && today?.id) {
        await endFn({ data: { recordId: today.id, gpsLat: gps.lat, gpsLng: gps.lng, photoBase64: dataUrl } })
        toast.success('יום העבודה נסגר ונשלח לאישור')
      }
      qc.invalidateQueries({ queryKey: ['tl-teams'] })
      onChange()
    } catch (err: any) {
      toast.error(err.message || 'שגיאה')
    } finally {
      setBusy(false)
      setMode(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function exception(reason: any) {
    if (!today?.id) return
    try {
      await excFn({ data: { recordId: today.id, reason } })
      toast.success('חריגה דווחה')
      qc.invalidateQueries({ queryKey: ['tl-teams'] })
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="font-bold text-lg">{team.name}</div>
        <div className="text-sm text-muted-foreground">{team.projects?.name} · {team.expected_workers} עובדים מתוכננים</div>
        {status && (
          <div className="mt-2 inline-block px-2 py-1 rounded text-xs font-medium" style={{
            background: status === 'approved' || status === 'auto_approved' ? '#16a34a' : status === 'exception' || status === 'rejected' ? '#dc2626' : '#ca8a04',
            color: 'white',
          }}>
            {status === 'approved' ? 'אושר' : status === 'auto_approved' ? 'אושר אוטומטית' : status === 'exception' ? 'חריגה' : status === 'rejected' ? 'נדחה' : 'ממתין'}
          </div>
        )}
      </div>

      {!today?.start_time && (
        <>
          <label className="block text-sm">כמה עובדים הגיעו?
            <input type="number" min={1} max={500} value={workers} onChange={(e) => setWorkers(Number(e.target.value))}
              className="mt-1 w-full h-12 rounded border px-3 text-lg" />
          </label>
          <Button size="lg" className="w-full h-16 text-lg" disabled={busy}
            onClick={() => { setMode('start'); fileRef.current?.click() }}>
            📷 התחל יום עבודה
          </Button>
        </>
      )}
      {today?.start_time && !today?.end_time && (
        <>
          <Button size="lg" className="w-full h-16 text-lg" disabled={busy}
            onClick={() => { setMode('end'); fileRef.current?.click() }}>
            📷 סיים יום עבודה
          </Button>
          <details>
            <summary className="text-sm cursor-pointer">דווח חריגה</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([['left_early','עזב מוקדם'],['partial_left','חלק עזב'],['absent','לא הגיע'],['half_day','חצי יום'],['late','איחור'],['other','אחר']] as const).map(([k,l]) => (
                <Button key={k} variant="outline" onClick={() => exception(k)} className="h-12">{l}</Button>
              ))}
            </div>
          </details>
        </>
      )}
      {today?.end_time && <p className="text-sm text-muted-foreground">יום העבודה הסתיים — ממתין לאישור הקבלן.</p>}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </Card>
  )
}
