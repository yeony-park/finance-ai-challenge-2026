"""Read-only local server for source-grounded due diligence."""
from __future__ import annotations
import copy,csv,hashlib,http.cookiejar,io,json,math,mimetypes,os,re,statistics,threading,time,unicodedata,zipfile
from datetime import date,datetime,timedelta,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError,URLError
from urllib.parse import unquote,urlencode,urlparse
from urllib.request import HTTPCookieProcessor,HTTPRedirectHandler,Request,build_opener,urlopen
from xml.etree import ElementTree

ROOT=Path(__file__).resolve().parent; KST=timezone(timedelta(hours=9)); SOU_HOST="api.sou.place"; RTMS_HOST="rt.molit.go.kr"
SOU_DEFAULT={"product_id":13,"notice_id":146,"offering_announcement_id":209,"expected_name":"대전 하나 스타트업파크","expected_address":"대전 유성구 궁동 429-8","notice_markers":["2026년 3월 9일","예비인가","거래 서비스"],"announcement_type":2,"announcement_title":"공모 청약 안내","attachment_terms":["증권신고서","감정평가서"]}
class SourceError(RuntimeError): pass
def now_kst(): return datetime.now(KST)
def read_json(path): return json.loads((ROOT/path).read_text(encoding="utf-8"))
ARTNGUIDE_TRACK_RECORDS_PATH=Path("data/artnguide_track_records.json")
WESHAREART_RESEARCH_PATH=Path("data/weshareart_research.json")
TESSA_SALE_RECORDS_PATH=Path("data/tessa_sale_records.json")
def read_fixed_json(path):
    relative=Path(path)
    if relative.is_absolute() or any(part in (".","..") for part in relative.parts): raise ValueError("invalid fixed path")
    root=ROOT.resolve();candidate=root.joinpath(*relative.parts)
    try: candidate.relative_to(root)
    except ValueError as exc: raise ValueError("path outside root") from exc
    current=root
    for part in relative.parts:
        current=current/part
        if current.is_symlink(): raise OSError("symlink path component")
    resolved=candidate.resolve(strict=False)
    try: resolved.relative_to(root)
    except ValueError as exc: raise ValueError("path outside root") from exc
    if not candidate.is_file() or not candidate.stat().st_mode & 0o170000 == 0o100000: raise OSError("not a regular file")
    return json.loads(candidate.read_text(encoding="utf-8"))
def median(values): return statistics.median(values) if values else None
def mad(values):
    m=median(values); return median([abs(x-m) for x in values]) if m is not None else None

class TimedCache:
    def __init__(self): self.value=None;self.fetched_at=None
    def fresh(self,ttl): return self.value is not None and self.fetched_at and time.time()-self.fetched_at<ttl
    def put(self,value): self.value=value;self.fetched_at=time.time();return value

OFFICIAL_ENV_NAMES=("VWORLD_API_KEY","DART_API_KEY","BUILDING_API_KEY","LAND_API_KEY","COMMERCIAL_API_KEY")
MAX_OFFICIAL_RESPONSE=2_000_000
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*_args,**_kwargs): return None

def config_value(name):
    """Read a local configuration value without serialising or logging it."""
    value=os.environ.get(name)
    if value:return value.strip()
    env=ROOT/".env"
    if not env.is_file():return None
    try:
        for line in env.read_text(encoding="utf-8").splitlines():
            key,sep,raw=line.partition("=")
            if sep and key.strip()==name:
                return raw.strip().strip('"').strip("'") or None
    except OSError:return None
    return None
def api_key(name):
    """Return only an allowlisted credential without ever serialising it."""
    return config_value(name) if name in OFFICIAL_ENV_NAMES else None

def _status(response): return getattr(response,"status",getattr(response,"code",None))
def _final_url(response,request_url): return urlparse(getattr(response,"geturl",lambda:request_url)())
def _safe_url(host,path): return f"https://{host}{path}"
def _read_limited(response,limit=MAX_OFFICIAL_RESPONSE):
    body=response.read(limit+1)
    if len(body)>limit:raise SourceError("official response too large")
    return body
def _xml_text(item,*names):
    for name in names:
        node=item.find(f".//{name}")
        if node is not None and node.text is not None:return node.text.strip()
    return None
def _field(item,*names):
    if isinstance(item,dict):return _dig(item,*names)
    return _xml_text(item,*names)
def _xml_items(body):
    try:root=ElementTree.fromstring(body)
    except ElementTree.ParseError as e:raise SourceError("official XML schema") from e
    code=_xml_text(root,"resultCode","returnReasonCode")
    if code and code not in ("00","000","0"):raise SourceError("official API result")
    return root.findall(".//item")

class OfficialClient:
    """HTTPS-only, path-pinned client for credentialed public APIs."""
    def __init__(self,host,paths,key_name,transport=None):
        self.host=host;self.paths=frozenset(paths);self.key_name=key_name;self.transport=transport
        self.opener=build_opener(NoRedirect()) if transport is None else None
    def get(self,path,params,limit=MAX_OFFICIAL_RESPONSE):
        if path not in self.paths:raise SourceError("official path not allowed")
        key=api_key(self.key_name)
        if not key:raise SourceError(f"{self.key_name} not configured")
        query={**params}
        # Each provider uses a different credential parameter. Keeping it here avoids
        # putting a secret in product data, logs, provenance, or exception text.
        credential="serviceKey" if self.host in ("rt.molit.go.kr","apis.data.go.kr") else "key" if self.host=="api.vworld.kr" else "crtfc_key"
        # data.go.kr keys are often supplied already percent-encoded. Decode once
        # before urlencode so the request carries exactly one layer of escaping.
        query[credential]=unquote(key) if credential=="serviceKey" else key
        request_url=f"https://{self.host}{path}?{urlencode(query)}"
        request=Request(request_url,headers={"Accept":"application/json, application/xml;q=0.9","User-Agent":"DAKER-DD/1.0"})
        try:
            response=self.transport(request,timeout=5) if self.transport else self.opener.open(request,timeout=5)
            with response as r:
                final=_final_url(r,request_url)
                if _status(r)!=200 or (final.scheme,final.hostname,final.path)!=("https",self.host,path):raise SourceError("official HTTP or redirect")
                return _read_limited(r,limit)
        except (URLError,HTTPError,TimeoutError,OSError) as e:raise SourceError("official request failed") from e

