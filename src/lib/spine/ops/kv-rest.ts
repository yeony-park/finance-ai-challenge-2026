export interface KvCredentials {
  readonly url: string;
  readonly token: string;
}

export type KvCommand = readonly string[];

export interface KvPipelineResult {
  readonly result?: unknown;
  readonly error?: string;
}

export const resolveKvCredentials = (): KvCredentials | null => {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  return url.length > 0 && token.length > 0 ? { url, token } : null;
};

export const kvPipeline = async (
  credentials: KvCredentials,
  commands: readonly KvCommand[],
): Promise<readonly KvPipelineResult[]> => {
  const response = await fetch(`${credentials.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!response.ok) {
    throw new Error(`upstash pipeline ${response.status}`);
  }
  const results = (await response.json()) as unknown;
  if (!Array.isArray(results) || results.length !== commands.length) {
    throw new Error("unexpected pipeline result shape");
  }
  return results as readonly KvPipelineResult[];
};
