import * as React from "react";
import MuiCheckbox from "@mui/material/Checkbox";

/** MUI-backed Checkbox keeping the Radix API (checked / onCheckedChange). */
const Checkbox = React.forwardRef<
  HTMLButtonElement,
  {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    className?: string;
    "aria-label"?: string;
  }
>(({ checked, defaultChecked, onCheckedChange, disabled, id, className, ...props }, ref) => (
  <MuiCheckbox
    ref={ref as React.Ref<HTMLButtonElement>}
    id={id}
    checked={checked}
    defaultChecked={defaultChecked}
    disabled={disabled}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    size="small"
    className={className}
    sx={{ padding: "4px" }}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
