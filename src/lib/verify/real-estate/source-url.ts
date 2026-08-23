export const isSensitiveCredentialKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  const compact = lower.replace(/[-_]/g, "");
  return (
    lower.startsWith("x-amz-") ||
    compact === "servicekey" ||
    compact === "apikey" ||
    compact.endsWith("token") ||
    compact.endsWith("auth") ||
    compact.endsWith("authorization") ||
    compact.endsWith("signature") ||
    compact.endsWith("credential")
  );
};

export const isSafePublicSourceUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.username === "" &&
      url.password === "" &&
      ![...url.searchParams.keys()].some(isSensitiveCredentialKey)
    );
  } catch {
    return false;
  }
};

export const sanitizePublicSourceUrl = (
  value: string,
  fallback: string,
): string => {
  if (isSafePublicSourceUrl(value)) return value;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return fallback;
    url.username = "";
    url.password = "";
    if ([...url.searchParams.keys()].some(isSensitiveCredentialKey)) {
      url.search = "";
    }
    return url.toString();
  } catch {
    return fallback;
  }
};
