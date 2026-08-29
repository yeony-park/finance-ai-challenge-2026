export const isSensitiveCredentialKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");
  return (
    lower.startsWith("x-amz-") ||
    ["key", "sig", "secret", "password"].includes(compact) ||
    compact === "servicekey" ||
    compact === "apikey" ||
    compact.endsWith("accesskey") ||
    compact.endsWith("clientsecret") ||
    compact.endsWith("secret") ||
    compact.endsWith("password") ||
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
      url.hash === "" &&
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
    url.hash = "";
    if ([...url.searchParams.keys()].some(isSensitiveCredentialKey)) {
      url.search = "";
    }
    return url.toString();
  } catch {
    return fallback;
  }
};
