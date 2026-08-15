const MAFRA_ASF_MAP_URL = "https://www.mafra.go.kr/FMD-AI2/map/ASF/ASF_map.jsp";
const MAFRA_ASF_SNAPSHOT_URL = "https://www.mafra.go.kr/bbs/FMD-AI2/404/577369/artclView.do";

const JEONBUK_ASF_EVENTS = [
  { occurredAt: "2026-02-01", region: "전북 고창군" },
  { occurredAt: "2026-02-12", region: "전북 정읍시" },
];

type PigDiseaseMapProps = {
  productName: string;
  farmName: string;
  farmRegion: string;
};

export function PigDiseaseMap({ productName, farmName, farmRegion }: PigDiseaseMapProps) {
  const shortRegion = farmRegion.replace("전북 ", "");
  const matchingEvents = JEONBUK_ASF_EVENTS.filter((event) => event.region === farmRegion);

  return (
    <section className="content-card pig-disease-map" aria-labelledby="pig-disease-map-title">
      <div className="section-heading pig-disease-map-heading">
        <div>
          <p className="section-label">질병 지역 정보</p>
          <h2 className="type-subtitle" id="pig-disease-map-title">공시 농장 지역에 ASF 발생 이력이 있나요?</h2>
          <p className="section-description">
            {productName}의 공시 농장 지역을 자동 선택해 같은 시·군과 전북의 2026년 공개 발생 이력을 확인했습니다.
          </p>
        </div>
        <span className="sample-badge">공시 지역 자동 선택</span>
      </div>

      <div className="pig-asf-official-map">
        <div className="pig-asf-official-map-heading">
          <div>
            <span>농림축산식품부 공식 지도</span>
            <strong>ASF 발생지역 지도</strong>
          </div>
          <div>
            <span>선택 공시 농장 지역</span>
            <strong>{farmRegion}</strong>
          </div>
        </div>
        <div className="pig-asf-official-map-frame">
          <iframe
            src={MAFRA_ASF_MAP_URL}
            title={`농림축산식품부 ASF 발생지역 지도 · 선택 공시 지역 ${farmRegion}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
        </div>
        <p>
          선택 상품의 공시 농장 지역은 {farmRegion}입니다. 아래에서 같은 시·군과 전북의 공개 발생 지역을 함께 요약합니다.
        </p>
      </div>

      <div className="pig-asf-region-layout">
        <article className="pig-asf-selected-region" aria-label={`${farmRegion} ASF 공개 이력`}>
          <div>
            <span>선택된 공시 농장 지역</span>
            <strong>{farmRegion}</strong>
            <small>{farmName} · DART 공시 기재</small>
          </div>

          <div className="pig-asf-region-result">
            <span>같은 시·군 공개 발생</span>
            <strong>{matchingEvents.length}건</strong>
            <small>2026-03-20 정적 공개본 · 24차 목록 기준</small>
          </div>
        </article>

        <aside className="pig-disease-snapshot" aria-label="전북 ASF 공개 발생 지역">
          <div className="pig-disease-snapshot-heading">
            <span>정적 공개본 · 2026-03-20</span>
            <strong>전북에서 공개된 2026년 발생 지역</strong>
          </div>

          <div className="pig-disease-stat-grid">
            <div>
              <span>선택 지역</span>
              <strong>{shortRegion}</strong>
              <small>공시 농장 소재 시·군</small>
            </div>
            <div>
              <span>전북 공개 지역</span>
              <strong>2곳</strong>
              <small>고창군 · 정읍시</small>
            </div>
          </div>

          <ol className="pig-disease-event-list">
            {JEONBUK_ASF_EVENTS.map((event) => (
              <li key={event.region}>
                <span>{event.occurredAt}</span>
                <strong>{event.region}</strong>
              </li>
            ))}
          </ol>

          <p>
            전북의 공개 발생 지역은 도 단위 맥락입니다. 선택 지역과의 거리나 해당 농장의 감염 여부를 뜻하지 않습니다.
          </p>
          <a href={MAFRA_ASF_SNAPSHOT_URL} target="_blank" rel="noopener noreferrer">
            2026년 ASF 24차 공개본
          </a>
        </aside>
      </div>

      <div className="pig-disease-map-notice">
        <strong>자료 해석</strong>
        <p>
          같은 시·군 공개 발생이 0건이라도 농장 감염이 없거나 안전하다는 뜻은 아닙니다. 공식 자료는 개인정보 보호를 위해
          발생 지역을 읍·면·동·리 단위로 공개하며, 원 지도의 좌표도 관공서 기준이라 실제 발생 농장 위치와 다를 수 있습니다.
        </p>
        <p>
          공시 농장과 질병 사건을 잇는 공공 식별자가 없어 상세 위치, 실제 거리, 감염 여부 또는 손익 영향은 판단하지 않습니다.
        </p>
      </div>

      <div className="pig-disease-map-sources" aria-label="ASF 발생 현황 출처">
        <span>공식 원문</span>
        <a href={MAFRA_ASF_SNAPSHOT_URL} target="_blank" rel="noopener noreferrer">
          2026년 ASF 발생현황 공개본
        </a>
        <a href={MAFRA_ASF_MAP_URL} target="_blank" rel="noopener noreferrer">
          ASF 공식 지도 새 창에서 보기
        </a>
      </div>
    </section>
  );
}
