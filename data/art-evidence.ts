export type ArtEvidenceStatus = "verified" | "mismatch" | "review" | "missing" | "stale";

export type ArtSource = {
  label: string;
  asOf: string;
  url: string;
};

export type ArtProductSnapshot = {
  id: string;
  name: string;
  artist: string;
  artworkTitle: string;
  artworkDetail: string;
  imageUrl?: string;
  imageSourceUrl?: string;
  issuer: string;
  asOf: string;
  lifecycle: string;
  offeringAmount: number;
  status: ArtEvidenceStatus;
  statusLabel: string;
  priceChain: string;
  finding: string;
  limitation: string;
  sources: ArtSource[];
};

export const artSnapshotLineage = {
  branch: "origin/hyunsuk",
  commit: "585b371",
  normalizedAt: "2026-08-15",
};

export const artProductSnapshots: ArtProductSnapshot[] = [
  {
    id: "at-kim-whanki-009-01",
    name: "9-1 김환기 Untitled",
    artist: "김환기",
    artworkTitle: "Untitled",
    artworkDetail: "1967 · oil on canvas · 127 × 101 cm",
    imageUrl: "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/190/202605141145053bd8f766-cc15-4e47-8b6c-10c56fe4abcc.jpg",
    imageSourceUrl: "https://weshareart.com/goods/subscription/detail/178",
    issuer: "투게더아트",
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    offeringAmount: 685000000,
    status: "review",
    statusLabel: "작품 식별 대조 필요",
    priceChain: "보고 낙찰가 5.5억원 → 취득가 6억원 → 공모가 6.85억원",
    finding: "공개 낙찰가·취득가·공모가의 순서는 연결했으며 공모가는 보고 낙찰가보다 20% 이상 높습니다.",
    limitation: "작품명이 일반명이고 lot 번호와 provenance가 없어 동일 작품이라는 연결을 확정할 수 없습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2026-05-13",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002",
      },
      {
        label: "투게더아트 상품 원문",
        asOf: "2026-08-15",
        url: "https://weshareart.com/goods/subscription/detail/178",
      },
      {
        label: "KYS 2025 원문",
        asOf: "2025-12-29",
        url: "https://artprice.kr/data_archive/20260312_132032_cf7c4a16.pdf#page=6",
      },
    ],
  },
  {
    id: "at-chonghyun-009-02",
    name: "9-2 하종현 Conjunction 20-65",
    artist: "하종현",
    artworkTitle: "Conjunction 20-65",
    artworkDetail: "2020 · oil on hemp cloth · 116.8 × 91 cm",
    imageUrl: "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/191/202604031648559c9f0135-c61f-49c6-9ec3-bb28dc2d7d05.jpg",
    imageSourceUrl: "https://weshareart.com/goods/subscription/detail/179",
    issuer: "투게더아트",
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    offeringAmount: 225000000,
    status: "verified",
    statusLabel: "공모가격 구성 확인",
    priceChain: "취득가 203,760,000원 + 발행비용 21,240,000원 = 공모가 225,000,000원",
    finding: "공시된 취득가와 발행비용의 합계가 총 공모금액과 일치합니다.",
    limitation: "가격 구성의 산술 일치는 작품 가치의 적정성이나 처분 가능성을 뜻하지 않습니다.",
    sources: [
      {
        label: "DART 정정신고서",
        asOf: "2026-05-12",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391",
      },
      {
        label: "DART 발행실적보고서",
        asOf: "2026-05-29",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260529000528",
      },
      {
        label: "투게더아트 상품 원문",
        asOf: "2026-08-15",
        url: "https://weshareart.com/goods/subscription/detail/179",
      },
    ],
  },
  {
    id: "at-youngkuk-008",
    name: "AT-YOUNGKUK-008 유영국 Work",
    artist: "유영국",
    artworkTitle: "Work",
    artworkDetail: "1984 · oil · 97 × 130.5 cm",
    issuer: "투게더아트",
    asOf: "2025-12-31",
    lifecycle: "현재 상태 재확인 필요",
    offeringAmount: 660000000,
    status: "stale",
    statusLabel: "기준일 갱신 필요",
    priceChain: "공모가 660,000,000원 · 취득가 미확인",
    finding: "공모금액과 청약 배정 정보는 저장본에서 확인되지만 취득가는 연결되지 않았습니다.",
    limitation: "비교 대상으로 제시된 7억원 낙찰 사례는 다른 작품이며, 저장된 DART 접수번호도 원문 재확인이 필요합니다.",
    sources: [
      {
        label: "2025-12-31 정기공시 저장본",
        asOf: "2025-12-31",
        url: "https://dzb2k3770zezk.cloudfront.net/file/data/board/disclosure/20260401/202604011737122e7aabd8-718f-44cb-967e-9801efd9f3e1.pdf",
      },
    ],
  },
  {
    id: "at-kusama-001",
    name: "AT-KUSAMA-001 Yayoi Kusama Pumpkin",
    artist: "Yayoi Kusama",
    artworkTitle: "Pumpkin",
    artworkDetail: "2002 · acrylic on canvas · 22 × 27.3 cm",
    imageUrl: "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/182/20231129120144c682624f-6317-482a-9f57-b32c6867cb82.jpg",
    imageSourceUrl: "https://weshareart.com/goods/subscription/detail/169",
    issuer: "투게더아트",
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    offeringAmount: 1182000000,
    status: "missing",
    statusLabel: "현재 보유 상태 미확인",
    priceChain: "취득가 1,094,030,255원 + 비용 87,969,745원 = 공모가 1,182,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation: "플랫폼의 STORED 상태는 현재 소유권·보관 상태·미처분을 독립적으로 증명하지 않습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2024-01-16",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
      },
      {
        label: "투게더아트 상품 저장본",
        asOf: "2026-08-08",
        url: "https://weshareart.com/goods/subscription/detail/169",
      },
    ],
  },
  {
    id: "at-condo-002",
    name: "AT-CONDO-002 George Condo The Horizon of Insanity",
    artist: "George Condo",
    artworkTitle: "The Horizon of Insanity",
    artworkDetail: "2001 · oil on canvas · 152.4 × 121.9 cm",
    imageUrl: "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/183/20240227153040f4183850-cfda-46f0-b3c9-0d13e999a579.png",
    imageSourceUrl: "https://weshareart.com/goods/subscription/detail/170",
    issuer: "투게더아트",
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    offeringAmount: 1028000000,
    status: "missing",
    statusLabel: "현재 보유 상태 미확인",
    priceChain: "취득가 934,951,942원 + 비용 93,048,058원 = 공모가 1,028,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation: "독립 비교거래가 부족하고 플랫폼 상태만으로 현재 소유·보관·미처분을 확인할 수 없습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2024-03-25",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240325000139",
      },
      {
        label: "투게더아트 상품 저장본",
        asOf: "2026-08-08",
        url: "https://weshareart.com/goods/subscription/detail/170",
      },
    ],
  },
];

export const artPlatformSnapshots = [
  {
    platform: "아트앤가이드",
    count: 187,
    asOf: "2026-08-10 21:22 KST",
    limitation: "작품 식별과 법적 발행사 매핑이 확인되지 않은 플랫폼 공개 이력 저장본",
  },
  {
    platform: "아트투게더",
    count: 145,
    asOf: "2026-08-10 21:46 KST",
    limitation: "플랫폼 자체 게시값이며 독립 검증을 완료하지 않은 지난 공동구매 저장본",
  },
  {
    platform: "TESSA",
    count: 6,
    asOf: "2026-08-10 21:53 KST",
    limitation: "플랫폼 자체 정산 공시이며 법적 발행사 연결을 별도로 확인해야 하는 저장본",
  },
];
