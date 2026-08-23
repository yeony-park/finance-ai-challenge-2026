"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCatalogSearchParams, type CatalogSearchIntent } from "@/lib/art/catalog-query";

type Props = {
  defaultValue?: string;
  compact?: boolean;
  preservedParams?: Record<string, string | undefined>;
  targetPath?: "/art" | "/products";
};

export function NaturalLanguageSearch({
  defaultValue = "",
  compact = false,
  preservedParams = {},
  targetPath = "/products",
}: Props) {
  const [q, setQ] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await response.json() as { error?: string; parsed?: CatalogSearchIntent };
      if (!response.ok || !body.parsed) throw new Error(body.error || "검색 해석 실패");
      const params = buildCatalogSearchParams(query, preservedParams, body.parsed);
      router.push(`${targetPath}?${params}`);
    } catch {
      setError("검색 조건을 해석하지 못해 일반 키워드 검색으로 전환했습니다.");
      const params = buildCatalogSearchParams(query, preservedParams, { keyword: query });
      router.push(`${targetPath}?${params}`);
    } finally {
      setLoading(false);
    }
  }

  return <div>
    <form className={`nl-search ${compact ? "compact" : ""}`} role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor={compact ? "catalog-search" : "home-ai-search"}>상품 통합 검색</label>
      {compact
        ? <input type="search" id="catalog-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="예: 김환기, 청약 예정 작품, 공모가 부담이 낮은 상품" />
        : <textarea id="home-ai-search" value={q} onChange={(event) => setQ(event.target.value)} rows={2} placeholder={"어떤 상품을 찾고 있나요?\n예: 최근 거래가 꾸준하고 공모가 부담이 낮은 청약 중 상품"} />}
      <button type="submit" className="button button-primary" disabled={loading}>{loading ? "검색 조건 확인 중…" : "검색"}</button>
    </form>
    {error ? <p className="form-error" role="status">{error}</p> : null}
  </div>;
}

export const exampleQueries = ["최근 거래가 꾸준한 작가의 청약 중 상품", "공모가가 유사 작품보다 비싼 상품", "청산이 자주 지연된 플랫폼 상품", "취득가와 공모가 차이가 작은 상품", "최근 3년 낙찰률이 높은 작가", "회수 위험이 큰 청약 예정 상품"];
