export type DescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const BULLET_RE = /^[-*•]\s+(.*)$/;
const NUMBER_RE = /^(\d+)[.)]\s+(.*)$/;

export function stripListPrefix(line: string) {
  const trimmed = line.trim();
  const bullet = trimmed.match(BULLET_RE);
  if (bullet) return bullet[1];
  const numbered = trimmed.match(NUMBER_RE);
  if (numbered) return numbered[2];
  return trimmed;
}

export function lineListKind(line: string): "ul" | "ol" | null {
  const trimmed = line.trim();
  if (BULLET_RE.test(trimmed)) return "ul";
  if (NUMBER_RE.test(trimmed)) return "ol";
  return null;
}

export function parseTaskDescription(raw: string | null | undefined): DescriptionBlock[] {
  const text = raw?.replace(/\r\n/g, "\n") ?? "";
  if (!text.trim()) return [];

  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    while (paragraph.length && paragraph[paragraph.length - 1] === "") paragraph.pop();
    while (paragraph.length && paragraph[0] === "") paragraph.shift();
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const bullet = trimmed.match(BULLET_RE);
    const numbered = trimmed.match(NUMBER_RE);

    if (bullet) {
      flushParagraph();
      if (list?.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    if (numbered) {
      flushParagraph();
      if (list?.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[2]);
      continue;
    }

    flushList();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    paragraph.push(line.trimEnd());
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function descriptionPreview(raw: string | null | undefined) {
  return parseTaskDescription(raw)
    .flatMap((block) => (block.type === "paragraph" ? [block.text] : block.items))
    .join(" · ");
}

function expandToLineBounds(value: string, start: number, end: number) {
  const from = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  const newline = value.indexOf("\n", end);
  const to = newline === -1 ? value.length : newline;
  return { from, to };
}

export function toggleListOnRange(
  value: string,
  start: number,
  end: number,
  kind: "ul" | "ol",
) {
  const { from, to } = expandToLineBounds(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const typed = lines.filter((line) => line.trim());
  if (typed.length === 0) {
    const prefix = kind === "ul" ? "- " : "1. ";
    return {
      value: `${value.slice(0, from)}${prefix}${value.slice(to)}`,
      caret: from + prefix.length,
    };
  }
  const remove = typed.length > 0 && typed.every((line) => lineListKind(line) === kind);

  let index = 1;
  const next = lines.map((line) => {
    if (!line.trim()) return line;
    const body = stripListPrefix(line);
    if (remove) return body;
    if (kind === "ul") return `- ${body}`;
    const numbered = `${index}. ${body}`;
    index += 1;
    return numbered;
  });

  const inserted = next.join("\n");
  return {
    value: `${value.slice(0, from)}${inserted}${value.slice(to)}`,
    start: from,
    end: from + inserted.length,
  };
}

export function continueListEnter(value: string, caret: number) {
  const lineStart = caret === 0 ? 0 : value.lastIndexOf("\n", caret - 1) + 1;
  const newline = value.indexOf("\n", caret);
  const lineEnd = newline === -1 ? value.length : newline;
  const line = value.slice(lineStart, lineEnd);
  const leading = line.match(/^\s*/)?.[0] ?? "";
  const rest = line.slice(leading.length);
  const bullet = rest.match(BULLET_RE);
  const numbered = rest.match(NUMBER_RE);
  if (!bullet && !numbered) return null;

  const itemText = bullet ? bullet[1] : numbered![2];
  if (!itemText.trim()) {
    return {
      value: `${value.slice(0, lineStart)}${leading}${value.slice(lineEnd)}`,
      caret: lineStart + leading.length,
    };
  }

  const nextPrefix = bullet ? `${leading}- ` : `${leading}${Number(numbered![1]) + 1}. `;
  return {
    value: `${value.slice(0, caret)}\n${nextPrefix}${value.slice(caret)}`,
    caret: caret + 1 + nextPrefix.length,
  };
}
