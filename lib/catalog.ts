/** Synthetic-only compatibility helpers for retired catalog imports. */
import syntheticData from "@/data/synthetic/art-investment.json";
import type { ArtDataset } from "@/lib/art/types";

export type CatalogProduct = { id: string; category: string; name: string; issuer: string; status: string; as_of: string; source_state: "synthetic"; offering?: { amount?: number | null; units?: number | null; unit_price?: number | null } };
export type PlatformRecordDate = { label: string; value: string };
export type PlatformRecordMoney = { label: string; amount: number; currency: string | null };
export type PlatformTrackRecord = { id: string; sourceKey: "synthetic"; platform: string; sourceLabel: string; title: string; artist: string | null; status: string | null; category: string | null; dates: PlatformRecordDate[]; money: PlatformRecordMoney[]; locationOrMethod: string | null };
export type PlatformRecordSource = { key: "synthetic"; platform: string; label: string; asOf: string | null; count: number };
const dataset = syntheticData as ArtDataset;
export const catalogAsOf = dataset.offerings.map((item) => item.asOfDate).sort().at(-1) ?? "2026-01-01";
export const products: CatalogProduct[] = dataset.offerings.map((offering) => ({ id: offering.id, category: "합성 미술품", name: offering.title, issuer: "가상 발행 주체", status: offering.status, as_of: offering.asOfDate, source_state: "synthetic", offering: { amount: offering.totalOfferingAmount, units: offering.numberOfUnits, unit_price: offering.unitPrice } }));
export const platformRecords: PlatformTrackRecord[] = dataset.trackRecords.map((record) => ({ id: record.id, sourceKey: "synthetic", platform: dataset.platforms.find((platform) => platform.id === record.platformId)?.name ?? "가상 플랫폼", sourceLabel: "합성 시뮬레이션", title: record.artworkTitle, artist: record.artistName, status: record.status, category: null, dates: [record.subscriptionStart, record.subscriptionEnd, record.liquidatedAt].filter((value): value is string => Boolean(value)).map((value) => ({ label: "시뮬레이션 날짜", value })), money: record.offeringAmount == null ? [] : [{ label: "시뮬레이션 금액", amount: record.offeringAmount, currency: record.currency ?? null }], locationOrMethod: record.soldPlace ?? null }));
export const platformRecordSources: PlatformRecordSource[] = [{ key: "synthetic", platform: "가상 플랫폼", label: "합성 시뮬레이션", asOf: catalogAsOf, count: platformRecords.length }];
export const trackRecordsAsOf = catalogAsOf;
export function normalizeSearch(value: string) { return value.trim().toLocaleLowerCase("ko-KR"); }
export function searchProducts(query: string) { const words = normalizeSearch(query).split(/\s+/).filter(Boolean); return words.length ? products.filter((product) => words.every((word) => `${product.name} ${product.status}`.toLocaleLowerCase("ko-KR").includes(word))) : []; }
export function searchTrackRecords(query: string) { const words = normalizeSearch(query).split(/\s+/).filter(Boolean); return words.length ? platformRecords.filter((record) => words.every((word) => `${record.title} ${record.artist ?? ""} ${record.status ?? ""}`.toLocaleLowerCase("ko-KR").includes(word))) : []; }
export function formatKrw(value: number | null | undefined) { return typeof value === "number" ? `${new Intl.NumberFormat("ko-KR").format(value)}원` : "확인 불가"; }
export function formatDate(value: string | null | undefined) { return value ? value.slice(0, 10) : "확인 불가"; }
export function productReviewReason(product: CatalogProduct) { void product; return "합성 데이터로 실제 투자 판단에 사용할 수 없습니다."; }
