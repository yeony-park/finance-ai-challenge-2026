import http.client,json,sys,tempfile,threading,unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));import server
class R:
 def __init__(self,b,status=200):self.b=b;self.status=status
 def read(self,*_):return self.b
 def __enter__(self):return self
 def __exit__(self,*x):return False
CSV=('preamble\n"NO",시군구,유형,지번,도로명,용도지역,건축물주용도,도로조건,전용/연면적(㎡),대지면적(㎡),거래금액(만원),층,매수,매도,계약년월,계약일,지분구분,건축년도,해제사유발생일,거래유형,중개사소재지\n1,대전 유성구 궁동,일반,4**,길,제2종일반주거,제2종근린생활,,500,200,"1,000",1,,,202601,2,,2000,,직거래,\n2,대전 유성구 궁동,일반,4**,길,제2종일반주거,제2종근린생활,,500,200,"1,000",1,,,202601,2,,2000,2026-02-01,직거래,\n').encode('cp949')
class T(unittest.TestCase):
 def test_rtms_missing_header_rejected(self):
  with self.assertRaises(server.SourceError):server.normalise_rtms(b'NO,\xea\xb3\x84\xec\x95\xbd\xec\x9d\xbc\n')
 def test_rtms_blank_amount_rejected(self):
  bad=CSV.replace(b'"1,000"',b'')
  with self.assertRaises(server.SourceError):server.normalise_rtms(bad)
 def test_sou_bad_numeric_rejected(self):
  def bad(req,timeout):return R(b'{"name":"x"}')
  with self.assertRaises(server.SourceError):server.SouAdapter(opener=bad).fetch()
 def test_configured_missing_product_falls_back(self):
  c=server.CatalogService(product_config={"id":"missing","legal_dong":"x","zoning_confirmed":False,"snapshot_key":"rtms_daejeon_gungdong","status":"x","status_detail":"x",**server.SOU_DEFAULT})
  self.assertIn("구성 상품 미존재",c.catalog()["live_status"]["message"])
 def test_optional_sou_ids_do_not_fallback_to_product13(self):
  adapter=server.SouAdapter(product_id=99,expected_name="예정",expected_address="주소")
  self.assertNotIn("product/13",[path for path in adapter.paths if path])
  self.assertIsNone(adapter.paths[1]);self.assertIsNone(adapter.paths[3])
 def test_sou_status_lists_only_requested_endpoints(self):
  cfg=json.loads(json.dumps(next(x for x in server.load_property_configs() if x['id']=='sou-product-13')));cfg['notice_id']=None;cfg['offering_announcement_id']=None
  def open(req,timeout):
   if req.full_url.endswith('product/13'):return R(b'{"name":"\xeb\x8c\x80\xec\xa0\x84 \xed\x95\x98\xeb\x82\x98 \xec\x8a\xa4\xed\x83\x80\xed\x8a\xb8\xec\x97\x85\xed\x8c\x8c\xed\x81\xac","address":"\xeb\x8c\x80\xec\xa0\x84 \xec\x9c\xa0\xec\x84\xb1\xea\xb5\xac \xea\xb6\x81\xeb\x8f\x99 429-8","site_area":208,"total_floor_area":323,"floor_area_ratio":155,"building_coverage":56,"completion_date":"1998-07-13"}')
   if req.full_url.endswith('announcements'):return R(b'[]')
   return R(b'[]')
  class Bad:
   def fetch(self):raise server.SourceError('x')
   def refresh(self):raise server.SourceError('x')
   def verify_receipts(self,_):raise server.SourceError('x')
   def recent_issuer_status(self,*_):raise server.SourceError('x')
  adapter=server.SouAdapter(product_id=13,expected_name=cfg['expected_name'],expected_address=cfg['expected_address'],opener=open)
  pipe={'sou':adapter,'rtms':Bad(),'commercial':Bad(),'land':Bad(),'building':Bad(),'vworld':[Bad()]}
  cat=server.CatalogService(product_configs=[cfg],pipelines={cfg['id']:pipe},dart=Bad()).catalog();message=cat['api_status']['products'][cfg['id']]['sou']['message']
  self.assertIn('상품',message);self.assertIn('발표 목록',message);self.assertIn('매각완료 목록',message);self.assertNotIn('공지',message);self.assertNotIn('공모',message)
 def test_rtms_redirect_rejected(self):
  class X(R):
   def geturl(self):return 'http://bad.example/pt/xls/xls.do'
  with self.assertRaises(server.SourceError):server.RtmsDownloadAdapter(lambda req,timeout:X(b'ok'),lambda _:None)._one_year(2026,__import__('datetime').date(2026,8,8))
 def test_invalid_calendar_rejected(self):
  with self.assertRaises(server.SourceError):server.normalise_rtms(CSV.replace(b'202601',b'202699'))
 def test_second_region_query(self):
  region={"sido":"11000","sgg":"11680","emd":"10300","sidoNm":"서울특별시","sggNm":"강남구","emdNm":"역삼동"};a=server.RtmsDownloadAdapter(region=region,transport=lambda req,timeout:R(CSV if req.data else b'ok'),sleeper=lambda _:None);self.assertEqual(a.region['emdNm'],'역삼동')
 def test_region_mismatch_fallback(self):
  bad=type('Bad',(),{'refresh':lambda s:(_ for _ in ()).throw(server.SourceError('x')),'fetch':lambda s:(_ for _ in ()).throw(server.SourceError('x')),'verify_receipts':lambda s,_:(_ for _ in ()).throw(server.SourceError('x')),'recent_issuer_status':lambda s:(_ for _ in ()).throw(server.SourceError('x'))})()
  c=server.CatalogService(rtms=server.RtmsDownloadAdapter(region={"sido":"1","sgg":"2","emd":"3","sidoNm":"x","sggNm":"x","emdNm":"다름"},transport=lambda req,timeout:R(b'ok'),sleeper=lambda _:None),commercial=bad,land=bad,building=bad,vworld=bad,dart=bad);self.assertEqual(c.catalog()['api_status']['products']['sou-product-13']['commercial_rtms']['mode'],'verified_snapshot')
 def test_sou_top_level_list_rejected(self):
  with self.assertRaises(server.SourceError):server.SouAdapter(opener=lambda req,timeout:R(b'[]')).fetch()
 def test_announcement_bad_calendar_rejected(self):
  bad=b'[{"id":1,"created_at":"2026-99-99T00:00:00Z"}]'
  with self.assertRaises(server.SourceError):server.SouAdapter(opener=lambda req,timeout:R(bad)).fetch()
 def test_normalize_cancel_dedup_analysis(self):
  raw=server.normalise_rtms(CSV);self.assertEqual(raw[0]['amount'],10000000);self.assertIsNone(raw[0]['cancelled_at']);self.assertEqual(len(server.clean_trades(raw[:1])),1);self.assertEqual(len(server.clean_trades(raw)),0)
  rows=[{**raw[0],"cancelled_at":None,"share":False} for _ in range(5)];[r.update({"date":f"2026-01-0{i+1}","amount":10000000+i}) for i,r in enumerate(rows)]
  a=server.analyse_trades(rows,{"legal_dong":"궁동","site_area_m2":200,"gross_floor_area_m2":500,"zoning":"제2종일반주거","zoning_confirmed":True,"use":"제2종근린생활","use_confirmed":True,"offering":{"land":50000,"gross":20000}});self.assertEqual(a['strict_count'],5);self.assertEqual(a['strength'],'낮음')
 def test_sou_merge(self):
  def open(req,timeout):
   u=req.full_url
   if u.endswith('product/13'):return R('{"name":"대전 하나 스타트업파크","address":"대전 유성구 궁동 429-8","site_area":208,"total_floor_area":323,"floor_area_ratio":155,"building_coverage":56,"completion_date":"1998-07-13"}'.encode())
   if u.endswith('146'):return R(' {"title":"n","contents":"2026년 3월 9일 예비인가 거래 서비스"}'.encode())
   if u.endswith('209'):return R(b'{"announcement_type_id":2,"title":"\uacf5\ubaa8 \uccad\uc57d \uc548\ub0b4","contents":"\ub300\uc804 \ud558\ub098 \uc2a4\ud0c0\ud2b8\uc5c5\ud30c\ud06c","created_at":"2025-02-28T06:09:19.000Z","attachments":[{"name":"\uc99d\uad8c\uc2e0\uace0\uc11c","path":"static/product-announcement/11111111-1111-1111-1111-111111111111"},{"name":"\uac10\uc815\ud3c9\uac00\uc11c","path":"static/product-announcement/22222222-2222-2222-2222-222222222222"}]}')
   if u.endswith('sell-completed'):return R(b'[{"id":4,"name":"sold"}]')
   return R(b'[{"id":1,"created_at":"2026-01-01T00:00:00Z"}]')
  bad=type('Bad',(),{'refresh':lambda s:(_ for _ in ()).throw(server.SourceError()),'fetch':lambda s:(_ for _ in ()).throw(server.SourceError()),'verify_receipts':lambda s,_:(_ for _ in ()).throw(server.SourceError()),'recent_issuer_status':lambda s:(_ for _ in ()).throw(server.SourceError())})()
  service=server.CatalogService(server.SouAdapter(opener=open),type('X',(),{'refresh':lambda s:(_ for _ in ()).throw(server.SourceError())})(),commercial=bad,land=bad,building=bad,vworld=bad,dart=bad);cat=service.catalog();p=cat['products'][0];self.assertEqual(p['asset']['site_area_m2'],208);self.assertIn('asset.site_area_m2',p['field_provenance']);self.assertIn('SOU 원문 반영',cat['live_status']['message'])
 def test_rtms_form_and_guards(self):
  calls=[]
  def tr(req,timeout):calls.append(req);return R(CSV if req.data else b'ok')
  server.RtmsDownloadAdapter(tr,lambda _:None)._one_year(2026,__import__('datetime').date(2026,8,8));form=next(x.data for x in calls if x.data);self.assertIn(b'srhThingNo=F',form);self.assertIn(b'srhDelngSecd=1',form);self.assertIn(b'srhFromDt=2026-01-01',form);self.assertIn(b'srhToDt=2026-08-08',form)
  with self.assertRaises(server.SourceError):server.normalise_rtms(b'<html>bad')
  empty=('"NO",시군구,유형,지번,도로명,용도지역,건축물주용도,도로조건,전용/연면적(㎡),대지면적(㎡),거래금액(만원),층,매수,매도,계약년월,계약일,지분구분,건축년도,해제사유발생일,거래유형,중개사소재지\n').encode('cp949');self.assertEqual(server.normalise_rtms(empty),[])
 def test_static_allowlist(self):
  httpd=ThreadingHTTPServer(('127.0.0.1',0),server.Handler);threading.Thread(target=httpd.serve_forever,daemon=True).start()
  try:
   for path,expected in [('/index.html',200),('/styles.css',200),('/js/app.js',200),('/js/track-records.js',200),('/data/products.json',200),('/data/issuers.json',200),('/data/artnguide_track_records.json',200),('/data/weshareart_research.json',200),('/data/tessa_sale_records.json',200),('/server.py',404),('/data/source_snapshots.json',404),('/data/artnguide_due_diligence.json',404),('/data/artnguide_evidence_sources.json',404),('/deliverables/artnguide_artwork_track_records_2026-08-10.md',404),('/deliverables/artnguide_due_diligence_evidence_2026-08-10.md',404),('/tests',404),('/js/../server.py',404)]:
    c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET',path);response=c.getresponse();self.assertEqual(response.status,expected);response.read();c.close()
   for path,count_path,expected in [('/api/track-records/artnguide',('dataset','record_count'),187),('/api/research/weshareart',('dataset','record_count'),145),('/api/track-records/tessa',('dataset','record_count'),6)]:
    c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET',path);response=c.getresponse();self.assertEqual(response.status,200);self.assertEqual(response.getheader('Cache-Control'),'no-store');body=json.loads(response.read());self.assertEqual(body[count_path[0]][count_path[1]],expected)
   with patch.object(server.SERVICE,'catalog',side_effect=RuntimeError('offline')):
    c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET','/api/catalog');self.assertEqual(c.getresponse().status,503)
   with patch.object(Path,'is_symlink',return_value=True):
    c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET','/styles.css');self.assertEqual(c.getresponse().status,404)
  finally:httpd.shutdown();httpd.server_close()
 def test_artnguide_fixed_reader_rejects_file_and_parent_symlinks(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'data').mkdir();(root/'outside.json').write_text('{"outside": true}',encoding='utf-8')
   (root/'data'/'artnguide.json').write_text('{"ok": true}',encoding='utf-8')
   with patch.object(server,'ROOT',root):
    self.assertEqual(server.read_fixed_json(Path('data/artnguide.json')),{"ok":True})
    (root/'data'/'file-link.json').symlink_to(root/'outside.json')
    with self.assertRaises(OSError):server.read_fixed_json(Path('data/file-link.json'))
    (root/'linked-data').symlink_to(root/'data',target_is_directory=True)
    with self.assertRaises(OSError):server.read_fixed_json(Path('linked-data/artnguide.json'))
 def test_artnguide_endpoint_head_contract_and_symlink_rejection(self):
  httpd=ThreadingHTTPServer(('127.0.0.1',0),server.Handler);threading.Thread(target=httpd.serve_forever,daemon=True).start()
  try:
   c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET','/api/track-records/artnguide');response=c.getresponse();body=response.read();self.assertEqual(response.status,200);self.assertEqual(response.getheader('Content-Type'),'application/json; charset=utf-8');self.assertEqual(response.getheader('Cache-Control'),'no-store');self.assertGreater(len(body),0)
   c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('HEAD','/api/track-records/artnguide');response=c.getresponse();self.assertEqual(response.status,200);self.assertEqual(response.getheader('Content-Type'),'application/json; charset=utf-8');self.assertEqual(response.getheader('Cache-Control'),'no-store');self.assertEqual(response.getheader('Content-Length'),str(len(body)));self.assertEqual(response.read(),b'')
   with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);(root/'data').mkdir();(root/'outside.json').write_bytes(body);(root/'data'/'artnguide_track_records.json').symlink_to(root/'outside.json')
    with patch.object(server,'ROOT',root),patch.object(server,'ARTNGUIDE_TRACK_RECORDS_PATH',Path('data/artnguide_track_records.json')):
     c=http.client.HTTPConnection('127.0.0.1',httpd.server_port);c.request('GET','/api/track-records/artnguide');self.assertEqual(c.getresponse().status,503)
  finally:httpd.shutdown();httpd.server_close()
 def test_official_client_single_escaping_and_redirect_rejection(self):
  calls=[]
  def good(req,timeout):calls.append(req);return R(b'{"header":{"resultCode":"00"}}')
  with patch.object(server,'api_key',return_value='x%2Fy'):
   body=server.OfficialClient('apis.data.go.kr',('/fixed',),'BUILDING_API_KEY',good).get('/fixed',{'a':'b'})
  self.assertEqual(server._json_response(body)['header']['resultCode'],'00');self.assertIn('serviceKey=x%2Fy',calls[0].full_url);self.assertNotIn('%252F',calls[0].full_url)
  class Redirect(R):
   def geturl(self):return 'https://wrong.example/fixed'
  with patch.object(server,'api_key',return_value='test'):
   with self.assertRaises(server.SourceError):server.OfficialClient('apis.data.go.kr',('/fixed',),'BUILDING_API_KEY',lambda req,timeout:Redirect(b'{}')).get('/fixed',{})
 def test_official_oversize_auth_and_schema_rejected(self):
  with patch.object(server,'api_key',return_value='test'):
   with self.assertRaises(server.SourceError):server.OfficialClient('api.vworld.kr',('/fixed',),'VWORLD_API_KEY',lambda req,timeout:R(b'x'*101)).get('/fixed',{},100)
  with self.assertRaises(server.SourceError):server._json_response(b'{"header":{"resultCode":"30"}}')
  self.assertEqual(server._vworld_rows({'response':{'result':{'items':{'field':[{'pnu':'other'}]}}}},'target'),[])
 def test_building_success_and_exact_parcel_mismatch(self):
  good=json.dumps({'header':{'resultCode':'00'},'body':{'totalCount':1,'items':{'item':[{'platPlc':'대전광역시 유성구 궁동 429-8번지','newPlatPlc':'대전광역시 유성구 대학로179번길 15-10 (궁동)','platArea':'207.4','totArea':'323.46','useAprDay':'19980713','mainPurpsCdNm':'제2종근린생활시설','vlRat':'155.96','bcRat':'56.93'}]}}}).encode()
  with patch.object(server,'api_key',return_value='test'):
   out=server.BuildingHubAdapter({'sigungu_code':'30200','bjdong_code':'12200','legal_dong':'궁동','bun':'0429','ji':'0008'},lambda req,timeout:R(good)).fetch()
  self.assertTrue(out['exists']);self.assertEqual(out['site_area_m2'],207.4)
  bad=good.replace('429-8'.encode(),'430-8'.encode())
  with patch.object(server,'api_key',return_value='test'):
   with self.assertRaises(server.SourceError):server.BuildingHubAdapter({'sigungu_code':'30200','bjdong_code':'12200','legal_dong':'궁동','bun':'0429','ji':'0008'},lambda req,timeout:R(bad)).fetch()
  no_sub=json.dumps({'header':{'resultCode':'00'},'body':{'totalCount':1,'items':{'item':[{'platPlc':'경기도 수원시 팔달구 북수동 230번지','platArea':'332','totArea':'996.53','useAprDay':'19880729','mainPurpsCdNm':'제1종근린생활시설'}]}}}).encode()
  with patch.object(server,'api_key',return_value='test'):
   self.assertEqual(server.BuildingHubAdapter({'sigungu_code':'41115','bjdong_code':'12900','legal_dong':'북수동','bun':'0230','ji':'0000'},lambda req,timeout:R(no_sub)).fetch()['site_area_m2'],332)
 def test_partial_official_outage_isolated(self):
  class GoodCommercial:
   def refresh(self):return {'rows':[],'fetched_at':'2026-08-08T00:00:00+09:00','sha256':'0','source':'https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade','query':{},'window':{'from':'202509','to':'202608'}}
  class Bad:
   def fetch(self):raise server.SourceError('x')
   def refresh(self):raise server.SourceError('x')
   def verify_receipts(self,_):raise server.SourceError('x')
   def recent_issuer_status(self):raise server.SourceError('x')
  def open(req,timeout):
   u=req.full_url
   if u.endswith('product/13'):return R('{"name":"대전 하나 스타트업파크","address":"대전 유성구 궁동 429-8","site_area":208,"total_floor_area":323,"floor_area_ratio":155,"building_coverage":56,"completion_date":"1998-07-13"}'.encode())
   if u.endswith('146'):return R(' {"title":"n","contents":"2026년 3월 9일 예비인가 거래 서비스"}'.encode())
   if u.endswith('209'):return R(b'{"announcement_type_id":2,"title":"\uacf5\ubaa8 \uccad\uc57d \uc548\ub0b4","contents":"\ub300\uc804 \ud558\ub098 \uc2a4\ud0c0\ud2b8\uc5c5\ud30c\ud06c","created_at":"2025-02-28T06:09:19.000Z","attachments":[{"name":"\uc99d\uad8c\uc2e0\uace0\uc11c","path":"static/product-announcement/11111111-1111-1111-1111-111111111111"},{"name":"\uac10\uc815\ud3c9\uac00\uc11c","path":"static/product-announcement/22222222-2222-2222-2222-222222222222"}]}')
   if u.endswith('sell-completed'):return R(b'[{"id":4,"name":"sold"}]')
   return R(b'[{"id":1,"created_at":"2026-01-01T00:00:00Z"}]')
  c=server.CatalogService(sou=server.SouAdapter(opener=open),commercial=GoodCommercial(),land=Bad(),building=Bad(),vworld=Bad(),dart=Bad());cat=c.catalog();status=cat['api_status']['products']['sou-product-13'];self.assertEqual(status['commercial_rtms']['mode'],'official_live');self.assertEqual(status['building']['mode'],'unavailable');self.assertEqual(status['land_rtms']['mode'],'unavailable')
 def test_land_rtms_filters_to_legal_dong(self):
  item=lambda dong:{'dealYear':'2026','dealMonth':'8','dealDay':'1','dealAmount':'10,000','dealArea':'207.4','umdNm':dong,'jibun':'1'}
  payload=json.dumps({'response':{'header':{'resultCode':'000'},'body':{'items':{'item':[item('궁동'),item('다른동')]}}}}).encode()
  with patch.object(server,'api_key',return_value='test'):
   out=server.LandRtmsAdapter('30200','궁동',207.4,lambda req,timeout:R(payload)).refresh(__import__('datetime').date(2026,8,8))
  self.assertEqual(out['district_count'],24);self.assertEqual(len(out['rows']),12);self.assertTrue(all(x['legal_dong']=='궁동' for x in out['rows']));self.assertEqual(out['area_context_count'],12)
 def test_dart_missing_receipt_is_not_auth_failure(self):
  missing=b'<result><status>013</status></result>';auth=b'<result><status>010</status></result>'
  with patch.object(server,'api_key',return_value='test'):
   out=server.DartAdapter(lambda req,timeout:R(missing)).verify_receipts(['20251022100010']);self.assertFalse(out['receipts'][0]['original_document_received'])
   with self.assertRaises(server.SourceError):server.DartAdapter(lambda req,timeout:R(auth)).verify_receipts(['20251022100010'])
 def test_vworld_multiple_land_uses_and_data_go_auth_envelope(self):
  pnu='3020012200104290008'
  price=json.dumps({'indvdLandPrices':{'field':[{'pnu':pnu,'stdrYear':'2026','pblntfDe':'2026-04-30','pblntfPclnd':'1771000','lastUpdtDt':'2026-05-21'}]}}).encode()
  characteristics=json.dumps({'landCharacteristics':{'field':[{'pnu':pnu,'lndcgrCodeNm':'대','prposArea1Nm':'제2종일반주거지역','ladUseSittnNm':'단독'}]}}).encode()
  uses=json.dumps({'landUses':{'field':[{'pnu':pnu,'prposAreaDstrcCodeNm':'제1구역','lastUpdtDt':'2026-01-01'},{'pnu':pnu,'prposAreaDstrcCodeNm':'제2구역','lastUpdtDt':'2026-02-01'}]}}).encode()
  def tr(req,timeout):
   return R(price if req.full_url.split('?')[0].endswith('getIndvdLandPriceAttr') else characteristics if req.full_url.split('?')[0].endswith('getLandCharacteristics') else uses)
  with patch.object(server,'api_key',return_value='test'):
   out=server.VWorldAdapter(pnu,tr).fetch()
  self.assertEqual([x['name'] for x in out['land_use']],['제1구역','제2구역']);self.assertEqual(out['characteristics']['ladUseSittnNm'],'단독');self.assertTrue(out['characteristics_source_url'].endswith('/getLandCharacteristics'))
  with self.assertRaises(server.SourceError):server._json_response(b'{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"returnReasonCode":"30"}}}')
 def test_building_failure_blocks_strict_comparisons_even_with_vworld(self):
  class Fail:
   def fetch(self):raise server.SourceError('x')
   def refresh(self):raise server.SourceError('x')
   def verify_receipts(self,_):raise server.SourceError('x')
   def recent_issuer_status(self):raise server.SourceError('x')
  class Vworld:
   def fetch(self):return {'pnu':'3020012200104290008','fetched_at':'2026-08-08T00:00:00+09:00','official_land_price':{'amount_per_m2':1,'year':2026,'as_of':'2026-04-30','source_url':'https://api.vworld.kr/ned/data/getIndvdLandPriceAttr'},'characteristics':{'prposArea1Nm':'제2종일반주거지역'},'land_use':[],'characteristics_source_url':'https://api.vworld.kr/ned/data/getLandCharacteristics','land_use_source_url':'https://api.vworld.kr/ned/data/getLandUseAttr'}
  class Commercial:
   def refresh(self):
    row={'legal_dong':'궁동','type':'일반','jibun':'4**','road':'길','zoning':'제2종일반주거지역','use':'제2종근린생활시설','gross_area_m2':323.46,'land_area_m2':207.4,'amount':900000000,'floor':'1','buyer':None,'seller':None,'year':'1998','cancelled_at':None,'transaction_type':'직거래','broker':None,'share':False}
    rows=[{**row,'date':f'2026-01-0{i}'} for i in range(1,6)]
    return {'rows':rows,'fetched_at':'2026-08-08T00:00:00+09:00','sha256':'0','source':'https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade','query':{},'window':{'from':'202501','to':'202608'}}
  c=server.CatalogService(sou=Fail(),building=Fail(),vworld=Vworld(),commercial=Commercial(),land=Fail(),dart=Fail());p=c.catalog()['products'][0]
  self.assertEqual(p['real_estate']['live_analysis']['strict_count'],0);self.assertEqual(p['real_estate']['live_analysis']['verdict'],'자료 부족·가격 적정성 판정 보류')
 def test_dart_recent_cache_is_keyed_by_corp_code(self):
  calls=[]
  def tr(req,timeout):
   from urllib.parse import parse_qs,urlparse
   corp=parse_qs(urlparse(req.full_url).query)['corp_code'][0];calls.append(corp);return R(json.dumps({'status':'000','list':[{'rcept_no':'20260101000001','report_nm':corp,'rcept_dt':'20260101'}]}).encode())
  with patch.object(server,'api_key',return_value='test'):
   adapter=server.DartAdapter(tr);a=adapter.recent_issuer_status('11111111',__import__('datetime').date(2026,8,8));b=adapter.recent_issuer_status('22222222',__import__('datetime').date(2026,8,8));again=adapter.recent_issuer_status('11111111',__import__('datetime').date(2026,8,8))
  self.assertEqual(calls,['11111111','22222222']);self.assertEqual(a['corp_code'],'11111111');self.assertEqual(b['corp_code'],'22222222');self.assertEqual(again['corp_code'],'11111111')
 def test_property_registry_validates_identity_pnu_and_product13_regression(self):
  products=server.read_json('data/products.json')['products'];snapshots=server.read_json('data/source_snapshots.json');configs=server.load_property_configs(products,snapshots)
  self.assertEqual([x['id'] for x in configs],['sou-product-13','sou-product-6','sou-product-7']);self.assertEqual(configs[0]['parcels'][0]['pnu'],'3020012200104290008')
  duplicate=json.loads(json.dumps(configs));duplicate[1]['parcels'][0]['pnu']=duplicate[0]['parcels'][0]['pnu']
  with self.assertRaises(ValueError):server.validate_property_configs(duplicate)
  mismatch=json.loads(json.dumps(configs));mismatch[2]['parcels'][0]['bun']='9999'
  with self.assertRaises(ValueError):server.validate_property_configs(mismatch)
 def test_property_pipeline_failure_is_isolated_by_product(self):
  class Bad:
   def fetch(self):raise server.SourceError('x')
   def refresh(self):raise server.SourceError('x')
   def verify_receipts(self,_):raise server.SourceError('x')
   def recent_issuer_status(self):raise server.SourceError('x')
  class Broken:
   def fetch(self):raise RuntimeError('isolated')
  configs=server.load_property_configs();pipes={}
  for cfg in configs:pipes[cfg['id']]={'sou':Bad(),'rtms':Bad(),'commercial':Bad(),'land':Bad(),'building':Bad(),'vworld':[Bad()]}
  pipes['sou-product-13']['sou']=Broken()
  cat=server.CatalogService(product_configs=configs,pipelines=pipes,dart=Bad()).catalog()
  self.assertEqual(cat['api_status']['products']['sou-product-13']['pipeline']['mode'],'unavailable')
  self.assertIn('building',cat['api_status']['products']['sou-product-6']);self.assertNotIn('pipeline',cat['api_status']['products']['sou-product-6'])
  self.assertEqual(next(p for p in cat['products'] if p['id']=='sou-product-7')['name'],'수원행궁 뉴스뮤지엄')
 def test_fully_confirmed_multi_parcel_is_not_blocked_by_parcel_count(self):
  class Bad:
   def fetch(self):raise server.SourceError('x')
   def refresh(self):raise server.SourceError('x')
   def verify_receipts(self,_):raise server.SourceError('x')
   def recent_issuer_status(self):raise server.SourceError('x')
  class Building:
   def fetch(self):return {'exists':True,'address':'전북특별자치도 전주시 완산구 전동 166-3번지','road_address':'전북특별자치도 전주시 완산구 풍남문3길 9-5','site_area_m2':519.0,'gross_floor_area_m2':895.66,'completion_date':'1985-12-09','use':'숙박시설','far_pct':147.7,'bcr_pct':57.4,'fetched_at':'2026-08-08T00:00:00+09:00','source':'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo'}
  class Vworld:
   def __init__(self,pnu):self.pnu=pnu
   def fetch(self):return {'pnu':self.pnu,'fetched_at':'2026-08-08T00:00:00+09:00','official_land_price':{'amount_per_m2':1,'year':2026,'as_of':'2026-04-30','source_url':'https://api.vworld.kr/ned/data/getIndvdLandPriceAttr'},'characteristics':{'prposArea1Nm':'일반상업지역'},'land_use':[],'characteristics_source_url':'https://api.vworld.kr/ned/data/getLandCharacteristics','land_use_source_url':'https://api.vworld.kr/ned/data/getLandUseAttr'}
  class Commercial:
   def refresh(self):
    base={'legal_dong':'전동','type':'일반','jibun':'166-*','road':'풍남문3길','zoning':'일반상업지역','use':'숙박시설','gross_area_m2':895.66,'land_area_m2':519.0,'amount':1470000000,'floor':None,'buyer':None,'seller':None,'year':'1985','cancelled_at':None,'transaction_type':'직거래','broker':None,'share':False}
    rows=[{**base,'date':f'2026-01-0{i}'} for i in range(1,6)]
    return {'rows':rows,'fetched_at':'2026-08-08T00:00:00+09:00','sha256':'0','source':'https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade','query':{},'window':{'from':'202509','to':'202608'}}
  cfg=next(x for x in server.load_property_configs() if x['id']=='sou-product-6');pipe={'sou':Bad(),'rtms':Bad(),'commercial':Commercial(),'land':Bad(),'building':Building(),'vworld':[Vworld(p['pnu']) for p in cfg['parcels']]}
  cat=server.CatalogService(product_configs=[cfg],pipelines={cfg['id']:pipe},dart=Bad()).catalog();status=cat['api_status']['products'][cfg['id']];product=next(p for p in cat['products'] if p['id']==cfg['id'])
  self.assertEqual(status['building']['mode'],'official_live');self.assertEqual(status['vworld']['mode'],'official_live');self.assertEqual(product['real_estate']['live_analysis']['strict_count'],5)
if __name__=='__main__':unittest.main()
