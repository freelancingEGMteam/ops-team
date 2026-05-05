import * as React from "react";
import { cn } from "@/lib/utils";

interface InlineCellProps {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineTextCell({ value, onCommit, className, placeholder }: InlineCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  }

  if (!editing) {
    return (
      <span
        className={cn(
          "block cursor-pointer truncate rounded px-1 py-0.5 hover:bg-accent",
          !value && "text-muted-foreground",
          className
        )}
        onClick={(event) => {
          event.stopPropagation();
          setEditing(true);
        }}
      >
        {value || placeholder || "—"}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onClick={(event) => event.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn(
        "w-full rounded border border-ring bg-background px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring",
        className
      )}
    />
  );
}

interface InlineSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string; className?: string }[];
  onCommit: (value: T) => void;
  renderValue?: (value: T) => React.ReactNode;
}

export function InlineSelectCell<T extends string>({
  value,
  options,
  onCommit,
  renderValue,
}: InlineSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex min-h-8 w-full cursor-pointer items-center gap-1 rounded px-2 py-1 text-left hover:bg-accent"
      >
        {renderValue ? renderValue(value) : value}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-md border bg-popover p-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                opt.className
              )}
              onClick={() => {
                onCommit(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
