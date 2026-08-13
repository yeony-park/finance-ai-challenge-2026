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
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  };

  const lanes = Array.from({ length: Math.min(limit, items.length) }, runLane);
  await Promise.all(lanes);
  return results;
};
