import { describe, expect, test } from "vitest";
import { createMemoryRateLimiter } from "../ops/rate-limit";

describe("레이트리밋", () => {
  test("allows up to the limit then rejects within the window", () => {
    // Arrange
    const limiter = createMemoryRateLimiter(3, 1_000);
    const t0 = 1_000_000;

    // Act
    const first = limiter.check("ip1", t0);
    limiter.check("ip1", t0 + 10);
    limiter.check("ip1", t0 + 20);
    const fourth = limiter.check("ip1", t0 + 30);

    // Assert
    expect(first.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  test("resets after the window slides past old hits", () => {
    const limiter = createMemoryRateLimiter(2, 1_000);
    const t0 = 5_000_000;
    limiter.check("ip2", t0);
    limiter.check("ip2", t0 + 1);

    const afterWindow = limiter.check("ip2", t0 + 1_500);
    expect(afterWindow.allowed).toBe(true);
  });

  test("isolates keys from each other", () => {
    const limiter = createMemoryRateLimiter(1, 1_000);
    const t0 = 9_000_000;
    limiter.check("ipA", t0);

    expect(limiter.check("ipB", t0 + 1).allowed).toBe(true);
  });
});