class SouAdapter:
    def __init__(self,product_id=None,notice_id=None,offering_announcement_id=None,expected_name=None,expected_address=None,notice_markers=None,announcement_type=None,announcement_title=None,attachment_terms=None,opener:Callable=urlopen):
        if callable(product_id): opener=product_id;product_id=None
        cfg=SOU_DEFAULT;default=product_id is None and notice_id is None and offering_announcement_id is None and expected_name is None and expected_address is None
        self.product_id=cfg["product_id"] if default else product_id;self.notice_id=cfg["notice_id"] if default else notice_id;self.offering_announcement_id=cfg["offering_announcement_id"] if default else offering_announcement_id;self.expected_name=cfg["expected_name"] if default else expected_name;self.expected_address=cfg["expected_address"] if default else expected_address;self.notice_markers=cfg["notice_markers"] if default else (notice_markers or []);self.announcement_type=cfg["announcement_type"] if default else announcement_type;self.announcement_title=cfg["announcement_title"] if default else announcement_title;self.attachment_terms=cfg["attachment_terms"] if default else (attachment_terms or []);self.opener=opener;self.cache=TimedCache()
        product_path=f"/api/v1/public/products/product/{self.product_id}" if self.product_id is not None else None
        self.paths=(product_path,f"/api/v1/public/notices/{self.notice_id}" if self.notice_id is not None else None,f"{product_path}/announcements" if product_path else None,f"/api/v1/public/announcements/announcement/{self.offering_announcement_id}" if self.offering_announcement_id is not None else None,"/api/v1/public/products/sell-completed")
    def fetch(self):
        if self.cache.fresh(86400): return self.cache.value
        payloads={}
        for path in self.paths:
            if path is None:continue
            request_url=f"https://{SOU_HOST}{path}"
            try:
                with self.opener(Request(request_url,headers={"Accept":"application/json","User-Agent":"DAKER-DD/1.0"}),timeout=5) as r:
                    final=urlparse(getattr(r,"geturl",lambda:request_url)())
                    if r.status!=200 or (final.scheme,final.hostname,final.path)!=("https",SOU_HOST,path): raise SourceError("SOU HTTP or redirect")
                    body=r.read(2_000_001)
                    if len(body)>2_000_000: raise SourceError("SOU response too large")
                    value=json.loads(body.decode())
            except (URLError,HTTPError,TimeoutError,OSError,ValueError) as e: raise SourceError(f"SOU fetch failed {path}: {e}") from e
            if path==self.paths[0]:
                numeric=("site_area","total_floor_area","floor_area_ratio","building_coverage");valid=False
                if isinstance(value,dict):
                    try:date.fromisoformat(value.get("completion_date",""));valid=value.get("name")==self.expected_name and value.get("address")==self.expected_address and all(type(value.get(k)) in (int,float) and math.isfinite(value[k]) and value[k]>0 for k in numeric)
                    except (TypeError,ValueError):valid=False
            elif path==self.paths[1]: valid=isinstance(value,dict) and bool(value.get("title")) and isinstance(value.get("contents"),str) and all(marker in value["contents"] for marker in self.notice_markers)
            elif path==self.paths[2]:
                valid=isinstance(value,list)
                if valid:
                    try:
                        for x in value:
                            if not isinstance(x,dict) or type(x.get("id")) is not int:raise ValueError
                            datetime.fromisoformat(x.get("created_at","").replace("Z","+00:00"))
                    except (AttributeError,TypeError,ValueError):valid=False
            elif path==self.paths[3]:
                attachments=value.get("attachments") if isinstance(value,dict) else None
                try:datetime.fromisoformat(value.get("created_at","").replace("Z","+00:00"));timestamp=True
                except (AttributeError,ValueError):timestamp=False
                names=[unicodedata.normalize("NFC",x.get("name","")) for x in attachments or [] if isinstance(x,dict)]
                valid=timestamp and isinstance(value,dict) and value.get("announcement_type_id")==self.announcement_type and value.get("title")==self.announcement_title and self.expected_name in unicodedata.normalize("NFC",value.get("contents","")) and isinstance(attachments,list) and bool(attachments) and all(isinstance(x,dict) and isinstance(x.get("name"),str) and isinstance(x.get("path"),str) and re.match(r"^static/product-announcement/[0-9a-f-]{36}$",x["path"]) for x in attachments) and all(any(unicodedata.normalize("NFC",term) in name for name in names) for term in self.attachment_terms)
            else:valid=isinstance(value,list) and all(isinstance(x,dict) and type(x.get("id")) is int and isinstance(x.get("name"),str) for x in value)
            if not valid: raise SourceError(f"SOU schema {path}")
            payloads[path]=value
        return self.cache.put({"payloads":payloads,"verified_at":now_kst().isoformat()})

RTMS_HEADERS=("시군구","유형","지번","도로명","용도지역","건축물주용도","전용/연면적(㎡)","대지면적(㎡)","거래금액(만원)","계약년월","계약일","층","건축년도","지분구분","해제사유발생일","거래유형","매수","매도","중개사소재지")
def number(value):
    text="" if value is None else str(value).replace(",","").strip()
    if text in ("","-"): return None
    try:
        value=float(text)
        if not math.isfinite(value):raise ValueError
        return value
    except ValueError as e:raise SourceError("RTMS numeric field") from e
def empty(value):
    text="" if value is None else str(value).strip()
    return None if text in ("","-") else text
def normalise_rtms(raw):
    try: text=raw.decode("cp949",errors="strict")
    except UnicodeDecodeError as e: raise SourceError("RTMS CP949 decode") from e
    if "<html" in text[:512].lower() or "<!doctype" in text[:512].lower(): raise SourceError("RTMS HTML error")
    lines=text.splitlines(); header=next((i for i,line in enumerate(lines) if line.lstrip("\ufeff \t").lstrip('"').startswith("NO")),None)
    if header is None: raise SourceError("RTMS header missing")
    reader=csv.DictReader(io.StringIO("\n".join(lines[header:]))); headers=reader.fieldnames or []; rows=list(reader)
    if not all(h in headers for h in RTMS_HEADERS): raise SourceError("RTMS header mismatch")
    out=[]
    for r in rows:
        ym=str(r["계약년월"]).strip();day=str(r["계약일"]).strip().zfill(2)
        try:dt=date(int(ym[:4]),int(ym[4:6]),int(day)).isoformat() if len(ym)==6 else None
        except ValueError as e:raise SourceError("RTMS invalid contract date") from e
        amount=number(r.get("거래금액(만원)"));gross=number(r.get("전용/연면적(㎡)"));land=number(r.get("대지면적(㎡)"));
        if not dt or amount is None or amount<=0 or gross is None or gross<=0 or (land is not None and land<=0):raise SourceError("RTMS malformed row")
        out.append({"date":dt,"legal_dong":r.get("시군구","").split()[-1] if r.get("시군구") else None,"type":empty(r.get("유형")),"jibun":empty(r.get("지번")),"road":empty(r.get("도로명")),"zoning":empty(r.get("용도지역")),"use":empty(r.get("건축물주용도"),),"gross_area_m2":gross,"land_area_m2":land,"amount":amount*10000,"floor":empty(r.get("층")),"buyer":empty(r.get("매수")),"seller":empty(r.get("매도")),"year":empty(r.get("건축년도")),"cancelled_at":empty(r.get("해제사유발생일")),"transaction_type":empty(r.get("거래유형")),"broker":empty(r.get("중개사소재지")),"share":empty(r.get("지분구분")) is not None})
    return out
def cancellation_key(r): return tuple(r.get(k) for k in ("legal_dong","type","jibun","road","zoning","use","gross_area_m2","land_area_m2","amount","floor","date"))
def deal_key(r): return tuple(r.get(k) for k in ("legal_dong","type","jibun","road","zoning","gross_area_m2","land_area_m2","amount","floor","date","transaction_type","buyer","seller","broker"))
def clean_trades(rows):
    cancelled={cancellation_key(r) for r in rows if r.get("cancelled_at")}; kept=[r for r in rows if not r.get("cancelled_at") and cancellation_key(r) not in cancelled and not r.get("share")]
    merged={}
    for r in kept:
        key=deal_key(r); item=merged.setdefault(key,{**r,"building_uses":[]})
        if r.get("use") and r["use"] not in item["building_uses"]: item["building_uses"].append(r["use"])
    return list(merged.values())
