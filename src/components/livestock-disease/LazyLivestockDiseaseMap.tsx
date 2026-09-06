"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { LivestockDiseaseMapSpecies } from "@/lib/content/livestock-disease-map";

import { DiseaseMapLoading } from "./DiseaseMapFrame";
import s from "./livestock-disease.module.css";

const DynamicLivestockDiseaseMap = dynamic(
  () =>
    import("./LivestockDiseaseMap").then(
      (module) => module.LivestockDiseaseMap,
    ),
  {
    ssr: false,
    loading: DiseaseMapLoading,
  },
);

export function LazyLivestockDiseaseMap({
  species,
  focusProvinces,
  viewportProvinces,
  throughDate,
  currentYear,
  ariaLabel,
  kakaoAppKey,
}: {
  readonly species: LivestockDiseaseMapSpecies;
  readonly focusProvinces: readonly string[];
  readonly viewportProvinces?: readonly string[];
  readonly throughDate?: string;
  readonly currentYear: string;
  readonly ariaLabel: string;
  readonly kakaoAppKey: string;
}) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(boundary);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boundaryRef} className={s.lazyBoundary}>
      {shouldLoad ? (
        <DynamicLivestockDiseaseMap
          species={species}
          focusProvinces={focusProvinces}
          viewportProvinces={viewportProvinces}
          throughDate={throughDate}
          currentYear={currentYear}
          ariaLabel={ariaLabel}
          kakaoAppKey={kakaoAppKey}
        />
      ) : (
        <DiseaseMapLoading />
      )}
    </div>
  );
}
