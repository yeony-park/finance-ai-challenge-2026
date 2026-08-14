import Link from "next/link";
import { NaturalLanguageSearch } from "@/components/art/natural-search";
import { PageContainer, ProductCard } from "@/components/art/ui";
import { historicalOfferingRepository, productRepository } from "@/lib/repositories/art-repositories";

export default function Home(){
 const aggregate=historicalOfferingRepository.getAggregate();
 const demoUpcoming=productRepository.getList().filter((item)=>item.offering.isDemo&&item.offering.status==="upcoming");
 const lifecycleSummary=[
  ["운용 중",aggregate.byLifecycle.operating,"operating"],
  ["매각 진행",aggregate.byLifecycle.exit_in_progress,"exit_in_progress"],
  ["매각 완료",aggregate.byLifecycle.sold,"sold"],
  ["청산 완료",aggregate.byLifecycle.liquidated,"liquidated"],
  ["반환",aggregate.byLifecycle.returned,"returned"],
  ["손실 확인",aggregate.byLifecycle.loss_confirmed,"loss_confirmed"],
 ] as const;
 return <main id="main-content" className="art-home">
  <section className="home-art-hero"><PageContainer><span className="real-data-badge">공개자료 저장본 · 데모 병행</span><p className="section-kicker">ART FRACTIONAL INVESTMENT · PRE-SUBSCRIPTION AI</p><h1>그림 조각투자,<br/><span>청약 전에 근거부터 확인하세요.</span></h1><p className="hero-copy">곧 청약할 작품을 가정한 DEMO로 판단 등급을 살펴보고, 실제 과거 공모의 보유·매각·정산 기록을 확인할 수 있습니다.</p><NaturalLanguageSearch/><div className="quick-links" aria-label="빠른 진입"><Link href="#upcoming-demo">등급별 청약 예정 DEMO</Link><Link href="/products?scope=current">현재 상품</Link><Link href="/products?scope=historical&lifecycle=operating">운용 중</Link><Link href="/products?scope=historical">과거 공모 이력</Link></div></PageContainer></section>
  <section id="upcoming-demo" className="home-section demo-showcase"><PageContainer><div className="section-heading-art"><div><p className="section-kicker">UPCOMING DEMO EXAMPLES</p><h2>곧 청약 예정 · 판단 등급별 예시</h2><p>현재 판단 체계는 4단계이므로 각 등급에 해당하는 DEMO 작품을 한 개씩 보여줍니다. 실제 청약 상품이 아닙니다.</p></div><Link href="/products?scope=current&currentStatus=upcoming">청약 예정 예시 전체 보기 →</Link></div><div className="demo-grade-legend" aria-label="판단 등급"><span>해볼 만함</span><span>조건부 해볼 만함</span><span>주의</span><span>위험</span></div><div className="product-grid-art">{demoUpcoming.map(product=><ProductCard key={product.offering.id} product={product}/>)}</div></PageContainer></section>
  <section className="home-section soft"><PageContainer><div className="section-heading-art"><div><p className="section-kicker">HISTORICAL RECORDS</p><h2>과거 결과를 상태별로 탐색</h2><p>총 {aggregate.total}건의 과거 기록은 상품 목록에서 검색·필터링할 수 있습니다.</p></div><Link href="/products?scope=historical">과거 이력 전체 보기 →</Link></div><div className="four-lenses">{lifecycleSummary.map(([label,count,lifecycle],index)=><Link href={`/products?scope=historical&lifecycle=${lifecycle}`} key={label}><span>{String(index+1).padStart(2,"0")}</span><h3>{label}</h3><p>{count}건 · 상세와 원문 근거 보기</p></Link>)}</div></PageContainer></section>
  <section className="principles"><PageContainer><h2>서비스 원칙</h2><div><p>원문과 저장본의 기준일을 함께 표시합니다.</p><p>플랫폼 기재값과 DAKER 계산값을 섞지 않습니다.</p><p>자료가 없으면 0으로 대체하지 않습니다.</p></div></PageContainer></section>
 </main>;
}
