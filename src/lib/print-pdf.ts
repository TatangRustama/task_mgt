import { dailyReportFilename, monthlyReportFilename } from "@/lib/report-filename";

const PDF_MARGIN_X_MM = 8;
const PDF_MARGIN_Y_MM = 8;

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

// Only top-level rows and sections should define page-break boundaries.
// NEVER include sub-row child elements like paragraphs or bullet points inside cells,
// otherwise the table row will be sliced horizontally across columns!
const PAGE_BREAK_BLOCK_SELECTOR = [
  ".print-kop",
  ".print-title",
  ".print-wfh-date",
  ".print-section-label",
  ".print-table-identity",
  ".print-table-identity tr",
  "tbody.print-day-group",
  ".print-table-tasks tr",
  ".print-table-wfh tr",
  ".print-table-daily tr",
  ".print-table-bukti tr",
  ".print-table tr",
  ".print-sign-block",
  ".print-sign",
  ".print-wfh-sign",
  ".print-printed-on",
  ".print-empty",
].join(",");

type CanvasBox = { top: number; bottom: number; el?: HTMLElement };

function canvasScale(root: HTMLElement, canvas: HTMLCanvasElement) {
  const rootRect = root.getBoundingClientRect();
  return canvas.height / Math.max(root.scrollHeight, rootRect.height, 1);
}

function toCanvasBox(
  rect: { top: number; bottom: number },
  rootTop: number,
  scale: number,
  el?: HTMLElement,
): CanvasBox {
  return {
    top: Math.max(0, (rect.top - rootTop) * scale),
    bottom: Math.max(0, (rect.bottom - rootTop) * scale),
    el,
  };
}

function collectPageBreakLayout(root: HTMLElement, canvas: HTMLCanvasElement) {
  const scale = canvasScale(root, canvas);
  const rootTop = root.getBoundingClientRect().top;

  const rawElements = [...root.querySelectorAll<HTMLElement>(PAGE_BREAK_BLOCK_SELECTOR)];
  const blocks: CanvasBox[] = [];
  const seen = new Set<HTMLElement>();

  for (const el of rawElements) {
    if (seen.has(el)) continue;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    if (rect.height < 1) continue;
    blocks.push(toCanvasBox(rect, rootTop, scale, el));
  }

  // Sort blocks strictly from top to bottom
  blocks.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

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

export function chooseSliceHeight(
  sourceY: number,
  pageHeightPx: number,
  canvasHeight: number,
  blocks: CanvasBox[],
  lines: CanvasBox[],
  scale = 2,
) {
  const remaining = canvasHeight - sourceY;
  // If all remaining content fits on this page, render all of it
  if (remaining <= pageHeightPx) return remaining;

  const idealEnd = sourceY + pageHeightPx;
  const minSlice = Math.min(pageHeightPx * 0.2, Math.max(40, scale * 25));

  // 1. Find all atomic blocks (rows, sections) that start on or after sourceY and finish completely before idealEnd
  const fittingBlocks = blocks.filter(
    (b) => b.top >= sourceY - 2 && b.bottom <= idealEnd && b.bottom > sourceY + minSlice,
  );

  if (fittingBlocks.length > 0) {
    let lastFitting = fittingBlocks[fittingBlocks.length - 1];

    // Don't leave an orphaned table header row alone at the bottom of the page
    if (
      lastFitting.el &&
      lastFitting.el.tagName === "TR" &&
      lastFitting.el.closest("thead") &&
      fittingBlocks.length > 1
    ) {
      const beforeHeader = fittingBlocks.filter(
        (b) => b.bottom <= (lastFitting.top || 0) + 1 && b.bottom > sourceY + minSlice,
      );
      if (beforeHeader.length > 0) {
        lastFitting = beforeHeader[beforeHeader.length - 1];
      }
    }

    // Don't leave .print-printed-on orphaned without the signatures
    if (
      lastFitting.el &&
      lastFitting.el.classList.contains("print-printed-on") &&
      fittingBlocks.length > 1
    ) {
      const beforePrintedOn = fittingBlocks.filter(
        (b) => b.bottom <= (lastFitting.top || 0) + 1 && b.bottom > sourceY + minSlice,
      );
      if (beforePrintedOn.length > 0) {
        lastFitting = beforePrintedOn[beforePrintedOn.length - 1];
      }
    }

    // Find the next block that starts at or after lastFitting.bottom
    const nextBlock = blocks.find(
      (b) => b.top >= lastFitting.bottom - 2 && b.top > sourceY + minSlice,
    );

    // Cut cleanly between lastFitting and nextBlock
    let cutY = Math.min(idealEnd, nextBlock ? nextBlock.top : lastFitting.bottom);

    // Make sure cutY does not slice through any text line
    const overlapping = lines.find((l) => l.top < cutY && l.bottom > cutY);
    if (overlapping) {
      cutY = Math.max(sourceY + minSlice, overlapping.top - 1);
    }

    return Math.max(minSlice, cutY - sourceY);
  }

  // 2. Fallback: if a single block is taller than an entire page, cut cleanly between lines inside it
  const fittingLines = lines.filter(
    (l) => l.top >= sourceY - 2 && l.bottom <= idealEnd && l.bottom > sourceY + minSlice,
  );

  if (fittingLines.length > 0) {
    const lastLine = fittingLines[fittingLines.length - 1];
    return Math.max(minSlice, Math.min(idealEnd, lastLine.bottom + 1) - sourceY);
  }

  // 3. Ultimate fallback: back off safely to prevent slicing directly at the border
  return Math.max(minSlice, pageHeightPx - Math.round(24 * scale));
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
      for (const img of cloned.querySelectorAll("img")) {
        if (!img.complete || img.naturalWidth === 0) {
          img.style.display = "none";
        }
      }
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
