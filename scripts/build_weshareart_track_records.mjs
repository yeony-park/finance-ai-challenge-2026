#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "deliverables/weshareart_co_purchase_track_records_2026-08-10.md",
);
const TMP = "/tmp";

const SNAPSHOT_AT = "2026-08-10 21 : 42~21 : 46 KST";
const LIST_PAGE_URL = (page) =>
  `https://weshareart.com/goods?type=ALL&page=${page}`;
const LIST_API_URL = (page, size = 10) =>
  `https://weshareart.com/api/public/goods/co-purchase/page?page=${page}&size=${size}&coPurchaseStatusCategory=ALL`;
const DETAIL_API_URL = (goodsId) =>
  `https://weshareart.com/api/public/goods?id=${goodsId}`;
const SECTION_API_URL = (goodsId) =>
  `https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=${goodsId}`;

const LIST_FIELDS = [
  "goodsCoPurchaseId",
  "goodsId",
  "goodsName",
  "coPurchaseStatusCategory",
  "coPurchaseStatus",
  "investBeginDateTime",
  "investEndDateTime",
  "saleYieldPercent",
  "artistNameForKorean",
  "artistNameForEnglish",
  "titleForKorean",
  "titleForEnglish",
  "goodsDetail",
  "representativeGoodsImageUrl",
  "showKakaopayList",
  "opened",
  "dday",
  "dDay",
];

const DETAIL_FIELDS = [
  "artwork",
  "availableQuantity",
  "estimateMaxAmount",
  "estimateMinAmount",
  "id",
  "imageList",
  "interviewUrl",
  "investBeginDateTime",
  "investEndDateTime",
  "keepingDays",
  "name",
  "pieceAmount",
  "purchasedPercent",
  "purchasedQuantity",
  "quantity",
  "saleYieldPercent",
  "status",
  "statusCategoryCode",
  "type",
];

const ARTWORK_FIELDS = [
  "artist",
  "copyrightText",
  "edition",
  "id",
  "imageUrl",
  "material",
  "productionYear",
  "provenance",
  "setComposition",
  "signatureInfo",
  "size1",
  "size2",
  "size3",
  "size3Type",
  "title",
  "zoomable",
];

const ARTIST_FIELDS = [
  "activityHistory",
  "artistName",
  "artistNameForEnglish",
  "artistNameForKorean",
  "awardsHistory",
  "displayHistory",
  "id",
  "imageUrl",
  "information",
  "levelOfEducation",
  "nationality",
  "yearOfBirth",
  "yearOfDeath",
];

const REDACTED_ARTIST_PROFILE_FIELDS = [
  "activityHistory",
  "awardsHistory",
  "displayHistory",
  "imageUrl",
  "information",
  "levelOfEducation",
  "nationality",
  "yearOfBirth",
  "yearOfDeath",
];

function fail(message) {
  throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function html(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inline(value) {
  return html(String(value)).replaceAll("|", "&#124;");
}

function compact(value) {
  if (value === null || value === undefined) return "—";
  return String(value).replaceAll(/\s+/g, " ").trim() || "빈 문자열";
}

function jsonBlock(value) {
  return `<pre><code class="language-json">${html(JSON.stringify(value, null, 2))}</code></pre>`;
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!same(actual, wanted)) {
    fail(`${label} key mismatch: ${JSON.stringify(actual)}`);
  }
}

function blankDistribution(records, field) {
  const values = records.map((record) => record[field]);
  return {
    null: values.filter((value) => value === null).length,
    empty: values.filter((value) => value === "").length,
    whitespace: values.filter(
      (value) => typeof value === "string" && value !== "" && value.trim() === "",
    ).length,
    nonBlank: values.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        !(typeof value === "string" && value.trim() === ""),
    ).length,
  };
}

const allResponse = readJson(path.join(TMP, "weshare-goods-all.json"));
const records = allResponse.page?.content;
if (!Array.isArray(records)) fail("missing size=200 list content");
if (records.length !== 145) fail(`expected 145 records, got ${records.length}`);

