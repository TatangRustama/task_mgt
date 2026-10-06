import { dailyReportFilename, monthlyReportFilename } from "@/lib/report-filename";

const PDF_MARGIN_X_MM = 14;
const PDF_MARGIN_Y_MM = 12;

export function printPdfFilename(options: {
  view: "harian" | "bulanan";
  authorName: string;
  date?: string;
  month?: number;
  year?: number;
}) {
  if (options.view === "bulanan") {
    return monthlyReportFilename(
      options.authorName,
      options.month || 1,
      options.year || new Date().getFullYear(),
      "pdf",
    );
  }
  return dailyReportFilename(options.authorName, options.date || "", "pdf");
}

function waitForImages(root: HTMLElement) {
  const images = [...root.querySelectorAll("img")];
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

function applyPrintCloneStyles(el: HTMLElement) {
  el.classList.remove("print-pdf-capturing");
  el.removeAttribute("aria-hidden");
  el.style.setProperty("position", "static", "important");
  el.style.setProperty("left", "auto", "important");
  el.style.setProperty("top", "auto", "important");
  el.style.setProperty("width", "210mm", "important");
  el.style.setProperty("background", "#ffffff", "important");
  el.style.setProperty("color", "#111111", "important");
  el.style.setProperty("pointer-events", "none");
}

const KEEP_TOGETHER_SELECTOR = [
  ".print-kop",
  ".print-title",
  ".print-subtitle",
  ".print-section-label",
  ".print-id",
  ".print-sign",
  ".print-wfh-sign",
  ".print-printed-on",
  ".print-bukti-open",
  ".print-bukti-title",
  ".print-empty",
  "tr",
  ".print-desc-p",
  ".print-desc-item",
  ".print-uraian-title",
  ".print-uraian-extra",
  ".print-place-line",
  ".print-hasil-paraf > div",
  ".print-daily-keterangan-value",
].join(",");

type CanvasBox = { top: number; bottom: number };

function canvasScale(root: HTMLElement, canvas: HTMLCanvasElement) {
  const rootRect = root.getBoundingClientRect();
  return canvas.height / Math.max(root.scrollHeight, rootRect.height, 1);
}

function toCanvasBox(
  rect: { top: number; bottom: number },
  rootTop: number,
  scale: number,
): CanvasBox {
  return {
    top: Math.max(0, (rect.top - rootTop) * scale),
    bottom: Math.max(0, (rect.bottom - rootTop) * scale),
  };
}

function collectPageBreakLayout(root: HTMLElement, canvas: HTMLCanvasElement) {
  const scale = canvasScale(root, canvas);
  const rootTop = root.getBoundingClientRect().top;
  const blocks = [...root.querySelectorAll<HTMLElement>(KEEP_TOGETHER_SELECTOR)]
    .map((el) => toCanvasBox(el.getBoundingClientRect(), rootTop, scale))
    .filter((box) => box.bottom - box.top > 1);

  const lines: CanvasBox[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        lines.push(toCanvasBox(rect, rootTop, scale));
      }
    }
    node = walker.nextNode();
  }

  return { blocks, lines, scale };
}

function cutsThroughText(y: number, lines: CanvasBox[]) {
  return lines.some((line) => line.top < y - 0.75 && line.bottom > y + 0.75);
}

function withInkPad(y: number, lines: CanvasBox[], idealEnd: number, scale: number) {
  const pad = Math.max(1, scale * 0.75);
  const nextTop = lines
    .map((line) => line.top)
    .filter((top) => top >= y - 0.5)
    .sort((a, b) => a - b)[0];
  const limit = nextTop == null ? y + pad : nextTop;
  return Math.min(idealEnd, Math.max(y, Math.min(y + pad, limit)));
}

