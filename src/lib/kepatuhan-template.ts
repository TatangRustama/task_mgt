import fs from "fs";
import path from "path";

export const DEFAULT_KEPATUHAN_TEMPLATE = [
  "Yth. Bapak/Ibu {{atasan}},",
  "Mohon tindak lanjut untuk pegawai berikut yang belum memiliki input kinerja valid pada periode {{periode}}:",
  "",
  "{{daftar_pegawai}}",
  "",
  "Terima kasih.",
].join("\n");

function getTemplateFilePath(): string {
  const primary = path.join(process.cwd(), "data", "kepatuhan-template.json");
  try {
    const dir = path.dirname(primary);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return primary;
  } catch {
    const fallbackDir = path.join("/tmp", "task_mgt_data");
    if (!fs.existsSync(fallbackDir)) {
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
      } catch {}
    }
    return path.join(fallbackDir, "kepatuhan-template.json");
  }
}

export function getStoredKepatuhanTemplate(): string {
  try {
    const filePath = getTemplateFilePath();
    if (!fs.existsSync(filePath)) {
      return DEFAULT_KEPATUHAN_TEMPLATE;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content) as { template?: string };
    if (typeof parsed.template === "string" && parsed.template.trim()) {
      return parsed.template;
    }
    return DEFAULT_KEPATUHAN_TEMPLATE;
  } catch {
    return DEFAULT_KEPATUHAN_TEMPLATE;
  }
}

export function saveKepatuhanTemplate(template: string): string {
  const trimmed = template.trim() || DEFAULT_KEPATUHAN_TEMPLATE;
  const filePath = getTemplateFilePath();
  fs.writeFileSync(
    filePath,
    JSON.stringify({ template: trimmed, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8",
  );
  return trimmed;
}
