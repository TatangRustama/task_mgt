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

function collectAvoidRanges(root: HTMLElement, canvas: HTMLCanvasElement) {
  const rootRect = root.getBoundingClientRect();
  const scale = canvas.height / Math.max(root.scrollHeight, rootRect.height, 1);
  return [...root.querySelectorAll<HTMLElement>(".print-sign, .print-wfh-sign")].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: Math.max(0, (rect.top - rootRect.top) * scale),
      bottom: Math.max(0, (rect.bottom - rootRect.top) * scale),
    };
  });
}

function sliceHeightForPage(
  sourceY: number,
  pageHeightPx: number,
  canvasHeight: number,
  avoidRanges: Array<{ top: number; bottom: number }>,
) {
  const remaining = canvasHeight - sourceY;
  if (remaining <= pageHeightPx) return remaining;

  const idealEnd = sourceY + pageHeightPx;
  for (const range of avoidRanges) {
    if (range.bottom - range.top <= 0) continue;
    if (range.top < idealEnd && range.bottom > idealEnd) {
      if (range.top > sourceY + 24) return range.top - sourceY;
      return Math.min(remaining, range.bottom - sourceY);
    }
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
  const avoidRanges = root ? collectAvoidRanges(root, canvas) : [];
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height - 0.5) {
    const sliceHeight = sliceHeightForPage(sourceY, pageHeightPx, canvas.height, avoidRanges);
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

    sourceY += sliceHeight;
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
      addCanvasPages(pdf, lampiranCanvas, true);
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