def canonical(value): return (value or "").replace("지역","").replace("시설","").strip()
def in_range(value,target,low,high): return value is not None and target and low<=value/target<=high
def analyse_trades(rows,target):
    cleaned=clean_trades(rows); broad=[r for r in cleaned if r.get("legal_dong")==target["legal_dong"] and r.get("type") in ("일반","일반건축물") and r.get("transaction_type") in ("직거래","중개거래",None) and in_range(r.get("land_area_m2"),target["site_area_m2"],.5,2) and in_range(r.get("gross_area_m2"),target["gross_floor_area_m2"],.25,4)]
    strict=[r for r in cleaned if r in broad and target.get("zoning_confirmed") and target.get("use_confirmed") and canonical(r.get("zoning"))==canonical(target.get("zoning")) and canonical(target.get("use")) in [canonical(x) for x in r.get("building_uses",[])] and in_range(r.get("gross_area_m2"),target["gross_floor_area_m2"],.5,2)]
    def enrich(r):
        return {**r,"land_per_m2":r["amount"]/r["land_area_m2"],"gross_per_m2":r["amount"]/r["gross_area_m2"],"source_mode":"공식 사이트 실시간"}
    strict,broad=list(map(enrich,strict)),list(map(enrich,broad)); lm=median([x["land_per_m2"] for x in strict]);gm=median([x["gross_per_m2"] for x in strict]);n=len(strict)
    strength="보류" if n<=4 else "낮음" if n<=9 else "중간"; offer=target["offering"]
    gaps={k:((offer[k]/v)-1)*100 if v else None for k,v in {"land":lm,"gross":gm}.items()}; verdict="자료 부족·가격 적정성 판정 보류" if n<=4 or (gaps["land"] is not None and gaps["gross"] is not None and (gaps["land"]>=20)!=(gaps["gross"]>=20)) else ("가격 주의" if max(gaps.values())>=20 else "참고 비교")
    return {"cleaned":cleaned,"strict_comps":strict,"broad_comps":broad,"strict_count":n,"strength":strength,"strict_medians":{"land_per_m2":lm,"gross_per_m2":gm},"strict_mad":{"land_per_m2":mad([x["land_per_m2"] for x in strict]),"gross_per_m2":mad([x["gross_per_m2"] for x in strict])},"offering_gaps_pct":gaps,"verdict":verdict}

class RtmsDownloadAdapter:
    page_path="/pt/xls/xls.do";download_path="/pt/xls/ptXlsCSVDown.do"
    def __init__(self,region=None,transport=None,sleeper=time.sleep):
        if callable(region): sleeper=transport or sleeper;transport=region;region=None
        self.region=region or {"sido":"30000","sgg":"30200","emd":"12200","sidoNm":"대전광역시","sggNm":"유성구","emdNm":"궁동"};self.transport=transport;self.sleeper=sleeper;self.cache=TimedCache();self.lock=threading.Lock();self.opener=None;self.year_cache={}
    def _open(self,req):
        if self.transport:return self.transport(req,timeout=5)
        if self.opener is None:self.opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        return self.opener.open(req,timeout=5)
    def _request(self,path,data=None):
        if path not in (self.page_path,self.download_path):raise SourceError("RTMS path not allowed")
        headers={"User-Agent":"Mozilla/5.0","Referer":f"https://{RTMS_HOST}{self.page_path}","Accept":"text/csv, text/html"}
        if data:headers["Content-Type"]="application/x-www-form-urlencoded"
        return self._open(Request(f"https://{RTMS_HOST}{path}",data=data,headers=headers,method="POST" if data else "GET"))
    def _one_year(self,year,today=None):
        cached=self.year_cache.get(year);ttl=86400 if year>=now_kst().year-1 else 2592000
        if cached and time.time()-cached[0]<ttl:return cached[1]
        end=(today or now_kst().date()) if year==(today or now_kst().date()).year else date(year,12,31)
        z=self.region;form={"srhThingNo":"F","srhDelngSecd":"1","srhAddrGbn":"1","srhLfstsSecd":"1","srhFromDt":f"{year}-01-01","srhToDt":end.isoformat(),"srhNewRonSecd":"","srhSidoCd":z["sido"],"srhSggCd":z["sgg"],"srhEmdCd":z["emd"],"srhLoadCd":"","srhHsmpCd":"","srhArea":"","srhLrArea":"","srhFromAmount":"","srhToAmount":"","sidoNm":z["sidoNm"],"sggNm":z["sggNm"],"emdNm":z["emdNm"],"loadNm":"","hsmpNm":"","areaNm":"","mobileAt":""};data=urlencode(form).encode();last=None
        for attempt in range(3):
            try:
                self.opener=None
                with self._request(self.page_path) as page:
                    final=urlparse(getattr(page,"geturl",lambda:f"https://{RTMS_HOST}{self.page_path}")())
                    if page.status!=200 or (final.scheme,final.hostname,final.path)!=("https",RTMS_HOST,self.page_path):raise SourceError("RTMS session or redirect")
                with self._request(self.download_path,data) as response:
                    final=urlparse(getattr(response,"geturl",lambda:f"https://{RTMS_HOST}{self.download_path}")())
                    if response.status!=200 or (final.scheme,final.hostname,final.path)!=("https",RTMS_HOST,self.download_path):raise SourceError("RTMS download or redirect")
                    body=response.read(10_000_001)
                    if len(body)>10_000_000:raise SourceError("RTMS response too large")
                    rows=normalise_rtms(body);self.year_cache[year]=(time.time(),rows);return rows
            except (SourceError,URLError,HTTPError,TimeoutError,OSError) as e:
                last=e
                if attempt==0:continue
                if attempt<2:self.sleeper(.2*(2**(attempt-1)))
        raise SourceError("RTMS retry exhausted") from last
    def refresh(self,today=None):
        with self.lock:
            if self.cache.fresh(86400):return self.cache.value
            now=today or now_kst().date();rows=[]
            for y in range(now.year-2,now.year+1):rows+=self._one_year(y,now);self.sleeper(.2)
            return self.cache.put({"rows":rows,"fetched_at":now_kst().isoformat(),"sha256":hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),"source":"https://rt.molit.go.kr/pt/xls/xls.do","query":dict(self.region),"window":{"from":f"{now.year-2}-01-01","to":now.isoformat()}})

RTMS_COMMERCIAL_PATH="/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade"
RTMS_LAND_PATH="/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade"
BUILDING_TITLE_PATH="/1613000/BldRgstHubService/getBrTitleInfo"
VWORLD_PATHS=("/ned/data/getIndvdLandPriceAttr","/ned/data/getLandCharacteristics","/ned/data/getLandUseAttr")
DART_PATHS=("/api/document.xml","/api/corpCode.xml","/api/list.json")

def _clean_api_text(value): return empty(value)
def _api_date(item):
    year=_field(item,"dealYear");month=_field(item,"dealMonth");day=_field(item,"dealDay")
    try:return date(int(year),int(month),int(day)).isoformat()
    except (TypeError,ValueError) as e:raise SourceError("RTMS OpenAPI date") from e
def _api_amount(item):
    value=number(_field(item,"dealAmount"))
    if value is None or value<=0:raise SourceError("RTMS OpenAPI amount")
    return value*10_000
def _openapi_items(body):
    return _as_rows(_json_response(body)) if body.lstrip().startswith(b"{") else _xml_items(body)
