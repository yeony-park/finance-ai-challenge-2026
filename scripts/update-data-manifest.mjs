#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const MANIFEST_PATH = path.join(DATA_DIR, "MANIFEST.md");

const LOCAL_ONLY_GROUPS = [
  {
    dir: "raw",
    title: "원문 (DART 증권신고서)",
    source: "OpenDART document.xml API (crtfc_key 필요)",
    recover: "`npm run verify:collect -- <rcpNo>`",
    note: "ZIP 해제본 그대로. 농장 상세주소·개체 식별자 포함.",
  },
  {
    dir: "snapshots",
    title: "실측 스냅샷 (축산물이력제 API 응답)",
    source: "축산물품질평가원 축산물이력정보 (data.go.kr 15058923)",
    recover:
      "팀 내부 채널에서 수령하거나, `DATA_GO_KR_API_KEY`로 `npm run verify:live -- --rcpNo <rcpNo>` 재수집",
    note: "농장주 실명(farmerNm)·상세주소(farmAddr) 포함 — 절대 커밋 금지.",
  },
  {
    dir: "reports",
    title: "내부 판정 리포트",
    source: "검증 파이프라인 산출 (재생성 가능)",
    recover: "`npm run verify -- --rcpNo <rcpNo>`",
    note: "농장번호·상세주소 포함. 화면·배포는 이 파일을 읽지 않는다(data/public 사용).",
  },
];

const PUBLIC_GROUPS = [
  {
    dir: "public",
    title: "공개 리포트 (마스킹 완료 · 커밋 대상)",
    source: "toPublicReport(내부 리포트) 산출",
    recover: "`npm run verify -- --rcpNo <rcpNo>`",
    note: "화면·배포가 읽는 유일한 데이터. 이력번호·개체명·지역·자유텍스트 마스킹 적용.",
  },
  {
    dir: "reference",
    title: "참조 시장 데이터 (시장 통계 · 커밋 대상)",
    source:
      "축산물품질평가원 축산물등급판정정보 (data.go.kr 15058822) — 소도체 등급별 경락가격 / 국토교통부 상업업무용 부동산 매매 신고 자료 (실거래가 오픈API)",
    recover:
      "`npm run reference:collect -- --from <YYYY-MM> --to <YYYY-MM>` · `npm run reference:rtms -- --from <YYYY-MM> --to <YYYY-MM> --lawdCd <시군구코드>`",
    note: "개인정보 없음(집계·신고 통계). 쿼터 방어를 위해 사전 수집하며, 판정·화면은 이 캐시만 읽는다(런타임 API 호출 없음). 수집이 거부된 달은 status=failed로 남고 비교군에 들어가지 않는다.",
    skipDirectoryNames: ["raw"],
  },
  {
    dir: "offers",
    title: "공모 기초자료 (공개 자료 정리 · 커밋 대상)",
    source:
      "발행사 공모 공고·매각 공시와 언론 보도 등 공개 자료 (파일 안의 sources 필드에 출처·확인일 병기)",
    recover: "수기 정리 — 새 공모 추가 시 `data/offers/{offerId}.json`을 만든다",
    note: "개인정보 없음(상업용 건물의 공개 실거래 단위 정보). 화면에는 익명화(발행사·건물명 중립 표기, 지번 마스킹) 후 노출된다.",
  },
  {
    dir: "synthetic",
    title: "합성 미술품 카탈로그 (화면 검증용 · 커밋 대상)",
    source:
      "synthetic-feature-restore e65337f 합성 fixture (실제 작품·작가·플랫폼과 무관)",
    recover:
      "`git show e65337f:data/synthetic/art-investment.json > data/synthetic/art-investment.json`",
    note: "화면·검색·상세 흐름 검증용. 외부 원문 대조나 투자 판단에 사용하지 않는다.",
  },
];

const listFilesRecursively = async (dir, skipDirectoryNames = []) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !skipDirectoryNames.includes(entry.name)) {
      found.push(...(await listFilesRecursively(full, skipDirectoryNames)));
    } else if (entry.isFile()) found.push(full);
  }
  return found;
};

const describeFile = async (absolute) => {
  const [content, stats] = await Promise.all([readFile(absolute), stat(absolute)]);
  return {
    relative: path.relative(ROOT, absolute).split(path.sep).join("/"),
    sha256: createHash("sha256").update(content).digest("hex"),
    bytes: stats.size,
  };
};

