"use client";

import { useState } from "react";
import { PhotoLightbox } from "@/components/task/PhotoLightbox";
import { evidenceRows, printPhotoSrc } from "@/lib/laporan-print-view";
import type { ReportTask } from "@/lib/report-types";

export function PrintLampiranBukti({ tasks }: { tasks: ReportTask[] }) {
  const rows = evidenceRows(tasks);
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);
  if (rows.length === 0) return null;

  return (
    <section className="print-lampiran">
      <h2 className="print-subtitle">Lampiran</h2>
      <p className="print-lampiran-caption">Bukti Dokumen</p>
      <table className="print-table print-table-bukti">
        <thead>
          <tr>
            <th className="col-no">No.</th>
            <th className="col-date">Hari/Tgl</th>
            <th>Bukti Visual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.date}-${index}`}>
              <td className="center">{index + 1}</td>
              <td className="center">{row.date}</td>
              <td>
                <p className="print-bukti-title">{row.title}</p>
                <div className="print-photos print-photos-lampiran">
                  {row.photos.map((url, photoIndex) => (
                    <button
                      key={url}
                      type="button"
                      className="print-bukti-open print-bukti-img-landscape"
                      aria-label={`Perbesar bukti ${row.title}`}
                      onClick={() => setViewer({ urls: row.photos, index: photoIndex })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={printPhotoSrc(url)}
                        alt={row.title}
                        className="print-bukti-img print-bukti-img-landscape"
                      />
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PhotoLightbox
        urls={viewer?.urls ?? []}
        index={viewer?.index ?? null}
        onClose={() => setViewer(null)}
        onIndexChange={(next) => setViewer((current) => (current ? { ...current, index: next } : current))}
        alt="Bukti"
      />
    </section>
  );
}
