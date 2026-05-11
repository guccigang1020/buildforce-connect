import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === 'string' ? s.token : '' }),
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<'loading' | 'ready' | 'already' | 'invalid' | 'success' | 'error'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) return setState('invalid')
        if (d.valid === false && d.reason === 'already_unsubscribed') return setState('already')
        if (d.valid) return setState('ready')
        setState('invalid')
      })
      .catch(() => setState('error'))
  }, [token])

  const confirm = async () => {
    setBusy(true)
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await r.json().catch(() => ({}))
      if (d.success) setState('success')
      else if (d.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch { setState('error') } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {state === 'loading' && (<><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">בודק את הבקשה…</p></>)}
        {state === 'ready' && (<><h1 className="text-xl font-bold mb-2">ביטול קבלת מיילים</h1><p className="text-sm text-muted-foreground mb-6">לחץ לאישור כדי להפסיק לקבל מיילים מ-BuildForce.</p><Button onClick={confirm} disabled={busy} className="w-full">{busy ? 'מבטל…' : 'אישור ביטול'}</Button></>)}
        {state === 'success' && (<><h1 className="text-xl font-bold mb-2">בוטל בהצלחה</h1><p className="text-sm text-muted-foreground">לא תקבל יותר מיילים שיווקיים מאיתנו.</p></>)}
        {state === 'already' && (<><h1 className="text-xl font-bold mb-2">כבר בוטלת</h1><p className="text-sm text-muted-foreground">הכתובת הזו כבר הוסרה מהרשימה.</p></>)}
        {state === 'invalid' && (<><h1 className="text-xl font-bold mb-2">קישור לא תקין</h1><p className="text-sm text-muted-foreground">הקישור פג תוקף או שאינו קיים.</p></>)}
        {state === 'error' && (<><h1 className="text-xl font-bold mb-2">שגיאה</h1><p className="text-sm text-muted-foreground">נסה שוב מאוחר יותר.</p></>)}
      </Card>
    </div>
  )
}
