import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");const read=(path:string)=>readFileSync(join(root,path),"utf8");

test("기존 미술품 상품 5개를 보존하고 부동산은 신규 adapter에서 제외",()=>{const data=JSON.parse(read("data/products.json")) as {products:Array<{category:string}>};assert.equal(data.products.filter(item=>item.category==="미술품").length,5);assert.equal(data.products.filter(item=>item.category==="부동산").length,3);assert.match(read("lib/art/legacy-adapter.ts"),/filter\(\(product\) => product\.category === "미술품"\)/)});

test("기존 플랫폼 DB 338건과 due-diligence 187건이 adapter에 연결",()=>{const artnguide=JSON.parse(read("data/artnguide_track_records.json")) as {records:unknown[]};const weshare=JSON.parse(read("data/weshareart_research.json")) as {track_records:{records:unknown[]}};const tessa=JSON.parse(read("data/tessa_sale_records.json")) as {records:unknown[]};const due=JSON.parse(read("data/artnguide_due_diligence.json")) as {record_evidence:unknown[];artist_track_records:unknown[]};assert.equal(artnguide.records.length,187);assert.equal(weshare.track_records.records.length,145);assert.equal(tessa.records.length,6);assert.equal(artnguide.records.length+weshare.track_records.records.length+tessa.records.length,338);assert.equal(due.record_evidence.length,187);assert.equal(due.artist_track_records.length,187);const adapter=read("lib/art/legacy-adapter.ts");assert.match(adapter,/status: "unverified"/);assert.match(adapter,/platformId: "platform-arttogether"/);assert.match(adapter,/offeringAmount: null/);assert.match(adapter,/sourcePayload/);assert.match(adapter,/dueDiligencePayload/);assert.match(adapter,/sourceSnapshot/);for(const source of ["products.json","artnguide_track_records.json","weshareart_research.json","tessa_sale_records.json","artnguide_due_diligence.json"])assert.match(adapter,new RegExp(source.replace(".","\\.")))});

test("legacy adapter retains all source datasets for the runtime repository",()=>{const adapter=read("lib/art/legacy-adapter.ts");for(const source of ["products.json","artnguide_track_records.json","weshareart_research.json","tessa_sale_records.json","artnguide_due_diligence.json"])assert.ok(adapter.includes(source));assert.ok(adapter.includes("legacyTrackRecords"));assert.ok(adapter.includes("legacyArtData"));});

test("실데이터는 데모와 다른 badge 및 원본 미저장 placeholder 사용",()=>{assert.match(read("components/art/ui.tsx"),/기존 DB · 공개자료 저장본/);assert.match(read("public/art-placeholder.svg"),/원본 이미지 미저장/);assert.doesNotMatch(read("lib/art/legacy-adapter.ts"),/imageUrl: "\/demo-art\//)});