const pages = [];
const combined = [];
for (let page = 1; page <= 15; page += 1) {
  const pageResponse = readJson(
    path.join(TMP, `weshare-goods-page-${String(page).padStart(2, "0")}.json`),
  ).page;
  const expectedCount = page < 15 ? 10 : 5;
  if (pageResponse.content.length !== expectedCount) {
    fail(`page ${page} expected ${expectedCount}, got ${pageResponse.content.length}`);
  }
  if (pageResponse.totalElements !== 145 || pageResponse.totalPages !== 15) {
    fail(`page ${page} pagination metadata mismatch`);
  }
  if (pageResponse.number !== page - 1) {
    fail(`page ${page} zero-based response number mismatch`);
  }
  pages.push(pageResponse.content);
  combined.push(...pageResponse.content);
}

if (!same(combined, records)) {
  fail("15 page payloads do not exactly match the size=200 response");
}

const goodsIds = records.map((record) => record.goodsId);
const goodsCoPurchaseIds = records.map((record) => record.goodsCoPurchaseId);
if (new Set(goodsIds).size !== 145 || new Set(goodsCoPurchaseIds).size !== 145) {
  fail("duplicate goodsId or goodsCoPurchaseId");
}

const details = new Map();
for (const record of records) {
  assertExactKeys(record, LIST_FIELDS, `list goodsId ${record.goodsId}`);
  const detailResponse = readJson(
    path.join(TMP, `weshare-goods-detail-${record.goodsId}.json`),
  );
  const detail = detailResponse.data;
  if (!detail) fail(`missing detail for goodsId ${record.goodsId}`);
  assertExactKeys(detail, DETAIL_FIELDS, `detail goodsId ${record.goodsId}`);
  assertExactKeys(detail.artwork, ARTWORK_FIELDS, `artwork goodsId ${record.goodsId}`);
  assertExactKeys(
    detail.artwork.artist,
    ARTIST_FIELDS,
    `artist goodsId ${record.goodsId}`,
  );
  assertExactKeys(detail.imageList, ["list"], `imageList goodsId ${record.goodsId}`);

  const checks = [
    [record.goodsName, detail.name, "goodsName/name"],
    [record.investBeginDateTime, detail.investBeginDateTime, "investBeginDateTime"],
    [record.investEndDateTime, detail.investEndDateTime, "investEndDateTime"],
    [record.saleYieldPercent, detail.saleYieldPercent, "saleYieldPercent"],
    [record.coPurchaseStatusCategory, detail.statusCategoryCode, "status category"],
    [record.coPurchaseStatus, detail.status, "status"],
    [
      record.artistNameForKorean,
      detail.artwork.artist.artistNameForKorean,
      "artist Korean name",
    ],
    [
      record.artistNameForEnglish,
      detail.artwork.artist.artistNameForEnglish,
      "artist English name",
    ],
  ];
  for (const [left, right, label] of checks) {
    if (!Object.is(left, right)) {
      fail(`${label} mismatch for goodsId ${record.goodsId}`);
    }
  }
  if (!detail.imageList.list.includes(record.representativeGoodsImageUrl)) {
    fail(`representative image mismatch for goodsId ${record.goodsId}`);
  }
  details.set(record.goodsId, detail);
}

function redactDetail(detail) {
  const artist = detail.artwork.artist;
  return {
    ...detail,
    artwork: {
      ...detail.artwork,
      artist: {
        id: artist.id,
        artistName: artist.artistName,
        artistNameForEnglish: artist.artistNameForEnglish,
        artistNameForKorean: artist.artistNameForKorean,
        _redactedFields: REDACTED_ARTIST_PROFILE_FIELDS,
      },
    },
  };
}

const statusCounts = Object.fromEntries(
  [...new Set(records.map((record) => record.coPurchaseStatusCategory))].map(
    (status) => [
      status,
      records.filter((record) => record.coPurchaseStatusCategory === status).length,
    ],
  ),
);
const positiveYield = records.filter((record) => record.saleYieldPercent > 0).length;
const zeroYield = records.filter((record) => record.saleYieldPercent === 0).length;
const negativeYield = records.filter((record) => record.saleYieldPercent < 0).length;
const yields = records.map((record) => record.saleYieldPercent);
const detailTrue = records.filter((record) => record.goodsDetail === true).length;
const detailFalse = records.filter((record) => record.goodsDetail === false).length;
const imageCount = [...details.values()].reduce(
  (total, detail) => total + detail.imageList.list.length,
  0,
);

