import * as React from "react";
import MuiChip from "@mui/material/Chip";
import { cn } from "@/lib/utils";

/** MUI Chip–backed Badge keeping the shadcn API (variant + className). */
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const color =
    variant === "destructive" ? "error" : variant === "default" ? "primary" : undefined;
  return (
    <MuiChip
      size="small"
      color={color}
      variant={variant === "outline" || variant === "secondary" ? "outlined" : "filled"}
      label={<span className="inline-flex items-center gap-1">{children}</span>}
      className={cn("!h-6 !rounded-full !text-[11px] !font-semibold", className)}
      {...(props as Record<string, unknown>)}
    />
  );
}

export { Badge };
