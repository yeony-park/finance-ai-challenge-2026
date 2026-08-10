const validCatalog=body=>body&&Array.isArray(body.products)&&Array.isArray(body.issuers);
const validArtNGuide=body=>body?.dataset&&Array.isArray(body.records)&&body.records.length===body.dataset.record_count;
const validWeshareArt=body=>body?.dataset&&Array.isArray(body.track_records?.records)&&Array.isArray(body.suitability_test?.questions);
const validTessa=body=>body?.dataset&&Array.isArray(body.records)&&body.records.length===body.dataset.record_count&&body.records.every(record=>typeof record.disclosure_id==="string"&&record.asset&&typeof record.disclosure_url==="string"&&record.initial_price&&record.sale_price&&record.settlement&&Array.isArray(record.attachments)&&record.attachments.every(item=>typeof item.url==="string"))&&body.records.reduce((sum,record)=>sum+record.attachments.length,0)===body.dataset.attachment_count;
async function json(response,label){if(!response?.ok)throw new Error(`${label} HTTP ${response?.status??"unknown"}`);try{return await response.json()}catch{throw new Error(`${label} JSON`)}}
async function timedFetch(fetcher,url,options,timeoutMs){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetcher(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}}
export async function loadCatalog(fetcher=fetch,{timeoutMs=5000}={}){
 try{
  const body=await json(await timedFetch(fetcher,"/api/catalog",{headers:{Accept:"application/json"}},timeoutMs),"catalog");
  if(!validCatalog(body))throw new Error("catalog schema");
  return body;
 }catch{
  const [productsData,issuersData]=await Promise.all([
   json(await timedFetch(fetcher,"/data/products.json",{headers:{Accept:"application/json"}},timeoutMs),"products"),
   json(await timedFetch(fetcher,"/data/issuers.json",{headers:{Accept:"application/json"}},timeoutMs),"issuers")
  ]);
  if(!Array.isArray(productsData?.products)||!Array.isArray(issuersData?.issuers))throw new Error("static catalog schema");
  return {products:productsData.products,issuers:issuersData.issuers,api_status:{products:{},global:{}},live_status:{message:"Live Server 저장본 · 공식 API 미연결"}};
 }
}

async function loadSnapshot(fetcher,primary,fallback,validator,label,timeoutMs){
 try{
  const body=await json(await timedFetch(fetcher,primary,{headers:{Accept:"application/json"}},timeoutMs),label);
  if(!validator(body))throw new Error(`${label} schema`);
  return body;
 }catch{
  const body=await json(await timedFetch(fetcher,fallback,{headers:{Accept:"application/json"}},timeoutMs),`${label} snapshot`);
  if(!validator(body))throw new Error(`${label} snapshot schema`);
  return body;
 }
}

export async function loadResearch(fetcher=fetch,{timeoutMs=5000}={}){
 const names=["artnguide","weshareart","tessa"],results=await Promise.allSettled([
  loadSnapshot(fetcher,"/api/track-records/artnguide","/data/artnguide_track_records.json",validArtNGuide,"artnguide track records",timeoutMs),
  loadSnapshot(fetcher,"/api/research/weshareart","/data/weshareart_research.json",validWeshareArt,"weshareart research",timeoutMs),
  loadSnapshot(fetcher,"/api/track-records/tessa","/data/tessa_sale_records.json",validTessa,"tessa sale records",timeoutMs)
 ]),output={errors:{}};
 results.forEach((result,index)=>{const name=names[index];if(result.status==="fulfilled")output[name]=result.value;else output.errors[name]=result.reason?.message||"load failed"});
 if(results.every(result=>result.status==="rejected"))throw results[0].reason;
 return output;
}
