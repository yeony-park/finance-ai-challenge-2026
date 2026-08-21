import Link from "next/link";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import { FIXED_NOTICES } from "@/lib/verify/contract/notices";
import { OnboardingOpenButton } from "./OnboardingOpenButton";
import { DATA_SOURCES, SERVICE_NAME, SERVICE_ROLE } from "./service";
import s from "./shell.module.css";

const FOOTER_NAV: readonly { href: string; label: string }[] = [
  ...CATEGORY_REGISTRY.map((entry) => ({ href: entry.href, label: entry.label })),
  { href: "/offers", label: "검증 리포트" },
  { href: "/methodology", label: "검증 방법" },
];

const VERDICT_TERMS: readonly string[] = [
  "일치 — 공시 내용이 공공 데이터에서 확인됩니다",
  "원장 불일치 — 공시 기재와 공공 데이터의 값이 서로 다릅니다",
  "대조 불가 — 대조할 공공 데이터가 없거나 조회해도 확인되지 않습니다",
];

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.footerGrid}>
          <div>
            <p className={s.footerBrand}>{SERVICE_NAME}</p>
            <p className={s.footerTagline}>
              {SERVICE_ROLE} · 증권신고서와 국가 공공데이터 대조
            </p>
            <ul className={s.footerNavList}>
              {FOOTER_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={s.footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <OnboardingOpenButton className={s.footerAction} />
          </div>

          <div>
            <h2 className={s.footerHeading}>판정은 세 값</h2>
            <ul className={s.footerList}>
              {VERDICT_TERMS.map((term) => (
                <li key={term}>
                  <span className={s.footerListMark} aria-hidden="true">
                    ·
                  </span>
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={s.footerHeading}>데이터 출처</h2>
            <ul className={s.footerList}>
              {DATA_SOURCES.map((source) => (
                <li key={source.name}>
                  <span className={s.footerListMark} aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {source.name}
                    <span className={s.footerListNote}>{source.holder} · 공개 데이터</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={s.disclaimer}>
          {FIXED_NOTICES.map((notice, index) => (
            <p key={notice}>
              {index === 0 ? (
                <span className={s.disclaimerStrong}>{notice}</span>
              ) : (
                notice
              )}
            </p>
          ))}
          <p>
            대조 결과가 &ldquo;원장 불일치&rdquo;라는 것은 해당 시점의 공개 기록과 값이
            다르다는 사실만을 뜻하며, 그 원인이나 의도를 단정하지 않습니다.{" "}
            <span className={s.disclaimerStrong}>자료가 부족하다는 사실 자체는 부정적 판단의
            근거가 아닙니다.</span> 판정 기준과 한계는{" "}
            <Link href="/methodology" className={s.footerLink}>
              검증 방법
            </Link>
            에서 확인할 수 있습니다.
          </p>
          <p>
            화면에 표시되는 발행사명·이력번호·소재지는 익명화 처리된 상태입니다.
          </p>
        </div>

        <p className={s.colophon}>
          <span>© 2026 {SERVICE_NAME} (가칭)</span>
          <span>익명화 적용</span>
          <span>2026 금융 AI Challenge 출품</span>
        </p>
      </div>
    </footer>
  );
}
