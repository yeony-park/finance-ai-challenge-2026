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
    title: "공시 통합",
    description: "여기에 공시 통합 기능 설명을 넣어주세요.",
  },
  {
    number: "02",
    title: "근거 연결",
    description: "여기에 근거 연결 기능 설명을 넣어주세요.",
  },
  {
    number: "03",
    title: "상태 확인",
    description: "여기에 상태 확인 기능 설명을 넣어주세요.",
  },
];

const workspaces = [
  {
    href: "/real-estate",
    icon: <BuildingIcon />,
    asset: "REAL ESTATE",
    title: "부동산 STO",
    description: "여기에 부동산 STO 서비스 설명을 넣어주세요.",
    owner: "문수",
  },
  {
    href: "/livestock/cattle",
    icon: <CattleIcon />,
    asset: "CATTLE",
    title: "한우 STO",
    description: "여기에 한우 STO 서비스 설명을 넣어주세요.",
    owner: "원준",
  },
  {
    href: "/livestock/pig",
    icon: <PigIcon />,
    asset: "PIG",
    title: "돼지 STO",
    description: "여기에 돼지 STO 서비스 설명을 넣어주세요.",
    owner: "연정",
  },
  {
    href: "/art",
    icon: <ArtIcon />,
    asset: "ART",
    title: "미술품 STO",
    description: "여기에 미술품 STO 서비스 설명을 넣어주세요.",
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
            모든 조각투자를 한 번에 보는
            <span>종합 STO 플랫폼</span>
          </h1>
          <p className="hero-description">
            여기에 종합 STO 플랫폼의 핵심 설명을 넣어주세요.
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
            여기에 공통 검토 흐름과 플랫폼 구성에 대한 설명을 넣어주세요.
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
            <p>여기에 자산별 서비스 영역에 대한 설명을 넣어주세요.</p>
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