def normalise_openapi_commercial(body):
    rows=[]
    for item in _openapi_items(body):
        gross=number(_field(item,"buildingAr","bldgArea","excluUseAr"));land=number(_field(item,"plottageAr","landArea","plottage"))
        if gross is None or gross<=0 or land is None or land<=0:continue
        rows.append({"date":_api_date(item),"legal_dong":_clean_api_text(_field(item,"umdNm","legalDong")),"type":_clean_api_text(_field(item,"buildingType","houseType")),"jibun":_clean_api_text(_field(item,"jibun")),"road":_clean_api_text(_field(item,"roadNm")),"zoning":_clean_api_text(_field(item,"landUse","zoning")),"use":_clean_api_text(_field(item,"buildingUse","bldgUse")),"gross_area_m2":gross,"land_area_m2":land,"amount":_api_amount(item),"floor":_clean_api_text(_field(item,"floor")),"buyer":_clean_api_text(_field(item,"buyerGbn","buyer")),"seller":_clean_api_text(_field(item,"slerGbn","sellerGbn","seller")),"year":_clean_api_text(_field(item,"buildYear")),"cancelled_at":_clean_api_text(_field(item,"cdealDay","cancelDealDay")),"transaction_type":_clean_api_text(_field(item,"dealingGbn","cdealType")),"broker":_clean_api_text(_field(item,"estateAgentSggNm")),"share":_clean_api_text(_field(item,"shareDealingType","dealingGbn"))=="지분"})
    return rows
def normalise_openapi_land(body):
    rows=[]
    for item in _openapi_items(body):
        area=number(_field(item,"dealArea","plottage","landArea"))
        if area is None or area<=0:continue
        rows.append({"date":_api_date(item),"legal_dong":_clean_api_text(_field(item,"umdNm","legalDong")),"jibun":_clean_api_text(_field(item,"jibun")),"area_m2":area,"amount":_api_amount(item),"cancelled_at":_clean_api_text(_field(item,"cdealDay","cancelDealDay")),"transaction_type":_clean_api_text(_field(item,"dealingGbn","cdealType"))})
    return [r for r in rows if not r["cancelled_at"]]

class OpenApiRtmsAdapter:
    """The documented RTMS OpenAPI route, replacing the CSV downloader when keyed."""
    def __init__(self,region=None,transport=None):
        self.region=region or {"lawd_code":"30200","legal_dong":"궁동"};self.client=OfficialClient("apis.data.go.kr",(RTMS_COMMERCIAL_PATH,),"COMMERCIAL_API_KEY",transport);self.cache=TimedCache()
    def refresh(self,today=None):
        if self.cache.fresh(86400):return self.cache.value
        now=today or now_kst().date();months=[]
        for offset in range(12):
            index=now.year*12+now.month-1-offset;months.append(f"{index//12:04d}{index%12+1:02d}")
        rows=[]
        for month in months:
            rows+=normalise_openapi_commercial(self.client.get(RTMS_COMMERCIAL_PATH,{"LAWD_CD":self.region["lawd_code"],"DEAL_YMD":month,"numOfRows":"1000","pageNo":"1","_type":"json"}))
        return self.cache.put({"rows":rows,"fetched_at":now_kst().isoformat(),"sha256":hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),"source":_safe_url("apis.data.go.kr",RTMS_COMMERCIAL_PATH),"query":{"LAWD_CD":self.region["lawd_code"],"months":months},"window":{"from":months[-1],"to":months[0]}})

class LandRtmsAdapter:
    def __init__(self,lawd_code="30200",legal_dong="궁동",target_site_area_m2=None,transport=None):
        self.lawd_code=lawd_code;self.legal_dong=legal_dong;self.target_site_area_m2=target_site_area_m2;self.client=OfficialClient("apis.data.go.kr",(RTMS_LAND_PATH,),"LAND_API_KEY",transport);self.cache=TimedCache()
    def refresh(self,today=None):
        if self.cache.fresh(86400):return self.cache.value
        now=today or now_kst().date();index=now.year*12+now.month-1;months=[f"{(index-i)//12:04d}{(index-i)%12+1:02d}" for i in range(12)];rows=[]
        for month in months:rows+=normalise_openapi_land(self.client.get(RTMS_LAND_PATH,{"LAWD_CD":self.lawd_code,"DEAL_YMD":month,"numOfRows":"1000","pageNo":"1","_type":"json"}))
        district_count=len(rows);rows=[row for row in rows if row.get("legal_dong")==self.legal_dong]
        context_count=sum(1 for row in rows if in_range(row.get("area_m2"),self.target_site_area_m2,.5,2))
        return self.cache.put({"rows":rows,"district_count":district_count,"area_context_count":context_count,"fetched_at":now_kst().isoformat(),"source":_safe_url("apis.data.go.kr",RTMS_LAND_PATH),"query":{"LAWD_CD":self.lawd_code,"legal_dong":self.legal_dong,"months":months}})

def _json_response(body):
    try:value=json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError,json.JSONDecodeError) as e:raise SourceError("official JSON schema") from e
    if not isinstance(value,dict):raise SourceError("official JSON object")
    service_error=value.get("OpenAPI_ServiceResponse")
    if isinstance(service_error,dict):
        message=service_error.get("cmmMsgHeader",{})
        code=str(message.get("returnReasonCode",message.get("errMsg",""))) if isinstance(message,dict) else ""
        if code:raise SourceError("official API result")
    header=value.get("header") or value.get("response",{}).get("header")
    if isinstance(header,dict):
        code=str(header.get("resultCode",header.get("returnReasonCode","")))
        if code and code not in ("00","000","0"):raise SourceError("official API result")
    return value
def _dig(value,*names):
    if not isinstance(value,dict):return None
    for name in names:
        if value.get(name) not in (None,""):return value[name]
    return None
def _as_rows(value):
    if isinstance(value,list):return value
    if isinstance(value,dict):
        for key in ("item","items","field","fields"):
            nested=value.get(key)
            if isinstance(nested,list):return nested
            if isinstance(nested,dict):
                found=_as_rows(nested)
                if found:return found
        for nested in value.values():
            if isinstance(nested,(dict,list)):
                found=_as_rows(nested)
                if found:return found
    return []

class BuildingHubAdapter:
    def __init__(self,parcel,transport=None):
        self.parcel=dict(parcel);self.client=OfficialClient("apis.data.go.kr",(BUILDING_TITLE_PATH,),"BUILDING_API_KEY",transport);self.cache=TimedCache()
    def fetch(self):
        if self.cache.fresh(86400):return self.cache.value
        p=self.parcel;body=self.client.get(BUILDING_TITLE_PATH,{"sigunguCd":p["sigungu_code"],"bjdongCd":p["bjdong_code"],"platGbCd":"0","bun":p["bun"],"ji":p["ji"],"_type":"json"});value=_json_response(body);container=value.get("body") or value.get("response",{}).get("body",{});rows=_as_rows(container)
        if str(container.get("totalCount",""))!="1" or len(rows)!=1 or not isinstance(rows[0],dict):raise SourceError("BuildingHub exact parcel mismatch")
        row=rows[0];address=str(_dig(row,"platPlc") or "")
        number_text=str(int(p["bun"]))+(f"-{int(p['ji'])}" if int(p["ji"]) else "")
        suffix=f"{p['legal_dong']} {number_text}번지"
        if not address.endswith(suffix):raise SourceError("BuildingHub parcel address mismatch")
        required={"site_area_m2":_dig(row,"platArea"),"gross_floor_area_m2":_dig(row,"totArea"),"completion_date":_dig(row,"useAprDay")}
        try:
            required["site_area_m2"]=float(required["site_area_m2"]);required["gross_floor_area_m2"]=float(required["gross_floor_area_m2"]);completion=date.fromisoformat(f"{required['completion_date'][:4]}-{required['completion_date'][4:6]}-{required['completion_date'][6:8]}").isoformat()
            if required["site_area_m2"]<0 or required["gross_floor_area_m2"]<=0:raise ValueError
        except (TypeError,ValueError) as e:raise SourceError("BuildingHub field schema") from e
        return self.cache.put({"exists":True,"address":address,"road_address":_dig(row,"newPlatPlc"),"site_area_m2":required["site_area_m2"],"gross_floor_area_m2":required["gross_floor_area_m2"],"completion_date":completion,"use":_dig(row,"mainPurpsCdNm","etcPurps"),"far_pct":number(_dig(row,"vlRat")),"bcr_pct":number(_dig(row,"bcRat")),"above_ground_floors":_dig(row,"grndFlrCnt"),"below_ground_floors":_dig(row,"ugrndFlrCnt"),"fetched_at":now_kst().isoformat(),"source":_safe_url("apis.data.go.kr",BUILDING_TITLE_PATH)})

