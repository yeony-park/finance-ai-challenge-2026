export type StorageMode = "db" | "file";

export const runtimeDatabaseUrl = (): string | undefined =>
  process.env.DATABASE_URL?.trim() || undefined;

export const directDatabaseUrl = (): string | undefined =>
  process.env.DATABASE_URL_DIRECT?.trim() || undefined;

export const storageMode = (): StorageMode =>
  runtimeDatabaseUrl() ? "db" : "file";

export const isFileMode = (): boolean => storageMode() === "file";
