# 골드셋 — 추출 품질 측정의 기준 라벨

추출기(규칙·LLM)가 신고서에서 뽑은 값이 **원문과 같은가**를 재는 정답 세트다.
판정(공적 원장 대조)의 정확도가 아니라 **추출**의 정확도를 잰다 — 둘을 섞지 않는다.

## 저장 정책

| 파일 | git |
|---|---|
| 이 문서 (`data/goldset/README.md`) | **커밋** |
| 라벨 파일 (`data/goldset/{offerId}/labels-{rcpNo}.json`) | 제외 — 이력번호·사육지 포함 |

라벨 파일은 `data/raw`·`data/reports`와 같은 로컬 전용 구획이다. 재생성은 아래 명령 한 줄이다.

## 1. 선라벨 생성

```bash
npm run goldset:prelabel -- --rcpNo 20260806000159
```

규칙 추출 결과를 `review: "pending"` 상태로 깔아 준다. **선라벨은 정답이 아니다** —
검수를 거치지 않은 라벨은 점수 분모에서 제외된다(자기채점 방지).

## 2. 검수 (사람이 하는 일)

라벨 파일을 열고, 각 항목을 **신고서 원문과 직접 대조**해 `review`를 채운다.
`section`·`row`가 원문 좌표이므로 그 표의 그 행을 보면 된다.

| `review` | 뜻 | `value` 처리 |
|---|---|---|
| `confirmed` | 선라벨이 원문과 같다 | 그대로 둔다 |
| `corrected` | 선라벨이 틀렸다 | `value`를 원문 값으로 고친다 (`prelabeledValue`는 그대로 둬 무엇이 틀렸는지 남긴다) |
| `not_in_doc` | 원문에 그런 값이 없다 (추출기가 만들어낸 값) | `value`를 비운다 |
| `pending` | 아직 안 봤다 | 측정에서 제외된다 |

검수자는 `reviewer` 필드에 이름을 남긴다.

### 값 표기 규칙 (추출기의 정규화와 같아야 한다)

| 종류 | 표기 |
|---|---|
| `livestock_trace_no` | 신고서 기재 9자리 숫자만 (`212786152`) |
| `livestock_breed` | 품종만 (`한우` — "송아지"는 뺀다) |
| `livestock_sex` | `수` / `암` / `거세` |
| `acquisition_date` | `YYYY-MM-DD` |
| `acquisition_price` | 숫자만, 콤마·단위 없이 (`4574865`) |
| `custody_location` | 신고서 기재 그대로 (행정구역 표기 유지) |

## 3. 점수 측정

```bash
npm run goldset:score -- --rcpNo 20260806000159                      # 규칙 추출
npm run goldset:score -- --rcpNo 20260806000159 --extract cross-check # 규칙+LLM 교차검증
```

`TP/FP/FN`, precision·recall·F1·EM과 불일치 목록을 출력한다.
미검수 라벨 수를 항상 함께 표시한다 — 분모가 몇 건인지 모르는 점수는 쓰지 않는다.

> **범위 메모**: S1은 선라벨 생성과 채점 규칙 고정까지다.
> 표본 확대(10건)와 모드별 비교 측정은 S2에서 수행한다.
