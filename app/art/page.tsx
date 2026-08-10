import type { Metadata } from "next";
import { AssetPage } from "@/components/asset-page";
import { ArtIcon } from "@/components/icons";

export const metadata: Metadata = { title: "미술품 STO 검증" };

export default function ArtPage() {
  return (
    <AssetPage
      icon={<ArtIcon />}
      eyebrow="미술품"
      owner="현석"
      title="미술품 STO 검증"
      description="여기에 미술품 STO 페이지의 핵심 설명을 넣어주세요."
      metrics={[
        { label: "주요 지표 1", value: "입력 대기", detail: "여기에 첫 번째 지표 내용을 넣어주세요." },
        { label: "주요 지표 2", value: "입력 대기", detail: "여기에 두 번째 지표 내용을 넣어주세요." },
        { label: "주요 지표 3", value: "입력 대기", detail: "여기에 세 번째 지표 내용을 넣어주세요." },
      ]}
      evidence={[
        { label: "여기에 첫 번째 검증 항목 제목을 넣어주세요.", source: "출처 입력 대기", description: "여기에 첫 번째 검증 항목 설명을 넣어주세요.", status: "missing" },
        { label: "여기에 두 번째 검증 항목 제목을 넣어주세요.", source: "출처 입력 대기", description: "여기에 두 번째 검증 항목 설명을 넣어주세요.", status: "missing" },
        { label: "여기에 세 번째 검증 항목 제목을 넣어주세요.", source: "출처 입력 대기", description: "여기에 세 번째 검증 항목 설명을 넣어주세요.", status: "missing" },
        { label: "여기에 네 번째 검증 항목 제목을 넣어주세요.", source: "출처 입력 대기", description: "여기에 네 번째 검증 항목 설명을 넣어주세요.", status: "missing" },
      ]}
      workflow={[
        { step: "01", title: "여기에 1단계 제목을 넣어주세요.", description: "여기에 1단계 설명을 넣어주세요." },
        { step: "02", title: "여기에 2단계 제목을 넣어주세요.", description: "여기에 2단계 설명을 넣어주세요." },
        { step: "03", title: "여기에 3단계 제목을 넣어주세요.", description: "여기에 3단계 설명을 넣어주세요." },
        { step: "04", title: "여기에 4단계 제목을 넣어주세요.", description: "여기에 4단계 설명을 넣어주세요." },
      ]}
    />
  );
}