def _vworld_rows(value,pnu):
    rows=_as_rows(value)
    exact=[r for r in rows if isinstance(r,dict) and str(_dig(r,"pnu","pnuCd","PNU") or "")==pnu]
    return exact
def _latest_vworld(rows):
    return max(rows,key=lambda r:str(_dig(r,"lastUpdtDt","pblntfDe") or ""))
class VWorldAdapter:
    def __init__(self,pnu,transport=None):
        self.pnu=pnu;self.client=OfficialClient("api.vworld.kr",VWORLD_PATHS,"VWORLD_API_KEY",transport);self.cache=TimedCache()
    def fetch(self):
        if self.cache.fresh(86400):return self.cache.value
        domain=config_value("VWORLD_DOMAIN") or "http://localhost:8000";base={"pnu":self.pnu,"format":"json","numOfRows":"100","pageNo":"1","domain":domain};out={"pnu":self.pnu,"fetched_at":now_kst().isoformat(),"source":_safe_url("api.vworld.kr","/ned/data")}
        current=now_kst().year;price_rows=[]
        for year in (current,current-1):
            price_rows=_vworld_rows(_json_response(self.client.get(VWORLD_PATHS[0],{**base,"stdrYear":str(year)})),self.pnu)
            if price_rows:break
        if not price_rows:raise SourceError("VWorld PNU schema mismatch")
        price=_latest_vworld(price_rows);published=_dig(price,"pblntfDe") or "";year=_dig(price,"stdrYear","pblntfYear","baseYear") or published[:4];amount=number(_dig(price,"pblntfPclnd","indvdLandPrice","price"))
        try:
            year=int(year)
            published=date.fromisoformat(published if "-" in published else f"{published[:4]}-{published[4:6]}-{published[6:8]}").isoformat()
        except (TypeError,ValueError) as e:raise SourceError("VWorld land price year") from e
        if amount is None or amount<=0 or not 1900<=year<=now_kst().year:raise SourceError("VWorld land price schema")
        out["official_land_price"]={"amount_per_m2":amount,"year":year,"as_of":published,"updated_at":_dig(price,"lastUpdtDt"),"source_url":_safe_url("api.vworld.kr",VWORLD_PATHS[0])}
        characteristic_rows=_vworld_rows(_json_response(self.client.get(VWORLD_PATHS[1],{**base,"stdrYear":str(year)})),self.pnu);use_rows=_vworld_rows(_json_response(self.client.get(VWORLD_PATHS[2],base)),self.pnu)
        if not characteristic_rows or not use_rows:raise SourceError("VWorld attributes PNU mismatch")
        characteristics=_latest_vworld(characteristic_rows);use=_latest_vworld(use_rows)
        out["characteristics"]={k:characteristics[k] for k in ("lndcgrCodeNm","lndpclAr","tpgrphHgCodeNm","tpgrphFrmCodeNm","roadSideCodeNm","prposArea1Nm","ladUseSittnNm") if characteristics.get(k) not in (None,"")}
        uses=[];seen=set()
        for row in use_rows:
            name=_dig(row,"prposAreaDstrcCodeNm")
            if name and name not in seen:uses.append({"name":name,"updated_at":_dig(row,"lastUpdtDt")});seen.add(name)
        out["land_use"]=uses
        out["characteristics_source_url"]=_safe_url("api.vworld.kr",VWORLD_PATHS[1]);out["land_use_source_url"]=_safe_url("api.vworld.kr",VWORLD_PATHS[2])
        if not out["characteristics"] and not out["land_use"]:raise SourceError("VWorld attributes schema")
        return self.cache.put(out)

