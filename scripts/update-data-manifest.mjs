#!/usr/bin/env node
/**
 * data/MANIFEST.md 생성기 — `npm run data:manifest`
 *
 * 목적: 개인정보(농장주 실명·상세주소·농장번호)가 담긴 원천 데이터는 git에 올리지 않는다.
 * 대신 무엇이 어디에 있어야 하는지(경로·sha256·바이트·출처·재확보 방법)를 매니페스트로만 커밋해
 * 신규 클론이 "무엇이 없는지"와 "어떻게 다시 받는지"를 알 수 있게 한다.
 *
 * 표준 라이브러리만 사용한다(의존성 추가 금지).
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const MANIFEST_PATH = path.join(DATA_DIR, "MANIFEST.md");

/** 로컬 전용(커밋 금지) 디렉토리와 그 재확보 방법 */
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

/** 커밋 대상 — 마스킹이 끝난 공개 산출물 */
const PUBLIC_GROUP = {
  dir: "public",
  title: "공개 리포트 (마스킹 완료 · 커밋 대상)",
  source: "toPublicReport(내부 리포트) 산출",
  recover: "`npm run verify -- --rcpNo <rcpNo>`",
  note: "화면·배포가 읽는 유일한 데이터. 이력번호·개체명·지역·자유텍스트 마스킹 적용.",
};

const listFilesRecursively = async (dir) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listFilesRecursively(full)));
    else if (entry.isFile()) found.push(full);
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
  const files = await listFilesRecursively(path.join(DATA_DIR, group.dir));
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

const render = (groups, publicGroup, generatedAt) =>
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
    "커밋되는 것은 **이 매니페스트**와 **마스킹이 끝난 공개 산출물(`data/public/`)** 뿐이다.",
    "",
    "| 구분 | 경로 | git |",
    "|---|---|---|",
    "| 원문 | `data/raw/{rcpNo}/` | 제외(.gitignore) |",
    "| 실측 스냅샷 | `data/snapshots/` | 제외(.gitignore) |",
    "| 내부 리포트 | `data/reports/{offerId}/` | 제외(.gitignore) |",
    "| 공개 리포트 | `data/public/{offerId}/` | **커밋** |",
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
    renderGroup(publicGroup, publicGroup.title),
  ].join("\n");

const main = async () => {
  const groups = [];
  for (const group of LOCAL_ONLY_GROUPS) groups.push(await describeGroup(group));
  const publicGroup = await describeGroup(PUBLIC_GROUP);

  const markdown = render(groups, publicGroup, new Date().toISOString());
  await writeFile(MANIFEST_PATH, markdown, "utf8");

  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  console.log(
    `매니페스트 갱신: ${path.relative(ROOT, MANIFEST_PATH)} — 로컬 전용 ${total}건 · 공개 ${publicGroup.files.length}건`,
  );
};

main().catch((error) => {
  console.error(
    "매니페스트 생성 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
