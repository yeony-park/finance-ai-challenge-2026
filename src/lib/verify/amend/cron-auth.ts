export type CronAuthCode = "ok" | "not_configured" | "unauthorized";

export interface CronAuthDecision {
  readonly ok: boolean;
  readonly code: CronAuthCode;
  readonly status: number;
  readonly message: string;
}

const ALLOWED: CronAuthDecision = {
  ok: true,
  code: "ok",
  status: 200,
  message: "",
};

const NOT_CONFIGURED: CronAuthDecision = {
  ok: false,
  code: "not_configured",
  status: 503,
  message:
    "감시 실행에 필요한 CRON_SECRET이 설정되지 않아 이 요청을 처리하지 않았습니다.",
};

const UNAUTHORIZED: CronAuthDecision = {
  ok: false,
  code: "unauthorized",
  status: 401,
  message: "감시 실행 권한이 확인되지 않았습니다.",
};

const timingSafeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
};

export const authorizeCronRequest = (
  authorizationHeader: string | null,
  secret: string | undefined,
): CronAuthDecision => {
  if (!secret) return NOT_CONFIGURED;
  if (!authorizationHeader) return UNAUTHORIZED;
  return timingSafeEqual(authorizationHeader, `Bearer ${secret}`)
    ? ALLOWED
    : UNAUTHORIZED;
};
