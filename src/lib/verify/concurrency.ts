/**
 * 동시 실행 유틸 — 외부 API를 배치로 호출하되 상한을 둔다.
 *
 * 왜 상한이 필요한가: 공공데이터포털 API는 일일 호출 쿼터(이력제 10,000건)와
 * 사실상의 동시성 제한이 있다. 37두를 한꺼번에 던지면 쿼터·레이트 리밋에 걸릴 뿐 아니라
 * 상대 서비스에도 부담이 된다. 순차 호출과 무제한 병렬 사이의 안전한 절충이다.
 */

/** 입력 순서를 그대로 보존한 결과 배열을 돌려준다 (판정 결정성 유지) */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<readonly R[]> => {
  if (limit < 1) throw new Error(`동시 실행 상한은 1 이상이어야 합니다: ${limit}`);

  const results = new Array<R>(items.length);
  let cursor = 0;

  const runLane = async (): Promise<void> => {
    while (cursor < items.length) {
      // 커서를 먼저 확보해야 레인끼리 같은 항목을 중복 처리하지 않는다
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  };

  const lanes = Array.from({ length: Math.min(limit, items.length) }, runLane);
  await Promise.all(lanes);
  return results;
};
