import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  clientAnswerSequence,
  filterTrackRecords,
  normalizeTrackDatasets,
  paginateTrackRecords,
  statusOptions,
} from "../js/track-records.js";

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const artnguide=json("../data/artnguide_track_records.json");
const weshareart=json("../data/weshareart_research.json");
const tessa=json("../data/tessa_sale_records.json");
const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const datasets=normalizeTrackDatasets(artnguide,weshareart,tessa);

assert.equal(datasets.artnguide.length,187);
assert.equal(datasets.weshareart.length,145);
assert.equal(datasets.tessa.length,6);
assert.equal(new Set(datasets.artnguide.map(record=>record.key)).size,187);
assert.equal(new Set(datasets.weshareart.map(record=>record.key)).size,145);
assert.equal(new Set(datasets.tessa.map(record=>record.key)).size,6);

assert.equal(filterTrackRecords(datasets.artnguide,"","TRANSFER").length,138);
assert.equal(filterTrackRecords(datasets.artnguide,"","RETURNED_PRODUCT").length,12);
assert.equal(filterTrackRecords(datasets.artnguide,"","EXPECTED_TRANSFER").length,37);
assert.equal(filterTrackRecords(datasets.weshareart,"","RECRUITED").length,93);
assert.equal(filterTrackRecords(datasets.weshareart,"","DISTRIBUTED").length,52);
assert.equal(filterTrackRecords(datasets.tessa,"","SETTLED").length,6);
assert.ok(filterTrackRecords(datasets.artnguide,"김환기").length>0);
assert.ok(filterTrackRecords(datasets.weshareart,"김환기").length>0);
assert.equal(filterTrackRecords(datasets.tessa,"Marilyn Monroe").length,1);

assert.deepEqual(statusOptions(datasets.tessa),[
  {value:"ALL",label:"전체",count:6},
  {value:"SETTLED",label:"TESSA 공시상 매각·정산",count:6},
]);
assert.equal(statusOptions(datasets.artnguide).find(option=>option.value==="RETURNED_PRODUCT").label,"매각완료 (원코드 RETURNED_PRODUCT)");
assert.deepEqual(paginateTrackRecords(datasets.artnguide,16,12),{
  records:datasets.artnguide.slice(180,187),currentPage:16,totalPages:16,totalRecords:187,
});
assert.equal(paginateTrackRecords(datasets.weshareart,99,12).records.length,1);
assert.equal(paginateTrackRecords([],99,12).currentPage,1);

const id16=datasets.artnguide.find(record=>record.id===16);
assert.equal(id16.profit,0);
assert.equal(id16.yearProfit,0);
assert.equal(id16.annotation.display.profit,"-");
assert.equal(id16.annotation.display.year_profit,"-");
assert.equal(datasets.weshareart.filter(record=>record.statusCode==="RECRUITED"&&record.saleYieldPercent===0).length,93);

const redactedFields=["activityHistory","awardsHistory","displayHistory","imageUrl","information","levelOfEducation","nationality","yearOfBirth","yearOfDeath"];
for(const record of weshareart.track_records.records){
  const artist=record.detail.artwork.artist;
  for(const field of redactedFields)assert.equal(Object.hasOwn(artist,field),false,`removed artist profile field: ${field}`);
}
assert.deepEqual(clientAnswerSequence(weshareart),[2,2,2,2,2,2,1,2,1,2]);
assert.equal(tessa.records.reduce((sum,record)=>sum+record.attachments.length,0),12);
assert.ok(datasets.tessa.every(record=>record.registrationTimestampTimezone==null));
assert.ok(datasets.tessa.every(record=>record.links.every(source=>/^https?:\/\//.test(source.url))));
const liuYe=datasets.tessa.find(record=>record.id==="1006292");
assert.equal(liuYe.sourceReportedReturnPct,2.75);
assert.equal(liuYe.settlement.recipient_fixed_date_label,"지급기준일");
assert.equal(liuYe.settlement.per_unit_label,"1 분할 소유권당 지급액");
assert.equal(liuYe.settlement.per_unit_report_raw,"1,026.205949 원 (세전 금액)");
assert.equal(liuYe.settlement.payment_method_raw,"앱 내 투표/정산 화면을 통한 현금 지급 (예치금에 산입)");
assert.equal(liuYe.sourceReportedReturnRecalculation.arithmetic_display,"2.758521%");
assert.equal(liuYe.sourceReportedReturnRecalculation.rounding_policy,"not_disclosed");
assert.match(app,/function tessaTrackDetail\(record\)/);
assert.match(app,/formatFixedNumber\(settlement\.per_unit_krw,6\)/);
assert.match(app,/제반비용 차감 후/);
assert.match(app,/공시 환율 1/);
for(const disclosureId of ["1068605","1068604","1068603"]){
  const record=datasets.tessa.find(item=>item.id===disclosureId);
  const converted=record.salePrice.net_after_expenses_amount*record.salePrice.conversion_rate_krw_per_currency;
  assert.equal((converted-record.settlement.amount_krw).toFixed(3),"0.977");
}
assert.match(app,/formatFixedNumber\(difference,3\)/);
assert.match(app,/원문 소수점 처리 규칙 미기재/);
assert.match(app,/TESSA 자체 공시에 게시된 값입니다/);
assert.match(app,/회원·투자자 개인정보는 수집·표시하지 않습니다/);
assert.match(app,/암호화되지 않은 HTTP 외부 링크/);
assert.match(app,/법적 발행사 연결은 확인되지 않았으며/);
assert.match(app,/settlement\.recipient_fixed_date_label\|\|"정산대상자 확정일"/);
assert.match(app,/settlement\.per_unit_calculation_raw/);
assert.match(app,/settlement\.payment_method_raw/);
assert.match(app,/기간 전체 세전 수익률이며 연환산 수익률이 아닙니다/);

console.log("PASS: track records");
