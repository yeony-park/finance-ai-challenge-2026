export const isEnoent = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "ENOENT";

export const ioErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
