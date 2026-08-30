# contracts/ — AI 집행 계약 (진입점)

> 이 폴더는 **AI 세션(Claude Code·Codex 등)이 코드 작성 전에 읽고 그대로 따르는 집행 규칙**이다.
> 근거·배경·트레이드오프는 `docs/spec/`에 있다 — 여기에는 규칙만 있다.

## 우선순위 (충돌 시)

```
1순위  코드 타입·테스트  (src/lib/verify/contract/, live/response.ts 등 — 단일 진실)
2순위  contracts/*.md    (이 폴더)
3순위  docs/spec/*.md    (산문·근거)
```

충돌을 발견하면: 상위를 따르고, 하위 문서의 정정을 **같은 PR에서 제안**한다. 조용히 무시 금지.

## 로딩 규칙 — 작업 유형별 필독 파일

| 지금 하려는 작업 | 읽을 파일 |
|---|---|
| 모든 작업 (항상) | `invariants.md` |
| API 라우트 신설·수정, 응답 형태 변경 | `api.md` |
| DB·스키마·시드·RAG·더미 데이터, `data/` 산출물 | `storage.md` |
| 카테고리 디스크립터 작성 (팀원 착수) | `docs/spec/01-category-contract.md` (착수 가이드 포함 — 증류본 없음, 원문 필독) |
| 사용자 대면 문안·화면 표기 | `invariants.md` §표현 + `docs/spec/04-expression-rules.md` |

## 규칙 표기 규약

- 규칙 ID: `R-<영역>-<번호>` (영역: INV·API·STO). PR 본문·코드 리뷰에서 이 ID로 인용한다.
- `MUST` = 위반 시 머지 불가. `금지` = 위반 시 머지 불가. `기본값` = 팀 결정 대기 항목의 잠정 규칙 — 따르되 확정 전 표기 유지.
- 규칙 개정은 오너 승인 + `docs/worklog/` 4섹션 기록 후에만. ID는 재사용하지 않는다(폐기 시 ~~취소선~~ + 사유).