const lines = [];
lines.push("# 아트투게더 지난 공동구매 트랙레코드 : 전체 15페이지");
lines.push("");
lines.push("## 문서 정보");
lines.push("");
lines.push(
  `- [팩트] 수집 대상 : [아트투게더 지난 공동구매](https://weshareart.com/goods?type=ALL&page=1)`,
);
lines.push(`- [팩트] 수집·검증 시점 : ${SNAPSHOT_AT}`);
lines.push(
  `- [팩트] 목록 원문 : [first-party 목록 API](${LIST_API_URL(1, 200)})`,
);
lines.push(
  "- [팩트] 공개 상세 원문 : 각 레코드의 `GET /api/public/goods?id={goodsId}` 응답",
);
lines.push(
  "- [팩트] 데이터 분류 : `service_platform_self_reported_track_record` — 아트투게더 운영사 투게더아트가 자체 서비스에 게시한 값",
);
lines.push(
  "- [범위 주의] 매각 계약서, 경매 낙찰 결과, 입금·분배 내역 등 외부 원자료로 각 거래를 독립 검증한 결과는 아닙니다",
);
lines.push(
  "- [범위 주의] 경로에 `/api/public`이 포함돼도 외부 개발자용 공개 API로 문서화됐다는 뜻으로 해석하지 않았습니다",
);
lines.push("");
lines.push("## 개인정보 제거 기준");
lines.push("");
lines.push(
  "- [팩트] 로그인 쿠키, 세션, 회원 계정, 고객 이름, 전화번호, 이메일, 주소, 계좌, 개인 답안·결과는 수집하거나 기록하지 않았습니다",
);
lines.push(
  "- [팩트] 작품 식별에 필요한 공개 작가명은 저작자 표시로 보존했습니다. 작가 프로필의 생년·사망년·국적·학력·인물 이미지·약력·수상·전시·소개 값은 모든 레코드에서 제거했습니다",
);
lines.push(
  "- [팩트] 제거된 상세 필드는 각 레코드의 `_redactedFields`에 필드명만 남겼으며 원값은 싣지 않았습니다",
);
lines.push(
  "- [팩트] 추적 매개변수(UTM)가 포함된 URL은 수록하지 않았습니다",
);
lines.push("");
lines.push("## 전수 검증 결과");
lines.push("");
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 [목록 API](${LIST_API_URL(1, 200)}) : 145건, 15페이지`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 페이지별 건수 : 1~14페이지 각 10건, 15페이지 5건`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 고유 식별자 : \`goodsId\` 145개, \`goodsCoPurchaseId\` 145개, 중복 0개`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 상태 : \`RECRUITED / BOUGHT\` ${statusCounts.RECRUITED}건, \`DISTRIBUTED / DISTRIBUTED\` ${statusCounts.DISTRIBUTED}건. [상태 enum 원문](https://weshareart.com/api/public/enum/fo/list)`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 \`saleYieldPercent\` 원값 : 최솟값 ${Math.min(...yields)}, 최댓값 ${Math.max(...yields)}, 양수 ${positiveYield}건, 0 ${zeroYield}건, 음수 ${negativeYield}건. 매각완료 52건은 모두 양수이고 모집종료 93건은 모두 0`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 \`goodsDetail\` : \`true\` ${detailTrue}건, \`false\` ${detailFalse}건`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 공개 상세 : 145건 전부 응답, 목록 18개 필드·상세 최상위 19개 필드·작품 16개 필드·작가 13개 필드의 keyset이 모든 레코드에서 동일`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 공개 상세 \`imageList.list\` URL : ${imageCount}개. 별도 \`artwork.imageUrl\` 145개를 합치면 545개이며 모두 고유합니다. 이미지는 내려받거나 복제하지 않고 URL만 보존`,
);
lines.push(
  "- [팩트] 15개 페이지 결합 순서와 `size=200` 단일 응답의 레코드·필드·원값이 모두 일치했습니다",
);
lines.push(
  "- [팩트] 목록과 공개 상세의 상품명, 모집기간, 수익률, 상태, 작가명, 대표 이미지 연결을 145건 전수 대조했고 불일치는 각각 0건입니다",
);
lines.push(
  "- [확인 불가] 매각 summary·목록·상세 endpoint는 비로그인 요청에 HTTP 401과 `COMMON_INVALID_SESSION`을 반환했습니다. 로그인 세션이나 인증 우회 없이 매각일, 매각가, 배분내역은 확인할 수 없습니다",
);
lines.push("");
lines.push("## 원값 보존 규칙");
lines.push("");
lines.push(
  "- 각 레코드의 JSON은 값의 의미와 자료형을 보존해 재직렬화했습니다. `null`, 빈 문자열 `\"\"`, 공백 문자열, 숫자 `0`, boolean은 구분하지만 숫자 `0.0`·`1.0`의 소수점 표기 자체는 JSON 재직렬화 과정에서 `0`·`1`로 표시될 수 있습니다",
);
lines.push(
  "- `investBeginDateTime`·`investEndDateTime`에는 `Z`나 UTC offset이 없습니다. UTC 또는 KST로 변환하지 않고 timezone 미지정 local datetime 원문으로 보존했습니다",
);
lines.push(
  "- `pieceAmount`·`estimateMinAmount`·`estimateMaxAmount` 등 금액형 필드에는 currency code가 없습니다. 문서에서 통화 단위를 임의로 붙이지 않았습니다",
);
lines.push(
  "- 화면은 `saleYieldPercent` 뒤에 `%`를 붙입니다. `RECRUITED`의 숫자 `0`은 공개 매각 상세가 없으므로 ‘0% 손익으로 매각’이라는 뜻으로 해석하지 않았습니다",
);
lines.push(
  "- 화면의 `전체` 필터는 현재 enum 설명상 모집예정 항목을 제외합니다. 따라서 이 문서의 145건은 해당 화면이 반환한 ‘지난 공동구매’ 전수이며 플랫폼 전체 상품 전수라는 뜻은 아닙니다",
);
lines.push("");
lines.push("### 목록 18개 필드의 빈값 분포");
lines.push("");
lines.push(
  `- [팩트] 아래 표의 수치·원문 : ${SNAPSHOT_AT}, [목록 API 145건](${LIST_API_URL(1, 200)})`,
);
lines.push("");
lines.push("| 필드 | `null` | 빈 문자열 | 공백만 | 그 외 값 |");
lines.push("|---|---:|---:|---:|---:|");
for (const field of LIST_FIELDS) {
  const counts = blankDistribution(records, field);
  lines.push(
    `| \`${field}\` | ${counts.null} | ${counts.empty} | ${counts.whitespace} | ${counts.nonBlank} |`,
  );
}
lines.push("");
lines.push("## 필드 구조");
lines.push("");
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 목록 항목 : ${LIST_FIELDS.map((field) => `\`${field}\``).join(", ")}`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 상세 최상위 : ${DETAIL_FIELDS.map((field) => `\`${field}\``).join(", ")}`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 작품 객체 : ${ARTWORK_FIELDS.map((field) => `\`${field}\``).join(", ")}`,
);
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 작가 객체 : ${ARTIST_FIELDS.map((field) => `\`${field}\``).join(", ")}`,
);
lines.push(
  "- [팩트] 아래 레코드의 공개 상세 JSON은 상세 최상위·작품·이미지 필드를 원값으로 싣고, 개인정보 제거 대상 작가 프로필 값만 삭제했습니다",
);
lines.push("");
lines.push("## 장문 상세 콘텐츠 범위");
lines.push("");
lines.push(
  `- [팩트] ${SNAPSHOT_AT} 기준 [상세 콘텐츠 API 표본](${SECTION_API_URL(166)})의 항목 구조 : \`content\`, \`investPointTemplateId\`, \`templateData\`, \`templateSubType\`, \`templateTitle\`, \`templateType\`, \`title\`, \`type\``,
);
lines.push(
  "- [팩트] 145개 상품의 상세 콘텐츠는 합계 1,071개 섹션입니다. 유형별로 `ARTWORK_INFO` 145개, `ART_DIRECTOR` 154개, `GOODS_NEWS` 344개, `INVEST` 398개, `SUMMARY` 30개입니다",
);
lines.push(
  "- [수록 제외] `content`는 장문 HTML 설명·마케팅 문구·이미지로 구성돼 원문 전체를 복제하지 않았습니다. 레코드마다 해당 API 원문 링크를 남겼습니다",
);
lines.push("");
lines.push("## 페이지 목차");
lines.push("");
lines.push("| 페이지 | 건수 | 첫 상품 | 마지막 상품 | 화면 | API 원문 |");
lines.push("|---:|---:|---|---|---|---|");
for (let page = 1; page <= 15; page += 1) {
  const pageRecords = pages[page - 1];
  lines.push(
    `| [${page}](#page-${page}) | ${pageRecords.length} | ${inline(compact(pageRecords[0].goodsName))} | ${inline(compact(pageRecords.at(-1).goodsName))} | [목록](${LIST_PAGE_URL(page)}) | [JSON](${LIST_API_URL(page)}) |`,
  );
}
lines.push("");
lines.push("## 전체 레코드");
lines.push("");
lines.push(
  `- [팩트] 아래 145건의 원문 시점 : ${SNAPSHOT_AT}. 순서는 [목록 API](${LIST_API_URL(1, 200)}) 응답 순서와 동일`,
);
lines.push(
  "- 각 항목의 첫 JSON은 목록 18개 필드 전부, 둘째 JSON은 개인정보 제거 후 공개 상세 구조입니다",
);
lines.push("");

