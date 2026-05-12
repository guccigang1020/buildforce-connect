import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ROLES, NATIONALITIES } from "@/lib/mock-data";

type Row = {
  id: string;
  corporation_id: string;
  role: string;
  nationality: string;
  count: number;
};

export function WorkforceInventorySection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draftRole, setDraftRole] = useState<string>(ROLES[0]);
  const [draftNat, setDraftNat] = useState<string>(NATIONALITIES[0]);
  const [draftCount, setDraftCount] = useState<number>(1);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["corp-workforce", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("corporation_workforce")
        .select("*")
        .eq("corporation_id", user!.id)
        .order("role");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = data ?? [];
  const total = useMemo(() => rows.reduce((s, r) => s + (r.count ?? 0), 0), [rows]);

  useEffect(() => { setEdits({}); }, [data]);

  async function addRow() {
    if (!user?.id) return;
    if (draftCount < 1) { toast.error("הכמות חייבת להיות לפחות 1"); return; }
    const { error } = await supabase.from("corporation_workforce").upsert(
      { corporation_id: user.id, role: draftRole, nationality: draftNat, count: draftCount },
      { onConflict: "corporation_id,role,nationality" },
    );
    if (error) { toast.error(error.message); return; }
    toast.success("נוסף למלאי");
    setDraftCount(1);
    qc.invalidateQueries({ queryKey: ["corp-workforce", user.id] });
  }

  async function saveRow(id: string) {
    const next = edits[id];
    if (next == null) return;
    const { error } = await supabase
      .from("corporation_workforce")
      .update({ count: Math.max(0, next) })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("עודכן");
    qc.invalidateQueries({ queryKey: ["corp-workforce", user!.id] });
  }

  async function removeRow(id: string) {
    const { error } = await supabase.from("corporation_workforce").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    qc.invalidateQueries({ queryKey: ["corp-workforce", user!.id] });
  }

  return (
    <section className="mt-10 rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Users className="h-4 w-4" /> מלאי כוח אדם
          </div>
          <h2 className="mt-1 text-xl font-extrabold md:text-2xl">פועלים זמינים לפי תפקיד ולאום</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            הצהיר כמה פועלים זמינים אצלך מכל סוג. המידע משמש להתאמה אוטומטית לבקשות שמתפרסמות.
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-center">
          <div className="text-xs text-muted-foreground">סה״כ פועלים זמינים</div>
          <div className="text-2xl font-extrabold text-primary">{total}</div>
        </div>
      </div>

      {/* Add form */}
      <div className="mt-5 grid gap-3 rounded-xl border border-dashed border-border/60 p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">תפקיד</label>
          <Select value={draftRole} onValueChange={setDraftRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">לאום</label>
          <Select value={draftNat} onValueChange={setDraftNat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">כמות</label>
          <Input
            type="number" min={1}
            value={draftCount}
            onChange={(e) => setDraftCount(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={addRow} className="w-full sm:w-auto">
            <Plus className="ml-1 h-4 w-4" /> הוסף / עדכן
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {isLoading ? (
          <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            עוד לא הצהרת על פועלים זמינים. הוסף שורה ראשונה למעלה.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-right">תפקיד</th>
                  <th className="px-4 py-2 text-right">לאום</th>
                  <th className="px-4 py-2 text-right">כמות</th>
                  <th className="px-4 py-2 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const editVal = edits[r.id];
                  const dirty = editVal != null && editVal !== r.count;
                  return (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-4 py-2 font-semibold">{r.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.nationality}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" min={0}
                          className="h-9 w-24"
                          value={editVal ?? r.count}
                          onChange={(e) =>
                            setEdits((p) => ({ ...p, [r.id]: Math.max(0, Number(e.target.value) || 0) }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant={dirty ? "default" : "secondary"}
                            disabled={!dirty}
                            onClick={() => saveRow(r.id)}
                          >
                            <Save className="ml-1 h-3.5 w-3.5" /> שמור
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeRow(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}