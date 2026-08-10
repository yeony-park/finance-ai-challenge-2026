const validCatalog=body=>body&&Array.isArray(body.products)&&Array.isArray(body.issuers);
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