export function chooseSliceHeight(
  sourceY: number,
  pageHeightPx: number,
  canvasHeight: number,
  blocks: CanvasBox[],
  lines: CanvasBox[],
  scale = 2,
) {
  const remaining = canvasHeight - sourceY;
  if (remaining <= pageHeightPx) return remaining;

  const idealEnd = sourceY + pageHeightPx;
  const minSlice = Math.min(pageHeightPx * 0.2, Math.max(24, scale * 16));

  const movable = blocks
    .filter((block) => {
      const height = block.bottom - block.top;
      return (
        height > 1 &&
        height <= pageHeightPx &&
        block.top < idealEnd - 1 &&
        block.bottom > idealEnd + 1 &&
        block.top >= sourceY + minSlice
      );
    })
    .sort((a, b) => b.bottom - b.top - (a.bottom - a.top));

  for (const block of movable) {
    if (!cutsThroughText(block.top, lines)) return block.top - sourceY;
  }

  const lineCandidates = lines
    .flatMap((line) => [line.top, line.bottom])
    .filter((y) => y > sourceY + minSlice && y <= idealEnd)
    .sort((a, b) => b - a);

  for (const y of lineCandidates) {
    const end = withInkPad(y, lines, idealEnd, scale);
    if (end <= sourceY + minSlice) continue;
    if (!cutsThroughText(end, lines)) return end - sourceY;
  }

  const blockEnds = blocks
    .map((block) => block.bottom)
    .filter((bottom) => bottom > sourceY + minSlice && bottom <= idealEnd)
    .sort((a, b) => b - a);

  for (const bottom of blockEnds) {
    if (!cutsThroughText(bottom, lines)) return bottom - sourceY;
  }

  return pageHeightPx;
}

function addCanvasPages(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
  startOnNewPage = false,
  root?: HTMLElement | null,
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - PDF_MARGIN_X_MM * 2;
  const usableHeight = pageHeight - PDF_MARGIN_Y_MM * 2;
  if (usableWidth <= 0 || usableHeight <= 0 || !canvas.width || !canvas.height) return;

  const pxPerMm = canvas.width / usableWidth;
  const pageHeightPx = Math.max(1, Math.floor(usableHeight * pxPerMm));
  const layout = root ? collectPageBreakLayout(root, canvas) : { blocks: [], lines: [], scale: 2 };
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height - 0.5) {
    const rawHeight = chooseSliceHeight(
      sourceY,
      pageHeightPx,
      canvas.height,
      layout.blocks,
      layout.lines,
      layout.scale,
    );
    const end = Math.min(canvas.height, Math.max(sourceY + 1, Math.round(sourceY + rawHeight)));
    const sliceHeight = end - sourceY;
    if (sliceHeight <= 0) break;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.ceil(sliceHeight);
    const ctx = slice.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (startOnNewPage || pageIndex > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      PDF_MARGIN_X_MM,
      PDF_MARGIN_Y_MM,
      usableWidth,
      sliceHeight / pxPerMm,
    );

    sourceY = end;
    pageIndex += 1;
  }
}

async function captureSection(
  html2canvas: (typeof import("html2canvas"))["default"],
  element: HTMLElement,
) {
  await waitForImages(element);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 15000,
    scrollX: 0,
    scrollY: 0,
    windowWidth: Math.max(element.scrollWidth, element.offsetWidth, 794),
    windowHeight: Math.max(element.scrollHeight, element.offsetHeight, 1),
    onclone(_doc, clonedEl) {
      const cloned = clonedEl ?? _doc.querySelector<HTMLElement>(".print-root");
      if (!cloned) return;
      applyPrintCloneStyles(cloned);
    },
  });
}

export async function downloadPrintPdf(filename: string) {
  const source = document.querySelector<HTMLElement>(".print-wfh.print-root")
    ?? document.querySelector<HTMLElement>(".print-root");
  if (!source) return;

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const host = document.createElement("div");
  host.className = "pdf-export-host";
  const clone = source.cloneNode(true) as HTMLElement;
  applyPrintCloneStyles(clone);
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const lampiran = clone.querySelector<HTMLElement>(".print-lampiran");
    let lampiranRoot: HTMLElement | null = null;
    if (lampiran) {
      lampiranRoot = document.createElement("div");
      lampiranRoot.className = clone.className;
      applyPrintCloneStyles(lampiranRoot);
      lampiranRoot.appendChild(lampiran);
      host.appendChild(lampiranRoot);
    }

    const mainCanvas = await captureSection(html2canvas, clone);
    const lampiranCanvas =
      lampiranRoot && lampiranRoot.scrollHeight > 0
        ? await captureSection(html2canvas, lampiranRoot)
        : null;

    if (!mainCanvas.width || !mainCanvas.height) return;

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    addCanvasPages(pdf, mainCanvas, false, clone);
    if (lampiranCanvas && lampiranCanvas.width && lampiranCanvas.height) {
      addCanvasPages(pdf, lampiranCanvas, true, lampiranRoot);
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
