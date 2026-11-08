import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="label"
      className={cn("block text-sm font-medium mb-1.5", className)}
      style={{ color: "var(--text-secondary)" }}
      {...props}
    />
  );
}
