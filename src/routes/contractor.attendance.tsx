import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { listContractorAttendance, approveAttendance, approveAllPending, rejectAttendance, reportException } from '@/lib/attendance.functions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/contractor/attendance')({
  head: () => ({ meta: [{ title: 'אישורי נוכחות — קבלן' }] }),
  component: Page,
})

const STATUS: Record<string, { label: string; bg: string }> = {
  pending: { label: 'ממתין', bg: '#ca8a04' },
  approved: { label: 'אושר', bg: '#16a34a' },
  auto_approved: { label: 'אושר אוטומטית', bg: '#6b7280' },
  exception: { label: 'חריגה', bg: '#ea580c' },
  rejected: { label: 'נדחה', bg: '#dc2626' },
  correction_requested: { label: 'בקשת תיקון', bg: '#7c3aed' },
}

function Page() {
  const list = useServerFn(listContractorAttendance)
  const approve = useServerFn(approveAttendance)
  const approveAll = useServerFn(approveAllPending)
  const reject = useServerFn(rejectAttendance)
  const exc = useServerFn(reportException)
  const { data, refetch } = useQuery({ queryKey: ['contractor-att'], queryFn: () => list({ data: {} }) })
  const records = data?.records ?? []
  const pending = records.filter((r: any) => (r.status === 'pending' || r.status === 'exception') && r.end_time)

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">נוכחות היום</h1>
        <Link to="/contractor/projects"><Button variant="outline" size="sm">⚙️ הגדרת פרויקטים</Button></Link>
      </div>
      <p className="text-muted-foreground mb-4">{records.length} צוותים · {pending.length} ממתינים לאישור</p>
      {pending.length > 0 && (
        <Button size="lg" className="mb-4 h-14 w-full md:w-auto" onClick={async () => {
          const r = await approveAll({ data: {} }); toast.success(`אושרו ${r.count} רשומות`); refetch()
        }}>✅ אשר את כל הממתינים ({pending.length})</Button>
      )}
      <div className="space-y-3">
        {records.map((r: any) => {
          const s = STATUS[r.status] ?? STATUS.pending
          return (
            <Card key={r.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{r.projects?.name} · {r.project_teams?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.workers_actual ?? '—'}/{r.workers_expected} עובדים
                    {r.start_time && ` · התחלה ${new Date(r.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
                    {r.end_time && ` · סיום ${new Date(r.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
                    {r.total_hours && ` · ${r.total_hours} שעות`}
                    {r.total_cost && ` · ₪${Number(r.total_cost).toLocaleString()}`}
                  </div>
                  {r.exception_reason && <div className="text-orange-600 text-sm mt-1">חריגה: {r.exception_reason}{r.exception_note ? ` — ${r.exception_note}` : ''}</div>}
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: s.bg }}>{s.label}</span>
              </div>
              {!r.frozen_at && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {(r.status === 'pending' || r.status === 'exception') && r.end_time && (
                    <>
                      <Button size="sm" onClick={async () => {
                        await approve({ data: { recordId: r.id } }); toast.success('אושר'); refetch()
                      }}>✅ אשר</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        const reason = window.prompt('סיבת דחייה?') ?? ''
                        if (reason.length < 3) return
                        await reject({ data: { recordId: r.id, reason } }); toast.success('נדחה'); refetch()
                      }}>❌ דחה</Button>
                    </>
                  )}
                  {r.start_time && !r.end_time && (
                    <ReportExceptionInline recordId={r.id} onDone={refetch} fn={exc} />
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {records.length === 0 && <p className="text-muted-foreground">אין רשומות נוכחות להיום.</p>}
      </div>
    </div>
  )
}

function ReportExceptionInline({ recordId, onDone, fn }: { recordId: string; onDone: () => void; fn: any }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<'left_early' | 'partial_left' | 'absent' | 'half_day' | 'late' | 'other'>('partial_left')
  const [note, setNote] = useState('')
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>⚠️ דווח חריגה</Button>
  return (
    <div className="w-full border rounded p-2 space-y-2 bg-muted/30">
      <select value={reason} onChange={(e) => setReason(e.target.value as never)} className="w-full h-10 rounded border px-2">
        <option value="partial_left">חלק מהצוות עזב</option>
        <option value="left_early">כל הצוות עזב מוקדם</option>
        <option value="absent">לא הגיעו</option>
        <option value="half_day">חצי יום</option>
        <option value="late">איחור</option>
        <option value="other">אחר</option>
      </select>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="הסבר מה קרה ומתי" className="w-full rounded border p-2 text-sm" rows={2} />
      <div className="flex gap-2">
        <Button size="sm" onClick={async () => {
          if (note.trim().length < 3) return toast.error('יש להסביר מה קרה')
          const r = await fn({ data: { recordId, reason, note } })
          toast.success('חריגה דווחה')
          if (r?.notify) window.open(r.notify, '_blank')
          setOpen(false); onDone()
        }}>שלח</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>בטל</Button>
      </div>
    </div>
  )
}