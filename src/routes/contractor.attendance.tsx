import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listContractorAttendance, approveAttendance, approveAllPending } from '@/lib/attendance.functions'
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
  const { data, refetch } = useQuery({ queryKey: ['contractor-att'], queryFn: () => list({ data: {} }) })
  const records = data?.records ?? []
  const pending = records.filter((r: any) => (r.status === 'pending' || r.status === 'exception') && r.end_time)

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">נוכחות היום</h1>
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
                  {r.exception_reason && <div className="text-orange-600 text-sm mt-1">חריגה: {r.exception_reason}</div>}
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: s.bg }}>{s.label}</span>
              </div>
              {(r.status === 'pending' || r.status === 'exception') && r.end_time && !r.frozen_at && (
                <Button size="sm" className="mt-3" onClick={async () => {
                  await approve({ data: { recordId: r.id } }); toast.success('אושר'); refetch()
                }}>אשר</Button>
              )}
            </Card>
          )
        })}
        {records.length === 0 && <p className="text-muted-foreground">אין רשומות נוכחות להיום.</p>}
      </div>
    </div>
  )
}
