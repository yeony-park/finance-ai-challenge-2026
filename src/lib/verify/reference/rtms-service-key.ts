export const rtmsServiceKeyOf = (env: object): string | undefined => {
  const values = env as Record<string, unknown>;
  const dedicated = values.RTMS_API_KEY;
  const shared = values.DATA_GO_KR_API_KEY;
  return typeof dedicated === "string" && dedicated.length > 0
    ? dedicated
    : typeof shared === "string" && shared.length > 0
      ? shared
      : undefined;
};
