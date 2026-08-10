import assert from "node:assert/strict";
import {loadCatalog} from "../js/api.js";

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
console.log("PASS: api fallback");
