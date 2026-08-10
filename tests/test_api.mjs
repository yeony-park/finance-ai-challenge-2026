import assert from "node:assert/strict";
import {loadCatalog,loadResearch} from "../js/api.js";

const response=(body,{ok=true,status=200,jsonError=false}={})=>({ok,status,json:async()=>{if(jsonError)throw new SyntaxError("HTML");return body}});
const primary={products:[{id:"live"}],issuers:[{id:"issuer"}],api_status:{products:{},global:{}},live_status:{message:"live"}};
{
 const calls=[];const result=await loadCatalog(async url=>(calls.push(url),response(primary)));
 assert.equal(result.products[0].id,"live");assert.deepEqual(calls,["/api/catalog"]);
}
for(const failed of [response({}, {ok:false,status:404}),response(null,{jsonError:true}),response({products:[],issuers:"bad"})]){
 const calls=[];const queue=[failed,response({products:[{id:"stored"}]}),response({issuers:[{id:"stored-issuer"}]})];
 const result=await loadCatalog(async url=>(calls.push(url),queue.shift()));
 assert.equal(result.products[0].id,"stored");assert.equal(result.issuers[0].id,"stored-issuer");
 assert.equal(result.live_status.message,"Live Server 저장본 · 공식 API 미연결");assert.deepEqual(result.api_status,{products:{},global:{}});
 assert.deepEqual(calls,["/api/catalog","/data/products.json","/data/issuers.json"]);
}
await assert.rejects(()=>loadCatalog(async url=>url==="/api/catalog"?response({}, {ok:false,status:404}):response({}, {ok:false,status:500})),/HTTP 500/);
{
 const fallback=url=>url==="/api/catalog"?new Promise((_,reject)=>setTimeout(()=>reject(new Error("aborted")),1)):response(url.includes("products")?{products:[{id:"stored"}]}:{issuers:[{id:"issuer"}]}),result=await loadCatalog(fallback,{timeoutMs:1});
 assert.equal(result.products[0].id,"stored");
}
const artnguide={dataset:{record_count:1},records:[{id:1}]};
const weshareart={dataset:{record_count:1},track_records:{records:[{list:{goodsId:1}}]},suitability_test:{questions:[{index:1}]}};
const tessa={dataset:{record_count:1,attachment_count:2},records:[{disclosure_id:"1",asset:{artist:"a",title:"b"},disclosure_url:"http://example.com/1",initial_price:{amount_krw:1},sale_price:{amount:1,currency:"KRW"},settlement:{amount_krw:1},attachments:[{url:"https://example.com/a"},{url:"https://example.com/b"}]}]};
{
 const calls=[];const result=await loadResearch(async url=>(calls.push(url),response(url.includes("artnguide")?artnguide:url.includes("tessa")?tessa:weshareart)));
 assert.equal(result.artnguide.records.length,1);assert.equal(result.weshareart.track_records.records.length,1);assert.equal(result.tessa.records.length,1);assert.deepEqual(result.errors,{});
 assert.deepEqual(calls,["/api/track-records/artnguide","/api/research/weshareart","/api/track-records/tessa"]);
}
{
 const calls=[];const fallback=async url=>{calls.push(url);if(url.startsWith("/api/"))return response({}, {ok:false,status:404});return response(url.includes("artnguide")?artnguide:url.includes("tessa")?tessa:weshareart)};
 const result=await loadResearch(fallback);assert.equal(result.weshareart.suitability_test.questions.length,1);assert.equal(result.tessa.records.length,1);
 assert.deepEqual(calls,["/api/track-records/artnguide","/api/research/weshareart","/api/track-records/tessa","/data/artnguide_track_records.json","/data/weshareart_research.json","/data/tessa_sale_records.json"]);
}
{
 const partial=await loadResearch(async url=>url.includes("weshareart")?response({}, {ok:false,status:500}):response(url.includes("artnguide")?artnguide:tessa));
 assert.equal(partial.artnguide.records.length,1);assert.equal(partial.tessa.records.length,1);assert.equal(typeof partial.errors.weshareart,"string");assert.equal(partial.weshareart,undefined);
}
await assert.rejects(()=>loadResearch(async()=>response({}, {ok:false,status:500})),/snapshot HTTP 500/);
console.log("PASS: api fallback");
