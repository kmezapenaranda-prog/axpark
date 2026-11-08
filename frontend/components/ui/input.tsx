import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      className={cn(
        "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-[border-color,box-shadow,background-color] duration-150",
        "border border-[color:var(--border-medium)] focus:border-[color:var(--primary)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}
      {...props}
    />
  );
}
