import type { Metadata } from "next";
import { CategoryStatus } from "@/components/site/CategoryStatus";
export const metadata: Metadata = { title: "부동산", description: "부동산 카테고리 확인 현황 준비 중" };
export default function Page() { return <CategoryStatus title="부동산" image="/category-real-estate.jpg" />; }
