export const containsObviousPii = (text: string): boolean => [
  /\b\d{6}[- ]?[1-4]\d{6}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?<!\d)(?:01[016789]|0\d{1,2})[- ]?\d{3,4}[- ]?\d{4}(?!\d)/,
  /(?:계좌(?:번호)?|account)[^\n\d]{0,12}\d{2,6}(?:[- ]\d{2,6}){2,3}/i,
].some((pattern) => pattern.test(text));