class DartAdapter:
    def __init__(self,transport=None):
        self.client=OfficialClient("opendart.fss.or.kr",DART_PATHS,"DART_API_KEY",transport);self.receipt_caches={};self.corp_caches={}
    def verify_receipts(self,receipt_numbers):
        requested=tuple(sorted(set(receipt_numbers)));cache=self.receipt_caches.setdefault(requested,TimedCache())
        if cache.fresh(86400):return cache.value
        verified=[]
        for receipt in requested:
            if not re.fullmatch(r"\d{14}",receipt):continue
            try:
                body=self.client.get("/api/document.xml",{"rcept_no":receipt})
                if len(body)<4 or body[:2]!=b"PK":
                    try:root=ElementTree.fromstring(body);code=(root.findtext(".//status") or root.findtext(".//resultCode") or "").strip()
                    except ElementTree.ParseError as e:raise SourceError("OpenDART original document schema") from e
                    if code in ("013","014"):
                        verified.append({"receipt_no":receipt,"original_document_received":False,"source_url":f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={receipt}"});continue
                    raise SourceError("OpenDART original document unavailable")
                with zipfile.ZipFile(io.BytesIO(body)) as archive:
                    names=archive.namelist()
                    total=sum(info.file_size for info in archive.infolist())
                    if not names or total>10_000_000 or not any(name.lower().endswith(".xml") for name in names) or any(name.startswith("/") or ".." in Path(name).parts for name in names):raise SourceError("OpenDART archive schema")
                verified.append({"receipt_no":receipt,"original_document_received":True,"source_url":f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={receipt}"})
            except zipfile.BadZipFile as e:raise SourceError("OpenDART original document archive") from e
        return cache.put({"fetched_at":now_kst().isoformat(),"source":_safe_url("opendart.fss.or.kr","/api/document.xml"),"receipts":verified})
    def recent_issuer_status(self,corp_code="01721933",today=None):
        now=(today or now_kst().date());cache=self.corp_caches.setdefault((corp_code,now.isoformat()),TimedCache())
        if cache.fresh(86400):return cache.value
        body=self.client.get("/api/list.json",{"corp_code":corp_code,"bgn_de":(now-timedelta(days=365)).strftime("%Y%m%d"),"end_de":now.strftime("%Y%m%d"),"page_no":"1","page_count":"100"});value=_json_response(body)
        if str(value.get("status","")) not in ("000",""):raise SourceError("OpenDART list result")
        rows=value.get("list")
        if not isinstance(rows,list):raise SourceError("OpenDART list schema")
        filings=[]
        for row in rows:
            if not isinstance(row,dict) or not re.fullmatch(r"\d{14}",str(row.get("rcept_no",""))):raise SourceError("OpenDART filing schema")
            filings.append({"receipt_no":row["rcept_no"],"report_name":_clean_api_text(row.get("report_nm")),"filed_at":_clean_api_text(row.get("rcept_dt")),"source_url":f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={row['rcept_no']}"})
        return cache.put({"mode":"official_live","corp_code":corp_code,"fetched_at":now_kst().isoformat(),"source":_safe_url("opendart.fss.or.kr","/api/list.json"),"filings":filings,"limitation":"최근 공시 존재·정정 여부만 확인했습니다. 원문 표를 자동 파싱·검산하기 전 금액·작품 상태는 저장 수치입니다."})

def validate_property_configs(configs,products=None,snapshots=None):
    if not isinstance(configs,list) or not configs:raise ValueError("property config list")
    seen_ids=set();seen_products=set();seen_pnus=set();validated=[]
    for raw in configs:
        if not isinstance(raw,dict):raise ValueError("property config object")
        cfg=copy.deepcopy(raw);required=("id","product_id","expected_name","expected_address","legal_dong","target_site_area_m2","rtms_region","parcels")
        if any(cfg.get(key) in (None,"") for key in required):raise ValueError("property config required field")
        if cfg["id"] in seen_ids or cfg["product_id"] in seen_products:raise ValueError("duplicate property config")
        seen_ids.add(cfg["id"]);seen_products.add(cfg["product_id"])
        if not isinstance(cfg["parcels"],list) or not cfg["parcels"] or sum(bool(p.get("building_title")) for p in cfg["parcels"])!=1:raise ValueError("property parcels")
        for parcel in cfg["parcels"]:
            pnu=str(parcel.get("pnu",""));parts=(str(parcel.get("sigungu_code","")),str(parcel.get("bjdong_code","")),str(parcel.get("bun","")),str(parcel.get("ji","")))
            if not re.fullmatch(r"\d{19}",pnu) or pnu in seen_pnus:raise ValueError("property PNU")
            if (pnu[:5],pnu[5:10],pnu[11:15],pnu[15:19])!=parts or parcel.get("legal_dong")!=cfg["legal_dong"]:raise ValueError("PNU parcel mismatch")
            if cfg["rtms_region"].get("sgg")!=parts[0] or cfg["rtms_region"].get("emd")!=parts[1]:raise ValueError("PNU region mismatch")
            seen_pnus.add(pnu)
        validated.append(cfg)
    if products is not None:
        real={p["id"]:p for p in products if p.get("category")=="부동산"}
        if set(real)!=seen_ids:raise ValueError("unknown property product")
        for cfg in validated:
            product=real[cfg["id"]]
            if product.get("name")!=cfg["expected_name"] or product.get("asset",{}).get("address")!=cfg["expected_address"]:raise ValueError("property product identity")
            if not math.isclose(float(product["asset"]["site_area_m2"]),float(cfg["target_site_area_m2"]),rel_tol=0,abs_tol=.01):raise ValueError("property product area")
            if cfg.get("snapshot_key") and (snapshots is None or cfg["snapshot_key"] not in snapshots):raise ValueError("unknown property snapshot")
    return validated

def load_property_configs(products=None,snapshots=None):
    value=read_json("data/sou_property_configs.json")
    return validate_property_configs(value.get("properties"),products,snapshots)

def _new_property_pipeline(cfg):
    sou_keys=("product_id","notice_id","offering_announcement_id","expected_name","expected_address","notice_markers","announcement_type","announcement_title","attachment_terms")
    building_parcel=next(p for p in cfg["parcels"] if p.get("building_title"))
    return {"sou":SouAdapter(**{k:cfg.get(k) for k in sou_keys}),"rtms":RtmsDownloadAdapter(region=cfg["rtms_region"]),"commercial":OpenApiRtmsAdapter({"lawd_code":building_parcel["sigungu_code"],"legal_dong":cfg["legal_dong"]}),"land":LandRtmsAdapter(building_parcel["sigungu_code"],cfg["legal_dong"],cfg["target_site_area_m2"]),"building":BuildingHubAdapter(building_parcel),"vworld":[VWorldAdapter(p["pnu"]) for p in cfg["parcels"]]}

class CatalogService:
    def __init__(self,sou=None,rtms=None,product_config=None,commercial=None,land=None,building=None,vworld=None,dart=None,product_configs=None,pipelines=None):
        base_products=read_json("data/products.json")["products"];snapshots=read_json("data/source_snapshots.json")
        registry=load_property_configs(base_products,snapshots)
        injected=any(x is not None for x in (sou,rtms,commercial,land,building,vworld))
        if product_config is not None:
            current=next((x for x in registry if x["id"]==product_config.get("id")),None)
            cfg={**current,**product_config} if current else copy.deepcopy(product_config)
            if "parcel" in cfg and "parcels" not in product_config:cfg["parcels"]=[{**cfg.pop("parcel"),"building_title":True}]
            configs=[cfg]
        elif product_configs is not None:configs=validate_property_configs(product_configs)
        elif injected:configs=[registry[0]]
        else:configs=registry
        self.product_configs=configs;self.product_config=configs[0];self.pipelines={}
        for index,cfg in enumerate(configs):
            if not any(p["id"]==cfg["id"] for p in base_products):continue
            pipe=_new_property_pipeline(cfg)
            if index==0 and injected:
                if sou is not None:pipe["sou"]=sou
                if rtms is not None:pipe["rtms"]=rtms
                if commercial is not None:pipe["commercial"]=commercial
                if land is not None:pipe["land"]=land
                if building is not None:pipe["building"]=building
                if vworld is not None:pipe["vworld"]=vworld if isinstance(vworld,list) else [vworld]
            if pipelines and cfg["id"] in pipelines:pipe.update(pipelines[cfg["id"]])
            self.pipelines[cfg["id"]]=pipe
        first=next(iter(self.pipelines.values()),None);self.sou=first["sou"] if first else None;self.rtms=first["rtms"] if first else None;self.commercial=first["commercial"] if first else None;self.land=first["land"] if first else None;self.building=first["building"] if first else None;self.vworld=first["vworld"][0] if first else None
        self.dart=dart or DartAdapter();self.lock=threading.Lock()
    @staticmethod
    def _status(mode,message,url,as_of=None):return {"mode":mode,"message":message,"url":url,"as_of":as_of or now_kst().isoformat()}
    def _property(self,sou,cfg,pipe,snapshots,statuses):
        api_status={};sou["api_status"]={};adapter=pipe["sou"]
        try:
            result=adapter.fetch();raw=result["payloads"][adapter.paths[0]];verified=result["verified_at"];mapping={"name":"name","address":"asset.address","floor":"asset.floors","site_area":"asset.site_area_m2","total_floor_area":"asset.gross_floor_area_m2","completion_date":"asset.completion_date","floor_area_ratio":"asset.far_pct","building_coverage":"asset.bcr_pct"};sou["field_provenance"]={}
            for source,path in mapping.items():
                if source not in raw:continue
                obj,key=(sou,path) if "." not in path else (sou[path.split(".")[0]],path.split(".")[1]);obj[key]=raw[source];sou["field_provenance"][path]={"mode":"official_live","verified_at":verified,"url":f"https://{SOU_HOST}{adapter.paths[0]}"}
            fetched={f"https://{SOU_HOST}{path}" for path in adapter.paths if path}
            for item in sou["sources"]:
                if item["url"] in fetched:item.update({"label":"공식 사이트 실시간","as_of":verified})
            sou["status"]=cfg["status"];sou["status_detail"]=cfg["status_detail"];sou["source_state"]="공식 사이트 실시간";statuses.append(f"{sou['name']} SOU 원문 반영")
            endpoint_names=("상품","공지","발표 목록","공모","매각완료 목록");present=[name for name,path in zip(endpoint_names,adapter.paths) if path];sold_path=adapter.paths[4] if len(adapter.paths)>4 else None
            if sold_path and sold_path in result["payloads"]:
                sold_ids={x["id"] for x in result["payloads"][sold_path]};sold=cfg["product_id"] in sold_ids;sou["sale_list_check"]={"listed":sold,"checked_at":verified,"source_url":f"https://{SOU_HOST}{sold_path}","limitation":"매각완료 목록 등재 여부는 현재 소유권·운용 지속의 독립 증명이 아닙니다."};suffix=f" ({'등재' if sold else '미등재'})"
            else:suffix=""
            api_status["sou"]=self._status("official_live",f"SOU {'·'.join(present)} 확인{suffix}",f"https://{SOU_HOST}{adapter.paths[0]}",verified)
        except (SourceError,AttributeError,TypeError,ValueError,KeyError):
            sou["source_state"]="공식 자료 저장본";api_status["sou"]=self._status("verified_snapshot","SOU 실시간 확인 실패 · 저장본 표시",f"https://{SOU_HOST}/api/v1/public/products/product/{cfg['product_id']}")
        if cfg.get("snapshot_key"):sou["snapshot"]=snapshots[cfg["snapshot_key"]]
        building_use_confirmed=False
        try:
            b=pipe["building"].fetch();site_match=math.isclose(b["site_area_m2"],sou["asset"]["site_area_m2"],rel_tol=0,abs_tol=.05);gross_match=math.isclose(b["gross_floor_area_m2"],sou["asset"]["gross_floor_area_m2"],rel_tol=0,abs_tol=.05);scope_complete=site_match and gross_match;date_match=b["completion_date"]==sou["asset"].get("completion_date")
            b["scope_complete"]=scope_complete;b["source_conflicts"]=[]
            if not site_match:b["source_conflicts"].append(f"SOU 대지 {sou['asset']['site_area_m2']}㎡ / 건축물대장 표제부 {b['site_area_m2']}㎡")
            if not gross_match:b["source_conflicts"].append(f"SOU 연면적 {sou['asset']['gross_floor_area_m2']}㎡ / 건축물대장 표제부 {b['gross_floor_area_m2']}㎡")
            if not date_match:b["source_conflicts"].append(f"SOU 준공일 {sou['asset'].get('completion_date')} / 건축물대장 사용승인일 {b['completion_date']}")
            b["verdict"]=("주소·대지·연면적이 같은 단일 필지 표제부로 확인됐습니다." if scope_complete else "대상 전체 필지 범위가 건축물대장 표제부 한 건과 일치하지 않아 독립 확인이 미완료입니다.")+" 등기·소유권·담보권은 이 API로 확인하지 않습니다."
            sou["building_verification"]=b;sou["asset"]["use"]=b.get("use") or sou["asset"].get("use");building_use_confirmed=scope_complete and bool(b.get("use"))
            mode="official_live" if scope_complete else "partial";api_status["building"]=self._status(mode,"건축물대장 전체 범위 확인" if scope_complete else "건축물대장 일부 표제부만 확인 · 엄격 비교 차단",b["source"],b["fetched_at"])
        except (SourceError,TypeError,ValueError,KeyError):
            sou["building_verification"]={"verdict":"건축물대장 API 확인 실패 또는 키 미설정 → 실존·소유·권리 독립 확인 미완료","source":_safe_url("apis.data.go.kr",BUILDING_TITLE_PATH),"scope_complete":False};api_status["building"]=self._status("unavailable","건축물대장 실시간 확인 미완료 · 엄격 비교 차단",_safe_url("apis.data.go.kr",BUILDING_TITLE_PATH))
        vworld_results=[];vworld_errors=0
        for vw in pipe["vworld"]:
            try:vworld_results.append(vw.fetch())
            except (SourceError,TypeError,ValueError,KeyError):vworld_errors+=1
        vworld_zoning=None
        if vworld_results:
            primary=vworld_results[0];coverage_complete=not vworld_errors and len(vworld_results)==len(cfg["parcels"]);sou["official_land_price"]={**primary["official_land_price"],"parcel_coverage":f"{len(vworld_results)}/{len(cfg['parcels'])}","coverage_complete":coverage_complete}
            sou["land_attributes"]={"characteristics":primary["characteristics"],"land_use":primary["land_use"],"characteristics_source_url":primary["characteristics_source_url"],"land_use_source_url":primary["land_use_source_url"],"pnu":primary["pnu"],"fetched_at":primary["fetched_at"],"parcel_results":[{"pnu":x["pnu"],"official_land_price":x["official_land_price"],"characteristics":x["characteristics"]} for x in vworld_results],"parcel_coverage":f"{len(vworld_results)}/{len(cfg['parcels'])}","coverage_complete":coverage_complete,"limitation":None if coverage_complete else "전체 필지 중 일부만 VWorld PNU 원문이 반환돼 엄격 가격 비교를 차단했습니다."}
            candidate=primary["characteristics"].get("prposArea1Nm");vworld_zoning=candidate if coverage_complete and all(x["characteristics"].get("prposArea1Nm")==candidate for x in vworld_results) else None
            if vworld_zoning:sou["asset"]["zoning"]=vworld_zoning
            mode="official_live" if coverage_complete else "partial";api_status["vworld"]=self._status(mode,"전체 PNU 토지정보 확인" if coverage_complete else f"VWorld PNU {len(vworld_results)}/{len(cfg['parcels'])}건 확인 · 엄격 비교 차단",_safe_url("api.vworld.kr","/ned/data"),primary["fetched_at"])
        else:api_status["vworld"]=self._status("unavailable","VWorld 개별공시지가·토지속성 실시간 확인 미완료 · 엄격 비교 차단",_safe_url("api.vworld.kr","/ned/data"))
        target={"legal_dong":cfg["legal_dong"],"site_area_m2":sou["asset"]["site_area_m2"],"gross_floor_area_m2":sou["asset"]["gross_floor_area_m2"],"zoning":sou["asset"].get("zoning"),"zoning_confirmed":bool(vworld_zoning),"use":sou["asset"].get("use"),"use_confirmed":building_use_confirmed,"offering":{"land":sou["real_estate"]["offering_units"]["land_per_m2"],"gross":sou["real_estate"]["offering_units"]["gross_per_m2"]}}
        live=None
        try:live=pipe["commercial"].refresh();api_status["commercial_rtms"]=self._status("official_live","상업·업무용 실거래가 OpenAPI 원문 반영",live["source"],live["fetched_at"])
        except (SourceError,TypeError,ValueError,KeyError):
            try:
                if getattr(pipe["rtms"],"region",cfg["rtms_region"]).get("emdNm")!=cfg["legal_dong"]:raise SourceError("RTMS region mismatch")
                live=pipe["rtms"].refresh();api_status["commercial_rtms"]=self._status("fallback_csv","OpenAPI 미완료 · RTMS CSV 원문 반영",live["source"],live["fetched_at"])
            except (SourceError,TypeError,ValueError,KeyError):api_status["commercial_rtms"]=self._status("verified_snapshot" if cfg.get("snapshot_key") else "unavailable","실거래가 실시간 확인 실패"+(" · 검증 저장본만 표시" if cfg.get("snapshot_key") else ""),_safe_url("apis.data.go.kr",RTMS_COMMERCIAL_PATH))
        if live:
            try:
                analysis=analyse_trades(live["rows"],target)
                for kind in ("strict_comps","broad_comps"):
                    for row in analysis[kind]:row["as_of"]=live["fetched_at"]
                sou["real_estate"]["live_analysis"]=analysis;sou["real_estate"]["live_provenance"]={k:live[k] for k in ("fetched_at","source","query","window")};sou["real_estate"]["live_provenance"]["normalized_rows_sha256"]=live["sha256"]
            except (SourceError,TypeError,ValueError,KeyError):pass
        try:
            land=pipe["land"].refresh();dong=cfg["legal_dong"];sou["land_transactions"]={"rows":land["rows"],"district_count":land["district_count"],"area_context_count":land["area_context_count"],"fetched_at":land["fetched_at"],"source":land["source"],"query":land["query"],"limitation":f"{dong} 법정동 거래만 표시합니다. 대상 필지와 정확히 일치하는지 별도 식별이 필요하며 건물 포함 공모가의 판정에는 사용하지 않습니다."};api_status["land_rtms"]=self._status("official_live",f"{dong} 토지 실거래 {len(land['rows'])}건 수신 (시군구 원자료 {land['district_count']}건)",land["source"],land["fetched_at"])
        except (SourceError,TypeError,ValueError,KeyError):api_status["land_rtms"]=self._status("unavailable","토지 실거래 OpenAPI 확인 미완료",_safe_url("apis.data.go.kr",RTMS_LAND_PATH))
        sou["api_status"]=api_status;return api_status
    def catalog(self):
        with self.lock:
            value=copy.deepcopy(read_json("data/products.json"));products=value["products"];issuers=read_json("data/issuers.json");snapshots=read_json("data/source_snapshots.json");statuses=[];api_status={"products":{},"global":{}}
            missing=0
            for cfg in self.product_configs:
                product=next((p for p in products if p["id"]==cfg["id"]),None)
                if product is None:missing+=1;continue
                try:api_status["products"][cfg["id"]]=self._property(product,cfg,self.pipelines[cfg["id"]],snapshots,statuses)
                except Exception:api_status["products"][cfg["id"]]={"pipeline":self._status("unavailable","이 상품의 파이프라인 처리 실패 · 다른 상품과 격리됨",f"https://{SOU_HOST}/api/v1/public/products/product/{cfg['product_id']}")}
            receipt_numbers=[m.group(1) for product in products for source in product.get("sources",[]) if (m:=re.search(r"rcpNo=(\d{14})",source.get("url","")))]
            try:
                dart=self.dart.verify_receipts(receipt_numbers);by_receipt={x["receipt_no"]:x for x in dart["receipts"]}
                for product in products:
                    found=[by_receipt[m.group(1)] for source in product.get("sources",[]) if (m:=re.search(r"rcpNo=(\d{14})",source.get("url",""))) and m.group(1) in by_receipt]
                    if found:product["dart_verification"]={"mode":"official_live","fetched_at":dart["fetched_at"],"receipts":found,"monetary_facts":"저장 수치 : 원문 XML을 자동 추출·검산하기 전에는 기존 수기 정규화 수치를 실시간 사실로 표시하지 않습니다."}
                received=sum(1 for row in dart["receipts"] if row["original_document_received"]);api_status["global"]["dart"]=self._status("official_live",f"OpenDART 원문 {received}/{len(dart['receipts'])}건 수신",_safe_url("opendart.fss.or.kr","/api/document.xml"),dart["fetched_at"])
            except (SourceError,TypeError,ValueError,KeyError):api_status["global"]["dart"]=self._status("unavailable","OpenDART 원문 실시간 확인 미완료",_safe_url("opendart.fss.or.kr","/api/document.xml"))
            try:
                recent=self.dart.recent_issuer_status()
                for product in products:
                    if product.get("issuer")=="투게더아트":product["dart_recent_issuer_status"]=recent
            except (SourceError,TypeError,ValueError,KeyError):pass
            message=f"부동산 {len(self.product_configs)}개 독립 파이프라인 · "+(" · ".join(statuses) if statuses else "저장본")
            if missing:message+=f" · 구성 상품 미존재 {missing}개"
            return {"products":products,"issuers":issuers["issuers"],"live_status":{"message":message},"api_status":api_status}
SERVICE=CatalogService()
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*_):pass
    def _send(self,status,body=b"",ctype="text/plain; charset=utf-8",head=False):
        self.send_response(status);self.send_header("Content-Type",ctype);self.send_header("X-Content-Type-Options","nosniff");self.send_header("Content-Security-Policy","default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'");self.send_header("Cache-Control","no-store" if self.path.startswith("/api/") else "public, max-age=300");self.send_header("Content-Length",str(len(body)));self.end_headers();
        if not head:self.wfile.write(body)
    def do_GET(self):self._route(False)
    def do_HEAD(self):self._route(True)
    def _route(self,head):
        path=urlparse(self.path).path
        if path=="/api/health":return self._send(200,b'{"ok":true}',"application/json; charset=utf-8",head)
        if path=="/api/catalog":
            try:return self._send(200,json.dumps(SERVICE.catalog(),ensure_ascii=False).encode(),"application/json; charset=utf-8",head)
            except Exception:return self._send(503,b'{"error":"catalog unavailable"}',"application/json; charset=utf-8",head)
        if path=="/api/track-records/artnguide":
            try:return self._send(200,json.dumps(read_fixed_json(ARTNGUIDE_TRACK_RECORDS_PATH),ensure_ascii=False).encode(),"application/json; charset=utf-8",head)
            except Exception:return self._send(503,b'{"error":"track records unavailable"}',"application/json; charset=utf-8",head)
        if path=="/api/research/weshareart":
            try:return self._send(200,json.dumps(read_fixed_json(WESHAREART_RESEARCH_PATH),ensure_ascii=False).encode(),"application/json; charset=utf-8",head)
            except Exception:return self._send(503,b'{"error":"weshareart research unavailable"}',"application/json; charset=utf-8",head)
        if path=="/api/track-records/tessa":
            try:return self._send(200,json.dumps(read_fixed_json(TESSA_SALE_RECORDS_PATH),ensure_ascii=False).encode(),"application/json; charset=utf-8",head)
            except Exception:return self._send(503,b'{"error":"tessa sale records unavailable"}',"application/json; charset=utf-8",head)
        if path=="/":path="/index.html"
        allowed=path in {"/index.html","/styles.css","/js/app.js","/js/api.js","/js/calculations.js","/js/track-records.js","/data/products.json","/data/issuers.json","/data/artnguide_track_records.json","/data/weshareart_research.json","/data/tessa_sale_records.json"}
        candidate=ROOT/path.lstrip("/");target=candidate.resolve()
        if not allowed or candidate.is_symlink() or ROOT not in target.parents or not target.is_file():return self._send(404,b"not found",head=head)
        types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8"};return self._send(200,target.read_bytes(),types[target.suffix],head)
    def do_POST(self):self._send(405,b"method not allowed")
    do_PUT=do_POST;do_DELETE=do_POST
def main():ThreadingHTTPServer(("127.0.0.1",8000),Handler).serve_forever()
if __name__=="__main__":main()