const describeGroup = async (group) => {
  const files = await listFilesRecursively(
    path.join(DATA_DIR, group.dir),
    group.skipDirectoryNames,
  );
  const described = [];
  for (const file of files) described.push(await describeFile(file));
  return { ...group, files: described };
};

const renderTable = (files) => {
  if (files.length === 0) {
    return "_현재 로컬에 파일이 없습니다._\n";
  }
  const rows = files.map(
    (file) =>
      `| \`${file.relative}\` | ${file.bytes.toLocaleString("en-US")} | \`${file.sha256}\` |`,
  );
  return ["| 경로 | 바이트 | sha256 |", "|---|---:|---|", ...rows].join("\n") + "\n";
};

const renderGroup = (group, heading) => [
  `### ${heading}`,
  "",
  `- **출처**: ${group.source}`,
  `- **재확보**: ${group.recover}`,
  `- **비고**: ${group.note}`,
  "",
  renderTable(group.files),
].join("\n");

const render = (groups, publicGroups, generatedAt) =>
  [
    "<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->",
    "",
    "# data/ 매니페스트",
    "",
    `생성 시각: ${generatedAt}`,
    "",
    "## 저장 정책",
    "",
    "개인정보(농장주 실명·상세주소·농장번호)가 담긴 원천 데이터는 git에 올리지 않는다.",
    "커밋되는 것은 **이 매니페스트**, **마스킹이 끝난 공개 산출물(`data/public/`)**, **원문을 제거한 정제 JSON(`data/reference/`)**이다.",
    "",
    "| 구분 | 경로 | git |",
    "|---|---|---|",
    "| 원문 | `data/raw/{rcpNo}/` | 제외(.gitignore) |",
    "| 외부 원문 | `data/**/raw/` 및 `data/**/*.{pdf,hwp,hwpx,...}` | 제외(.gitignore) |",
    "| 실측 스냅샷 | `data/snapshots/` | 제외(.gitignore) |",
    "| 내부 리포트 | `data/reports/{offerId}/` | 제외(.gitignore) |",
    "| 공개 리포트 | `data/public/{offerId}/` | **커밋** |",
    "| 발행사 트랙레코드 | `data/public/track-record/{issuerKey}.json` | **커밋**(공시 집계 — 발행사명·corp_code 미포함) |",
    "| 경락가 월 집계 | `data/reference/auction-price/` | **커밋**(시장 통계 — 개인정보 없음) |",
    "| 실거래 월 신고 | `data/reference/rtms/` | **커밋**(시장 통계 — 개인정보 없음) |",
    "| 정제 참조 JSON | `data/reference/**/*.json` (`raw/` 제외) | **커밋**(비식별·출처 메타데이터 포함) |",
    "| 공모 기초자료 | `data/offers/{offerId}.json` | **커밋**(공개 자료 정리 — 개인정보 없음) |",
    "| 합성 미술품 fixture | `data/synthetic/art-investment.json` | **커밋**(화면 검증용 — 실제 투자 데이터 아님) |",
    "| 매니페스트 | `data/MANIFEST.md` | **커밋** |",
    "",
    "신규 클론에서 로컬 전용 파일이 없어도 `npm test`·`npm run build`는 통과한다",
    "(로컬 데이터에 의존하는 테스트는 파일 부재 시 명시적으로 스킵된다).",
    "",
    "## 로컬 전용 파일 (커밋 금지)",
    "",
    ...groups.map((group, index) => renderGroup(group, `${index + 1}. ${group.title}`)),
    "## 커밋 대상 산출물",
    "",
    ...publicGroups.map((group) => renderGroup(group, group.title)),
  ].join("\n");

const main = async () => {
  const groups = [];
  for (const group of LOCAL_ONLY_GROUPS) groups.push(await describeGroup(group));
  const publicGroups = [];
  for (const group of PUBLIC_GROUPS) publicGroups.push(await describeGroup(group));

  const markdown = render(groups, publicGroups, new Date().toISOString());
  await writeFile(MANIFEST_PATH, markdown, "utf8");

  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  const published = publicGroups.reduce(
    (sum, group) => sum + group.files.length,
    0,
  );
  console.log(
    `매니페스트 갱신: ${path.relative(ROOT, MANIFEST_PATH)} — 로컬 전용 ${total}건 · 커밋 대상 ${published}건`,
  );
};

main().catch((error) => {
  console.error(
    "매니페스트 생성 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