let sequence = 0;
for (let page = 1; page <= 15; page += 1) {
  const pageRecords = pages[page - 1];
  lines.push(`<a id="page-${page}"></a>`);
  lines.push("");
  lines.push(`### ${page}페이지`);
  lines.push("");
  lines.push(
    `- [팩트] ${SNAPSHOT_AT} 기준 건수 : ${pageRecords.length}건`,
  );
  lines.push(
    `- [화면](${LIST_PAGE_URL(page)}) / [페이지별 API 원문](${LIST_API_URL(page)})`,
  );
  lines.push("");

  for (const record of pageRecords) {
    sequence += 1;
    const detail = details.get(record.goodsId);
    const artist = compact(
      record.artistNameForKorean || record.artistNameForEnglish,
    );
    const title = compact(
      record.titleForKorean || record.titleForEnglish || record.goodsName,
    );
    const uiStatus =
      record.coPurchaseStatusCategory === "DISTRIBUTED" ? "매각완료" : "모집종료";
    lines.push("<details>");
    lines.push(
      `<summary>${sequence}. ${inline(artist)} : ${inline(title)} — ${uiStatus} / goodsId ${record.goodsId}</summary>`,
    );
    lines.push("");
    lines.push(
      `- 식별자 : \`goodsId\` ${record.goodsId} / \`goodsCoPurchaseId\` ${record.goodsCoPurchaseId}`,
    );
    lines.push(
      `- 원문 : [상품 화면](https://weshareart.com/goodsDetail/${record.goodsId}) / [목록 API](${LIST_API_URL(page)}) / [공개 상세 API](${DETAIL_API_URL(record.goodsId)}) / [장문 상세 콘텐츠 API](${SECTION_API_URL(record.goodsId)})`,
    );
    lines.push(
      `- 상태·수익률 원값 : \`${record.coPurchaseStatusCategory} / ${record.coPurchaseStatus}\` / \`saleYieldPercent\` ${record.saleYieldPercent}`,
    );
    lines.push("");
    lines.push("목록 API 18개 필드 원값");
    lines.push("");
    lines.push(jsonBlock(record));
    lines.push("");
    lines.push("공개 상세 API 원값 — 작가 프로필 개인정보 제거본");
    lines.push("");
    lines.push(jsonBlock(redactDetail(detail)));
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
}

if (sequence !== 145) fail(`expected 145 output records, got ${sequence}`);

const output = `${lines.join("\n").trimEnd()}\n`;
if (/utm_(source|medium|campaign|content|term)=/i.test(output)) {
  fail("UTM parameter leaked into output");
}
if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(output)) {
  fail("email-like value leaked into output");
}
fs.writeFileSync(OUTPUT, output, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(ROOT, OUTPUT),
      bytes: Buffer.byteLength(output),
      records: sequence,
      pages: pages.length,
      listFields: LIST_FIELDS.length,
      detailFields: DETAIL_FIELDS.length,
      artworkFields: ARTWORK_FIELDS.length,
      artistFields: ARTIST_FIELDS.length,
      publicDetailImageUrls: imageCount,
      redactedArtistProfileFields: REDACTED_ARTIST_PROFILE_FIELDS,
    },
    null,
    2,
  ),
);
