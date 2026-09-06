import Link from "next/link";

import { SERVICE_NAME } from "./service";
import s from "./shell.module.css";

const GITHUB_REPOSITORY_URL =
  "https://github.com/yeony-park/finance-ai-challenge-2026";

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.footerGrid}>
          <div>
            <p className={s.footerTagline}>조각투자 공시 대조 플랫폼</p>
            <div className={s.colophon}>
              <div className={s.colophonMeta}>
                <strong className={s.colophonBrand}>{SERVICE_NAME}</strong>
                <span>© 2026</span>
                <Link href="/about" className={s.colophonLink}>
                  About
                </Link>
              </div>
              <a
                href={GITHUB_REPOSITORY_URL}
                className={s.footerGithub}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub 저장소 열기"
                title="GitHub"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.5a9.5 9.5 0 0 0-3 18.51c.48.09.65-.2.65-.46v-1.68c-2.65.57-3.21-1.12-3.21-1.12-.43-1.1-1.06-1.4-1.06-1.4-.86-.59.07-.58.07-.58.96.06 1.46.98 1.46.98.85 1.45 2.22 1.03 2.76.78.09-.62.33-1.03.61-1.27-2.12-.24-4.35-1.06-4.35-4.72 0-1.04.37-1.89.98-2.56-.1-.24-.42-1.21.09-2.53 0 0 .8-.26 2.62.98A9.1 9.1 0 0 1 12 7.57a9.1 9.1 0 0 1 2.39.32c1.82-1.24 2.62-.98 2.62-.98.51 1.32.19 2.29.09 2.53.61.67.98 1.52.98 2.56 0 3.67-2.23 4.47-4.36 4.71.34.29.64.84.64 1.69v2.5c0 .26.17.56.66.46A9.5 9.5 0 0 0 12 2.5Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <ul className={s.disclaimer}>
          <li>
            <span className={s.disclaimerStrong}>
              검증 결과는 공시 내용과 공개 데이터를 바탕으로 제공하는 참고 정보입니다.
              특정 상품의 청약이나 투자를 권유하거나 만류하지 않으며, 투자 자문·중개를
              제공하거나 수익을 보장하지 않습니다.
            </span>
          </li>
          <li>
            <span className={s.disclaimerStrong}>
              투자 판단과 그에 따른 결과 및 책임은 이용자에게 있습니다. 본 서비스는
              어떤 법적 근거로도 사용될 수 없습니다.
            </span>
          </li>
          <li>
            대조 결과가 &ldquo;원장 불일치&rdquo;라는 것은 해당 시점의 공개 기록과 값이
            다르다는 사실만을 뜻하며, 그 원인이나 의도를 단정하지 않습니다.
          </li>
          <li>
            판정 기준과 한계는{" "}
            <Link href="/methodology" className={s.footerLink}>
              검증 방법
            </Link>
            에서 확인할 수 있습니다.
          </li>
        </ul>

      </div>
    </footer>
  );
}
