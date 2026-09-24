"use client";

import { useRef } from "react";
import { List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { continueListEnter, toggleListOnRange } from "@/lib/task-description";
import { cn } from "@/lib/utils";

type DescriptionFieldProps = {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

function applyToTextarea(
  textarea: HTMLTextAreaElement,
  next: { value: string; start?: number; end?: number; caret?: number },
  onChange?: (value: string) => void,
) {
  textarea.value = next.value;
  onChange?.(next.value);
  const start = next.caret ?? next.start ?? 0;
  const end = next.caret ?? next.end ?? start;
  requestAnimationFrame(() => {
    textarea.setSelectionRange(start, end);
    textarea.focus();
  });
}

export function DescriptionField({
  id = "description",
  name = "description",
  defaultValue,
  value,
  onChange,
  placeholder = "Detail tugas. Gunakan • atau 1. untuk daftar.",
  required,
  className,
}: DescriptionFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const controlled = value !== undefined;

  function applyList(kind: "ul" | "ol") {
    const textarea = ref.current;
    if (!textarea) return;
    const next = toggleListOnRange(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      kind,
    );
    applyToTextarea(textarea, next, onChange);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1">
        <Button
          type="button"
          size="xs"
          variant="outline"
          title="Daftar poin"
          aria-label="Daftar poin"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyList("ul")}
        >
          <List className="h-3.5 w-3.5" />
          Poin
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          title="Daftar bernomor"
          aria-label="Daftar bernomor"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyList("ol")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          Nomor
        </Button>
      </div>
      <Textarea
        ref={ref}
        id={id}
        name={controlled ? undefined : name}
        placeholder={placeholder}
        required={required}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          const textarea = event.currentTarget;
          if (textarea.selectionStart !== textarea.selectionEnd) return;
          const next = continueListEnter(textarea.value, textarea.selectionStart);
          if (!next) return;
          event.preventDefault();
          applyToTextarea(textarea, next, onChange);
        }}
      />
    </div>
  );
}
