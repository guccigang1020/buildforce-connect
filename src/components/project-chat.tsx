import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "sonner";
import { listProjectMessages, sendProjectMessage } from "@/lib/project-messages.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SIDE_BUBBLE, SIDE_DOT, SIDE_LABEL, type Side } from "@/lib/sides";

// One shared project chat. Messages are grouped by SIDE — corporation side
// (תאגיד + מנהל תפעול) on one edge/color, contractor side (קבלן + מנהל עבודה) on
// the other — regardless of which individual wrote. The coordinator is excluded
// at the RLS layer. All four participants read and write.
export function ProjectChat({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listProjectMessages);
  const sendFn = useServerFn(sendProjectMessage);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const qkey = ["project-messages", projectId];

  const { data, isLoading } = useQuery({
    queryKey: qkey,
    queryFn: () => listFn({ data: { projectId } }),
    refetchInterval: 15_000,
  });
  const messages = data?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (text: string) => sendFn({ data: { projectId, body: text } }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: qkey });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "שליחת ההודעה נכשלה"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    send.mutate(text);
  };

  return (
    <div className="enterprise-card flex h-[28rem] flex-col p-0" dir="rtl">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">תקשורת בפרויקט</h3>
          <p className="text-xs text-muted-foreground">
            שיחה משותפת בין שני הצדדים. מתועד בפרויקט.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${SIDE_DOT.corp}`} /> {SIDE_LABEL.corp}
          </span>
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${SIDE_DOT.contractor}`} />{" "}
            {SIDE_LABEL.contractor}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">אין הודעות עדיין.</p>
        ) : (
          messages.map((m) => {
            const side = (m.sender_side ?? "corp") as Side;
            // Group by side: corporation side hugs the inline-end edge,
            // contractor side the inline-start edge.
            const alignEnd = side === "corp";
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${alignEnd ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`mb-0.5 flex items-center gap-1.5 text-[11px] ${alignEnd ? "justify-end" : "justify-start"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${SIDE_DOT[side]}`} />
                    <span className="font-semibold text-foreground">
                      {m.sender_name || "משתמש"}
                      {mine && " (אני)"}
                    </span>
                    {m.sender_role && (
                      <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        {m.sender_role}
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm text-foreground ${SIDE_BUBBLE[side]}`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {readOnly ? (
        <div className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-3 text-xs text-muted-foreground">
          <VisibilityIcon sx={{ fontSize: 14 }} />
          צפייה בלבד
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-border px-3 py-2"
        >
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            placeholder="כתוב הודעה…"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" disabled={send.isPending || !body.trim()}>
            <SendIcon sx={{ fontSize: 16 }} className="rtl:rotate-180" />
          </Button>
        </form>
      )}
    </div>
  );
}
