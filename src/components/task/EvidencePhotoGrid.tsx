"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/task/PhotoLightbox";

export function EvidencePhotoGrid({
  urls,
  alt = "Bukti",
}: {
  urls: string[];
  alt?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  if (urls.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {urls.map((url, photoIndex) => (
          <button
            key={url}
            type="button"
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-lg"
            aria-label={`Perbesar ${alt}`}
            onClick={() => setIndex(photoIndex)}
          >
            <Image src={url} alt={alt} fill className="object-cover" sizes="(max-width: 640px) 50vw, 240px" />
          </button>
        ))}
      </div>
      <PhotoLightbox urls={urls} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} alt={alt} />
    </>
  );
}
