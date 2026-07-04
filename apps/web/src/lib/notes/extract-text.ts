type BlockNoteInlineText = { type: "text"; text: string };
type BlockNoteInlineLink = { type: "link"; content: BlockNoteInlineText[] };
type BlockNoteInlineUnknown = { type?: string; text?: string; content?: unknown[] };

type BlockNoteInline = BlockNoteInlineText | BlockNoteInlineUnknown;

type BlockNoteBlock = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInline[] | BlockNoteInlineLink["content"];
  children?: BlockNoteBlock[];
};

function isInlineText(value: unknown): value is BlockNoteInlineText {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "text"
  );
}

function extractFromInline(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  if (isInlineText(value)) {
    return value.text;
  }
  const maybeContent = (value as { content?: unknown }).content;
  if (Array.isArray(maybeContent)) {
    return maybeContent.map(extractFromInline).join("");
  }
  return "";
}

export function extractPlainTextFromBlockNote(doc: unknown): string {
  if (!Array.isArray(doc)) return "";
  const parts: string[] = [];

  const visit = (block: BlockNoteBlock) => {
    if (Array.isArray(block.content)) {
      const text = block.content.map(extractFromInline).join("");
      if (text) parts.push(text);
    }
    if (Array.isArray(block.children)) {
      for (const child of block.children) visit(child);
    }
  };

  for (const block of doc as BlockNoteBlock[]) visit(block);

  return parts.join("\n").trim();
}
