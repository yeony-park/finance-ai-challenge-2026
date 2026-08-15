import Link from "next/link";
import {
  ArrowIcon,
  ArtIcon,
  BuildingIcon,
  CattleIcon,
  PigIcon,
} from "@/components/icons";

const platformRoles = [
  {
    number: "01",
    title: "공시 주장 구조화",
    description: "증권신고서와 정정본에서 기초자산·가격·비용·운영 조건을 주장 단위로 추출하고 원문 위치를 남깁니다.",
  },
  {
    number: "02",
    title: "외부 근거 대조",
    description: "식별자와 기준일을 이용해 공시 값을 공공 원장·시장 자료와 연결하고 같은 조건의 값만 비교합니다.",
  },
  {
    number: "03",
    title: "한계와 변경 추적",
    description: "확인·불일치·비교 필요·미확인·오래됨을 구분하고 정정공시가 접수되면 달라진 판정을 다시 기록합니다.",
  },
];

const workspaces = [
  {
    href: "/real-estate",
    icon: <BuildingIcon />,
    asset: "REAL ESTATE",
    title: "부동산 STO",
    description: "공모 구조와 건축물·실거래 근거를 조건별로 대조하고 확인되지 않은 권리관계를 구분합니다.",
    owner: "문수",
  },
  {
    href: "/livestock/cattle",
    icon: <CattleIcon />,
    asset: "CATTLE",
    title: "한우 STO",
    description: "공시의 개체 식별자와 축산물이력·가격 근거가 같은 대상을 가리키는지 확인합니다.",
    owner: "원준",
  },
  {
    href: "/livestock/pig",
    icon: <PigIcon />,
    asset: "PIG",
    title: "돼지 STO",
    description: "한돈 공시의 두수·운영 사건·정산 기준을 이력·경락가격·질병 근거와 대조합니다.",
    owner: "연정",
  },
  {
    href: "/art",
    icon: <ArtIcon />,
    asset: "ART",
    title: "미술품 STO",
    description: "공모가격, 작품 식별, 현재 보유 상태와 플랫폼 이력을 원문 근거에 연결합니다.",
    owner: "현석",
  },
];

export default function Home() {
  return (
    <main className="home-main">
      <section className="home-hero">
        <div className="shell home-hero-content">
          <p className="hero-kicker">2026 FINANCE AI CHALLENGE</p>
          <h1>
            조각투자 공시를
            <span>외부 근거와 대조합니다</span>
          </h1>
          <p className="hero-description">
            공시 사실, 외부 대조 결과, AI 설명을 구분해<br />확인된 내용과 아직 판단할 수 없는 부분을 함께 보여드립니다.
          </p>
          <a className="primary-button" href="#workspaces">
            자산별 서비스 보기 <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="platform-section shell" aria-labelledby="platform-title">
        <div className="home-section-heading">
          <div>
            <p>ONE STO PLATFORM</p>
            <h2 id="platform-title">공시부터 기초자산까지<br />하나의 흐름으로</h2>
          </div>
          <p>
            상품을 추천하거나 수익률을 예측하지 않습니다. 원문·기준일·수집 상태를 따라가며 투자 전에 필요한 검토 시간을 줄입니다.
          </p>
        </div>
        <div className="platform-role-grid">
          {platformRoles.map((role) => (
            <article key={role.number}>
              <span>{role.number}</span>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section" id="workspaces">
        <div className="shell">
          <div className="home-section-heading">
            <div>
              <p>ASSET SERVICES</p>
              <h2>자산별 서비스</h2>
            </div>
            <p>자산마다 다른 식별자와 시장 자료를 사용하되, 모든 화면은 같은 근거 구조와 판정 원칙을 따릅니다.</p>
          </div>
          <div className="workspace-grid">
            {workspaces.map((workspace) => (
              <Link className="workspace-card" href={workspace.href} key={workspace.href}>
                <div className="workspace-card-top">
                  <span className="workspace-icon">{workspace.icon}</span>
                  <span className="workspace-asset">{workspace.asset}</span>
                </div>
                <h3>{workspace.title}</h3>
                <p>{workspace.description}</p>
                <div className="workspace-owner">
                  <span>담당 {workspace.owner}</span>
                  <ArrowIcon />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
