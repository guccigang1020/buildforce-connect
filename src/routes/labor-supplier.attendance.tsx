import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { listCorporationAttendance, getMonthlySummary } from '@/lib/attendance.functions'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/labor-supplier/attendance')({
  head: () => ({ meta: [{ title: 'נוכחות — תאגיד כוח אדם' }] }),
  component: Page,
})

function Page() {
  const list = useServerFn(listCorporationAttendance)
  const monthly = useServerFn(getMonthlySummary)
  const today = new Date()
  const { data } = useQuery({ queryKey: ['corp-att'], queryFn: () => list({ data: {} }) })
  const { data: m } = useQuery({
    queryKey: ['corp-monthly', today.getFullYear(), today.getMonth() + 1],
    queryFn: () => monthly({ data: { role: 'corporation', year: today.getFullYear(), month: today.getMonth() + 1 } }),
  })
  const records = data?.records ?? []
  const sum = m?.summary

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">נוכחות צוותים</h1>
      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="ימים מאושרים החודש" value={sum.approved} color="#16a34a" />
          <Stat label="חריגות" value={sum.exceptions} color="#ea580c" />
          <Stat label="שעות בסה״כ" value={sum.totalHours.toFixed(1)} color="#0ea5e9" />
          <Stat label="עלות מאושרת" value={`₪${sum.totalCost.toLocaleString()}`} color="#1e293b" />
        </div>
      )}
      <h2 className="font-bold mb-2">היום</h2>
      <div className="space-y-3">
        {records.map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="font-bold">{r.projects?.name} · {r.project_teams?.name}</div>
            <div className="text-sm text-muted-foreground">
              {r.workers_actual ?? '—'}/{r.workers_expected} עובדים · סטטוס: {r.status}
              {r.total_cost && ` · ₪${Number(r.total_cost).toLocaleString()}`}
            </div>
          </Card>
        ))}
        {records.length === 0 && <p className="text-muted-foreground">אין רשומות נוכחות להיום.</p>}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
    </Card>
  )
}
