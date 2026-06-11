import * as React from "react";
import MuiButton from "@mui/material/Button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * MUI-backed Button that keeps the original shadcn API
 * (variant / size / asChild / className) so no call site changes.
 * Tailwind utility classes passed via className still win (e.g. w-full, h-11).
 */

// Kept for files that consume buttonVariants directly (alert-dialog, pagination).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type MuiVariantMap = {
  muiVariant: "contained" | "outlined" | "text";
  muiColor: "primary" | "error" | "inherit";
  extraClass?: string;
};

const VARIANT_MAP: Record<string, MuiVariantMap> = {
  default: { muiVariant: "contained", muiColor: "primary" },
  destructive: { muiVariant: "contained", muiColor: "error" },
  outline: {
    muiVariant: "outlined",
    muiColor: "inherit",
    extraClass: "!border-border !bg-card hover:!bg-accent !text-foreground",
  },
  secondary: {
    muiVariant: "contained",
    muiColor: "inherit",
    extraClass: "!bg-secondary !text-secondary-foreground hover:!bg-secondary/80",
  },
  ghost: {
    muiVariant: "text",
    muiColor: "inherit",
    extraClass: "!text-foreground hover:!bg-accent",
  },
  link: {
    muiVariant: "text",
    muiColor: "primary",
    extraClass: "!underline-offset-4 hover:!underline !px-0",
  },
};

const SIZE_MAP: Record<string, { muiSize: "small" | "medium" | "large"; extraClass?: string }> = {
  default: { muiSize: "medium", extraClass: "!h-9 !px-4 !text-sm" },
  sm: { muiSize: "small", extraClass: "!h-8 !px-3 !text-xs" },
  lg: { muiSize: "large", extraClass: "!h-10 !px-8 !text-sm" },
  icon: { muiSize: "medium", extraClass: "!h-9 !w-9 !min-w-0 !p-0" },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const v = VARIANT_MAP[variant ?? "default"] ?? VARIANT_MAP.default;
    const s = SIZE_MAP[size ?? "default"] ?? SIZE_MAP.default;
    const classes = cn(
      "gap-2 [&_svg]:size-4 [&_svg]:shrink-0 !rounded-lg !font-semibold",
      v.extraClass,
      s.extraClass,
      className,
    );

    // shadcn `asChild` pattern (<Button asChild><Link …/></Button>) → render
    // the MUI Button *as* the child component, merging its props.
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      const { children: grandChildren, ...childProps } = child.props;
      return (
        <MuiButton
          {...childProps}
          {...(props as Record<string, unknown>)}
          component={child.type as React.ElementType}
          variant={v.muiVariant}
          color={v.muiColor}
          size={s.muiSize}
          className={classes}
          ref={ref as React.Ref<HTMLButtonElement>}
        >
          {grandChildren as React.ReactNode}
        </MuiButton>
      );
    }

    const { color: _htmlColor, ...rest } = props;
    return (
      <MuiButton
        {...rest}
        variant={v.muiVariant}
        color={v.muiColor}
        size={s.muiSize}
        className={classes}
        ref={ref}
      >
        {children}
      </MuiButton>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
