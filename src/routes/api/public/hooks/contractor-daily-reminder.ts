import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

// Daily 15:00 reminder: for every contractor with pending/exception records
// (end_time submitted but not approved), log a reminder notification row.
// External WhatsApp/SMS delivery is intentionally out-of-scope here — this
// creates the auditable reminder + powers the in-app banner.
export const Route = createFileRoute('/api/public/hooks/contractor-daily-reminder')({
  server: {
    handlers: {
      POST: async () => {
        const today = new Date().toISOString().slice(0, 10)
        const { data: rows, error } = await supabaseAdmin
          .from('attendance_records')
          .select('id, contractor_id, project_id, projects:project_id(name, site_manager_phone)')
          .eq('work_date', today)
          .in('status', ['pending', 'exception'])
          .is('frozen_at', null)
          .not('end_time', 'is', null)
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
        const list = rows ?? []
        if (list.length === 0) return Response.json({ ok: true, sent: 0 })

        // group by contractor for one notification per contractor
        const byContractor = new Map<string, typeof list>()
        for (const r of list) {
          const arr = byContractor.get(r.contractor_id) ?? []
          arr.push(r)
          byContractor.set(r.contractor_id, arr)
        }

        const inserts: Array<{
          record_id: string
          kind: string
          channel: string
          recipient_phone: string
          recipient_role: string
          payload: Record<string, unknown>
        }> = []
        for (const [, recs] of byContractor) {
          const head = recs[0]
          const phone = (head.projects as { site_manager_phone?: string | null } | null)?.site_manager_phone ?? ''
          inserts.push({
            record_id: head.id,
            kind: 'reminder_15h',
            channel: 'in_app',
            recipient_phone: phone || 'n/a',
            recipient_role: 'contractor',
            payload: { count: recs.length, work_date: today, record_ids: recs.map((r) => r.id) },
          })
        }
        await supabaseAdmin.from('attendance_notifications').insert(inserts as never)
        return Response.json({ ok: true, sent: inserts.length, contractors: byContractor.size })
      },
    },
  },
})