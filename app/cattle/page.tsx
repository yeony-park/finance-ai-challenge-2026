import type { Metadata } from "next";
import { CategoryStatus } from "@/components/site/CategoryStatus";
export const metadata: Metadata = { title: "한우", description: "한우 카테고리 확인 현황 준비 중" };
export default function Page() { return <CategoryStatus title="한우" image="/category-cattle.jpg" />; }
