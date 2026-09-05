"use client";

/**
 * 값이 바뀐 CSS 커스텀 프로퍼티만 다시 쓴다.
 *
 * 스크롤 프레임마다 같은 값을 반복해서 setProperty하면 브라우저가 매번
 * 스타일을 다시 계산한다. 마지막으로 쓴 값을 기억해 두고 달라졌을 때만
 * 실제로 쓴다.
 */
export interface CssVarWriter {
  /** 값이 직전과 다를 때만 setProperty한다. */
  readonly write: (
    element: HTMLElement,
    property: string,
    value: string,
  ) => void;
  /** 기록해 둔 값들을 지운다(다음 write는 무조건 실제로 쓴다). */
  readonly forget: (element: HTMLElement) => void;
  /** 지금까지 쓴 프로퍼티를 모두 제거한다. */
  readonly clear: (element: HTMLElement) => void;
}

export const createCssVarWriter = (): CssVarWriter => {
  const written = new WeakMap<HTMLElement, Map<string, string>>();

  const entriesOf = (element: HTMLElement): Map<string, string> => {
    const existing = written.get(element);
    if (existing) return existing;
    const created = new Map<string, string>();
    written.set(element, created);
    return created;
  };

  return {
    write: (element, property, value) => {
      const entries = entriesOf(element);
      if (entries.get(property) === value) return;
      entries.set(property, value);
      element.style.setProperty(property, value);
    },
    forget: (element) => {
      written.delete(element);
    },
    clear: (element) => {
      const entries = written.get(element);
      if (!entries) return;
      entries.forEach((_value, property) =>
        element.style.removeProperty(property),
      );
      written.delete(element);
    },
  };
};

/** px 값을 문자열로 만드는 공통 포맷터. */
export const px = (value: number): string => `${value}px`;

/** 퍼센트 값을 문자열로 만드는 공통 포맷터. */
export const percent = (value: number): string => `${value}%`;
