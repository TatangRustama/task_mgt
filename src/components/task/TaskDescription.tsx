import { parseTaskDescription } from "@/lib/task-description";
import { cn } from "@/lib/utils";

export function TaskDescription({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const blocks = parseTaskDescription(text);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className="whitespace-pre-line">
              {block.text}
            </p>
          );
        }
        const ListTag = block.type === "ol" ? "ol" : "ul";
        return (
          <ListTag
            key={index}
            className={cn("space-y-0.5 pl-5", block.type === "ol" ? "list-decimal" : "list-disc")}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
