/**
 * 앱 셸 푸터 — 서비스의 성격을 못 박는 자리다.
 * 판정 3값·단정 금지·익명화·데이터 출처, 그리고 투자 권유가 아니라는 고지를 항상 노출한다.
 */
import Link from "next/link";

import { DATA_SOURCES, SERVICE_NAME, SERVICE_ROLE } from "./service";
import s from "./shell.module.css";

const VERDICT_TERMS: readonly string[] = [
  "일치 — 공시 내용이 공공 데이터에서 확인됩니다",
  "원장에서 확인되지 않음 — 공공 데이터에서 확인되지 않습니다",
  "확인 불가 — 대조할 공공 데이터가 없거나 아직 연결되지 않았습니다",
];

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.footerGrid}>
          <div>
            <p className={s.footerBrand}>{SERVICE_NAME}</p>
            <p className={s.footerTagline}>
              {SERVICE_ROLE} · 발행사가 낸 문서와 국가가 가진 기록을 나란히 놓습니다.
            </p>
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
          <p>
            <span className={s.disclaimerStrong}>본 서비스는 투자 권유·자문이 아닙니다.</span>{" "}
            특정 공모의 청약을 권유하거나 만류하지 않으며, 수익률이나 투자 위험의 크기를 예측하지
            않습니다. 제공하는 것은 공시 내용과 공공 데이터의 대조 결과뿐입니다.
          </p>
          <p>
            대조 결과가 &ldquo;원장에서 확인되지 않음&rdquo;이라는 것은 해당 시점의 공개 기록에서
            확인되지 않았다는 사실만을 뜻하며, 그 원인을 단정하지 않습니다.{" "}
            <span className={s.disclaimerStrong}>자료가 부족하다는 사실 자체는 부정적 판단의
            근거가 아닙니다.</span> 판정 기준과 한계는{" "}
            <Link href="/methodology" className={s.footerLink}>
              검증 방법
            </Link>
            에서 확인할 수 있습니다.
          </p>
          <p>
            화면에 표시되는 발행사명·이력번호·소재지는 익명화 처리된 상태입니다. 최종 판단과 그
            결과에 대한 책임은 이용자 본인에게 있습니다.
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
