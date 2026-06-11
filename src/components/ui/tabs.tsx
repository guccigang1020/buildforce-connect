import * as React from "react";
import MuiTabs from "@mui/material/Tabs";
import MuiTab from "@mui/material/Tab";
import { cn } from "@/lib/utils";

/**
 * MUI-backed Tabs keeping the Radix/shadcn API:
 * <Tabs value onValueChange><TabsList><TabsTrigger value>…</TabsTrigger></TabsList></Tabs>
 */

type TabsCtx = { value: string; onValueChange?: (v: string) => void };
const Ctx = React.createContext<TabsCtx>({ value: "" });

function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  const { value, onValueChange } = React.useContext(Ctx);
  return (
    <MuiTabs
      value={value}
      onChange={(_, v) => onValueChange?.(v as string)}
      variant="scrollable"
      allowScrollButtonsMobile
      className={cn("!min-h-10 rounded-lg border border-border bg-card", className)}
      slotProps={{ indicator: { className: "!bg-primary" } }}
    >
      {children}
    </MuiTabs>
  );
}

function TabsTrigger({
  value,
  className,
  children,
  ...muiInjected
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
} & Record<string, unknown>) {
  // MUI <Tabs> clones its children and injects selection props (selected,
  // onChange, onClick, indicator …). Because this wrapper sits between Tabs
  // and Tab, those injected props MUST be forwarded — otherwise clicks are
  // swallowed and the tabs never switch.
  return (
    <MuiTab
      {...muiInjected}
      value={value}
      label={<span className="inline-flex items-center gap-1.5 text-[13px]">{children}</span>}
      className={cn("!min-h-10 !px-3 !font-semibold !normal-case", className)}
    />
  );
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
