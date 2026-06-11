import * as React from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import { cn } from "@/lib/utils";

/**
 * MUI-backed Dialog that keeps the shadcn API:
 * <Dialog open onOpenChange> <DialogTrigger/> <DialogContent>…</DialogContent> </Dialog>
 */

type DialogCtx = {
  open: boolean;
  setOpen: (o: boolean) => void;
};
const Ctx = React.createContext<DialogCtx>({ open: false, setOpen: () => {} });

function Dialog({
  open: openProp,
  onOpenChange,
  defaultOpen,
  children,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false);
  const open = openProp ?? uncontrolled;
  const setOpen = React.useCallback(
    (o: boolean) => {
      setUncontrolled(o);
      onOpenChange?.(o);
    },
    [onOpenChange],
  );
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const { setOpen } = React.useContext(Ctx);
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      onClick: (e: React.MouseEvent) => {
        (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
        setOpen(true);
      },
    });
  }
  return (
    <button type="button" {...props} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => {
  const { open, setOpen } = React.useContext(Ctx);
  return (
    <MuiDialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth={false}
      dir="rtl"
      slotProps={{
        paper: {
          className: cn(
            "!rounded-xl !bg-card !text-foreground !shadow-2xl-app w-full !max-w-lg !m-4 border border-border",
            className,
          ),
        },
      }}
    >
      <div ref={ref} className="relative max-h-[85vh] overflow-y-auto p-6" {...props}>
        {!hideClose && (
          <button
            type="button"
            aria-label="סגור"
            onClick={() => setOpen(false)}
            className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="!h-4 !w-4" />
          </button>
        )}
        {children}
      </div>
    </MuiDialog>
  );
});
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-right mb-4", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start", className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

function DialogClose({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const { setOpen } = React.useContext(Ctx);
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      onClick: (e: React.MouseEvent) => {
        (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
        setOpen(false);
      },
    });
  }
  return (
    <button type="button" {...props} onClick={() => setOpen(false)}>
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
