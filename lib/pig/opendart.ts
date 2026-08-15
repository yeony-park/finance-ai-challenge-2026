import "server-only";

export type DartFiling = {
  rceptNo: string;
  reportName: string;
  filedAt: string;
  submitter: string;
};

export type DatagenDartSnapshot = {
  method: "api" | "saved_snapshot";
  totalCount: number;
  reviewCount: number;
  filings: DartFiling[];
  fetchedAt: string;
  asOf: string;
  status: "connected" | "fallback";
  limitation: string;
};

type OpenDartListItem = {
  rcept_no: string;
  report_nm: string;
  rcept_dt: string;
  flr_nm: string;
};

type OpenDartListResponse = {
  status?: string;
  message?: string;
  total_count?: number;
  list?: OpenDartListItem[];
};

const DATAGEN_CORP_CODE = "01936340";
const SNAPSHOT_AS_OF = "2026-08-15";
const FALLBACK_FILINGS: DartFiling[] = [
  {
    rceptNo: "20260814001492",
    reportName: "호가중개시스템을통한소액매출공시서류",
    filedAt: "2026-08-14",
    submitter: "데이터젠",
  },
  {
    rceptNo: "20260714000008",
    reportName: "증권발행실적보고서",
    filedAt: "2026-07-14",
    submitter: "데이터젠",
  },
  {
    rceptNo: "20260626000400",
    reportName: "투자설명서",
    filedAt: "2026-06-26",
    submitter: "데이터젠",
  },
  {
    rceptNo: "20260624000508",
    reportName: "[기재정정]증권신고서(투자계약증권)",
    filedAt: "2026-06-24",
    submitter: "데이터젠",
  },
  {
    rceptNo: "20260605000175",
    reportName: "증권신고서(투자계약증권)",
    filedAt: "2026-06-05",
    submitter: "데이터젠",
  },
];

function formatDate(rawDate: string) {
  return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
}

function formatKstDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatKstTimestamp(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function fallbackSnapshot(limitation: string): DatagenDartSnapshot {
  return {
    method: "saved_snapshot",
    totalCount: 17,
    reviewCount: 16,
    filings: FALLBACK_FILINGS,
    fetchedAt: `${SNAPSHOT_AS_OF} 저장본`,
    asOf: SNAPSHOT_AS_OF,
    status: "fallback",
    limitation,
  };
}

function isReviewFiling(item: OpenDartListItem) {
  return [
    "투자계약증권",
    "투자설명서",
    "증권발행실적보고서",
    "소액매출공시서류",
  ].some((keyword) => item.report_nm.includes(keyword));
}

export async function getDatagenDartSnapshot(): Promise<DatagenDartSnapshot> {
  const apiKey = process.env.OPENDART_API_KEY;

  if (!apiKey) {
    return fallbackSnapshot("OpenDART 키가 없어 2026-08-15 저장본을 표시합니다.");
  }

  const now = new Date();
  const params = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: DATAGEN_CORP_CODE,
    bgn_de: "20250101",
    end_de: formatKstDate(now).replaceAll("-", ""),
    last_reprt_at: "N",
    page_no: "1",
    page_count: "100",
  });

  try {
    const response = await fetch(`https://opendart.fss.or.kr/api/list.json?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return fallbackSnapshot(`OpenDART가 HTTP ${response.status}를 반환해 저장본을 표시합니다.`);
    }

    const payload = (await response.json()) as OpenDartListResponse;
    if (payload.status !== "000" || !payload.list) {
      return fallbackSnapshot("OpenDART 응답을 확인할 수 없어 저장본을 표시합니다.");
    }

    const filings = payload.list.filter(isReviewFiling).map((item) => ({
      rceptNo: item.rcept_no,
      reportName: item.report_nm,
      filedAt: formatDate(item.rcept_dt),
      submitter: item.flr_nm,
    }));

    return {
      method: "api",
      totalCount: payload.total_count ?? payload.list.length,
      reviewCount: filings.length,
      filings,
      fetchedAt: formatKstTimestamp(now),
      asOf: formatKstDate(now),
      status: "connected",
      limitation: "DART는 발행사의 공시 제출 사실과 기재 내용을 보여주며 실제 농장·돼지·정산을 독립 검증하지 않습니다.",
    };
  } catch {
    return fallbackSnapshot("OpenDART 연결이 지연되어 2026-08-15 저장본을 표시합니다.");
  }
}
