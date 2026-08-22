/**
 * Server-side, immutable representations of XML files retrieved from OpenDART.
 * `text` and every chunk use JavaScript UTF-16 code-unit offsets.
 */
export type DartDocumentArtifactChunk = Readonly<{
  index: number;
  start: number;
  end: number;
  text: string;
}>;

export type DartDocumentArtifact = Readonly<{
  receiptNo: string;
  sourceUrl: string;
  fetchedAt: string;
  documentSha256: string;
  memberSha256: string;
  memberPath: string;
  encoding: string;
  text: string;
  chunks: readonly DartDocumentArtifactChunk[];
}>;

export type DartDocumentArtifactInput = Readonly<{
  isDemo: boolean;
  sourceUrls: readonly (string | null | undefined)[];
}>;

/** Dependency injection is for server tests and server integrations only. */
export type DartDocumentArtifactOptions = Readonly<{
  apiKey?: string | undefined;
  fetcher?: typeof fetch;
  now?: () => Date;
}>;

export type DartDocumentFetchStatus = "available" | "not_found" | "auth_error" | "transient_error" | "invalid_response";
