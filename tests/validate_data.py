import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def ok(x,m):
 if not x:raise AssertionError(m)
def nullable(value,types):
 return value is None or isinstance(value,types)
products=json.loads((R/'data/products.json').read_text())['products'];p={x['id']:x for x in products};snapshots=json.loads((R/'data/source_snapshots.json').read_text());snap=snapshots['rtms_daejeon_gungdong'];configs=json.loads((R/'data/sou_property_configs.json').read_text())['properties']
issuers=json.loads((R/'data/issuers.json').read_text())['issuers'];issuer_by_id={x['id']:x for x in issuers}
track=json.loads((R/'data/artnguide_track_records.json').read_text());track_records=track['records'];track_fields=tuple(x['name'] for x in track['record_fields'])
evaluation_comment_markers=('원문 연결은 보강이 필요합니다','독립 비교거래 자료가 부족합니다')
ok(sum(x['category']=='부동산' for x in products)>=3 and sum(x['category']=='미술품' for x in products)>=5,'catalog product minimum')
ok({x['id'] for x in configs}=={x['id'] for x in products if x['category']=='부동산'},'property config coverage')
ok(len(snap['rows'])==6 and snap['strict_comparable_rows']==0,'RTMS snapshot scope')
ok(p['sou-product-13']['status'].startswith('거래 중단'),'SOU disabled')
ok(p['sou-product-6']['offering']['units']*p['sou-product-6']['offering']['unit_price']==1470000000,'SOU 6 offering')
ok(p['sou-product-7']['offering']['units']*p['sou-product-7']['offering']['unit_price']==2890000000,'SOU 7 offering')
ok(p['sou-product-6']['offering']['entrusted_benefit_payment']==1400000000 and p['sou-product-7']['offering']['entrusted_benefit_payment']==2790000000,'SOU entrusted benefit payment')
ok(len(configs[1]['parcels'])==2 and configs[1]['target_site_area_m2']==519,'SOU 6 multi parcel')
ok(p['at-chonghyun-009-02']['art_price']['acquisition']+p['at-chonghyun-009-02']['art_price']['issuance_cost']==225000000,'9-2 cost chain')
ok(p['at-kim-whanki-009-01']['art_price']['exact_work_evidence']['row_url'].startswith('https://'),'Kim row evidence')
for art_id in ('at-kusama-001','at-condo-002'):
 art=p[art_id];ok(art['art_price']['acquisition']+art['art_price']['issuance_cost']==art['art_price']['offering'],f'{art_id} cost chain');ok(art['art_price']['independent_comparables']=='insufficient',f'{art_id} evidence warning')
 ok(any('rcpNo=' in s['url'] for s in art['sources']),f'{art_id} DART source')
for product in products:
 ok(product.get('sources') and all(s.get('url','').startswith('https://') and s.get('as_of') for s in product['sources']),f"{product['id']} source metadata")
 for source in product['sources']:
  ok(all(field in source for field in ('id','label','url','as_of','document_name','publisher','collected_at','evidence_grade')),f"{product['id']} source contract")
  ok(all(source[field] is None for field in ('document_name','publisher','collected_at','evidence_grade')),f"{product['id']} source unknown preservation")
 model=product.get('common_model',{});ok(all(field in model for field in ('identification','legal_issuer','service','schedule','investment_terms','lifecycle','status','recovery','review','review_status','evidence','comments','validation','change_history')) and model.get('change_history')==[],f"{product['id']} common model")
 identity=model['identification'];ok(identity['product_name']==product['name'] and identity['asset_category']==product['category'],f"{product['id']} identification")
 ok(all(nullable(identity[field],str) for field in ('legal_issuer_id','legal_issuer_name','service_brand','service_operator','subscription_platform')),f"{product['id']} identification types")
 schedule=model['schedule'];ok(all(nullable(schedule[field],str) for field in ('platform_registered_at','offering_announcement_date','subscription_start_date','subscription_end_date')) and all(nullable(schedule[field],(int,float)) for field in ('target_operating_period_months','actual_operating_period_months')),f"{product['id']} schedule contract")
 terms=model['investment_terms'];ok(nullable(terms['dividend_confirmed'],bool) and all(nullable(terms[field],(int,float)) for field in ('minimum_investment_amount_krw','fundraising_amount_krw')),f"{product['id']} investment terms contract")
 for field in ('expected_dividend','actual_dividend'):
  dividend=terms[field];ok(dividend is None or (isinstance(dividend,dict) and all(key in dividend for key in ('amount_krw','rate_pct','as_of')) and nullable(dividend['amount_krw'],(int,float)) and nullable(dividend['rate_pct'],(int,float)) and nullable(dividend['as_of'],str)),f"{product['id']} {field} contract")
 status=model['status'];ok(status['status_text']==product['status'] and status['status_detail']==product.get('status_detail') and status['lifecycle_state']==model['lifecycle']['state'] and nullable(status['new_purchase_available'],bool),f"{product['id']} status preservation")
 recovery=model['recovery'];ok(all(key in recovery for key in ('expected_method','actual_sale_price_krw','total_return_krw','total_return_pct')) and nullable(recovery['expected_method'],str) and all(nullable(recovery[key],(int,float)) for key in ('actual_sale_price_krw','total_return_krw','total_return_pct')),f"{product['id']} recovery contract")
 review=model['review'];ok(review['status']==model['review_status']['value'] and review['status_reason']==model['review_status']['reason'] and review['item_evidence_source_ids']==model['evidence']['source_ids'] and review['ai_comments']==model['comments']['detail'] and review['validation_pending']==model['validation']['pending'],f"{product['id']} review contract")
 ok(model['investment_terms']['minimum_investment_amount_krw'] is None and model['investment_terms']['expected_dividend'] is None,f"{product['id']} no inferred terms")
 ok(model['review_status']['value']=='-',f"{product['id']} review disabled")
 ok(model['lifecycle']['state'] in {'UPCOMING','SUBSCRIPTION','OPERATING','COMPLETED','TRADING_STOPPED','UNVERIFIED'},f"{product['id']} lifecycle")
 ids={s.get('id') for s in product['sources']};ok(None not in ids and len(ids)==len(product['sources']),f"{product['id']} stable source ids")
 evidence=model['evidence'];ok(set(evidence['source_ids'])==ids and evidence.get('version'),f"{product['id']} evidence coverage")
 comments=model['comments'];ok(comments.get('generation_method')=='deterministic_evidence_template',f"{product['id']} deterministic comments")
 for comment in [comments.get('card'),*(comments.get('detail') or [])]:
  ok(comment and comment.get('text') and comment.get('evidence_version')==evidence['version'] and set(comment.get('source_ids',[])).issubset(ids) and comment['source_ids'],f"{product['id']} comment evidence link")
  if any(marker in comment['text'] for marker in evaluation_comment_markers):ok(comment['text'].startswith('[AI 해석]'),f"{product['id']} evaluation comment label")
 if product['id'].startswith('sou-'):ok(model['legal_issuer']=={'id':None,'name':None,'display_name':'-','verification_status':'pending'},f"{product['id']} SOU legal issuer pending")
 else:ok(model['legal_issuer']['verification_status']=='verified' and model['legal_issuer']['name']=='주식회사 투게더아트',f"{product['id']} DART legal issuer")
 if product['category']=='부동산':
  offering_units=product.get('real_estate',{}).get('offering_units',{})
  if 'land_per_m2' in offering_units:ok(offering_units['land_per_m2']==round(product['offering']['amount']/product['asset']['site_area_m2']),f"{product['id']} offering land unit")
  if 'gross_per_m2' in offering_units:ok(offering_units['gross_per_m2']==round(product['offering']['amount']/product['asset']['gross_floor_area_m2']),f"{product['id']} offering gross unit")
sou_notice_146_ids={'sou-product-13':'sou-13-notice-146','sou-product-6':'sou-6-notice-146','sou-product-7':'sou-7-notice-146'}
sou_notice_146_template=next(source for source in p['sou-product-13']['sources'] if source['id']=='sou-13-notice-146')
for product_id,notice_id in sou_notice_146_ids.items():
 product=p[product_id];model=product['common_model'];notice=next(source for source in product['sources'] if source['id']==notice_id)
 ok(model['lifecycle']['state']=='TRADING_STOPPED',f'{product_id} trading stopped state')
 ok(notice_id in model['evidence']['source_ids'],f'{product_id} notice 146 evidence link')
 ok(notice_id in model['review']['item_evidence_source_ids'],f'{product_id} notice 146 review link')
 ok(all(notice[field]==sou_notice_146_template[field] for field in ('label','as_of','url','document_name','publisher','collected_at','evidence_grade')),f'{product_id} notice 146 metadata template')
 ok(notice_id in model['comments']['card']['source_ids'],f'{product_id} notice 146 status comment link')
ok(issuer_by_id['lucentblock']['legal_issuer']['name'] is None and issuer_by_id['lucentblock']['legal_issuer']['display_name']=='-', 'issuer SOU legal pending')
ok(issuer_by_id['togetherart']['legal_issuer']['verification_status']=='verified','issuer togetherart verified')
for issuer in issuers:
 ids={s.get('id') for s in issuer['sources']};ok(None not in ids and len(ids)==len(issuer['sources']),f"{issuer['id']} source ids")
 for source in issuer['sources']:
  ok(all(field in source for field in ('id','label','url','as_of','document_name','publisher','collected_at','evidence_grade')),f"{issuer['id']} source contract")
  ok(all(source[field] is None for field in ('document_name','publisher','collected_at','evidence_grade')),f"{issuer['id']} source unknown preservation")
 ok(set(issuer['evidence']['source_ids'])==ids and issuer['validation']['pending'] is True and issuer['change_history']==[],f"{issuer['id']} evidence state")
ok(p['sou-product-13']['operations']['annualized_dividend_yield_pct']==9.25,'annualized dividend preserved')
ok(all('annualized_dividend_yield_pct' not in x['common_model']['investment_terms'] for x in products),'annualized dividend not UI model')
ok(len(track_records)==187 and len({x['id'] for x in track_records})==187,'Art n Guide record ids')
ok(len(track_fields)==19 and all(tuple(x)==track_fields for x in track_records),'Art n Guide exact fields')
ok(sum(x['status']=='TRANSFER' for x in track_records)==138 and sum(x['status']=='RETURNED_PRODUCT' for x in track_records)==12 and sum(x['status']=='EXPECTED_TRANSFER' for x in track_records)==37,'Art n Guide statuses')
ok(all(x['soldMoney']==0 and x['soldTime'] is None and x['profit'] is None and x['dateHold'] is None and x['yearProfit'] is None for x in track_records if x['status']=='EXPECTED_TRANSFER'),'Art n Guide expected transfer semantics')
ok(next(x for x in track_records if x['id']==16)['profit']==0 and next(x for x in track_records if x['id']==16)['yearProfit']==0,'Art n Guide zero values')
ok(track['recomputed_stats']=={'record_count':187,'total_gp_money_krw':49598300000,'completed_count':150,'total_sold_money_krw':41513812500},'Art n Guide recomputed stats')
ok([x['difference'] for x in track['known_discrepancies']['items']]==[1,3000000,1,7400000] and track['known_discrepancies']['cause']=='확인 불가','Art n Guide known discrepancies')
env_path=R/'.env';ok(not env_path.exists() or env_path.is_file(),'.env structure')
excluded_scan_parts={'.git','.next','node_modules','tmp','_workspace'}
repository_text_files=(
 f for f in R.rglob('*')
 if f.is_file()
 and not f.name.startswith('.env')
 and not excluded_scan_parts.intersection(f.parts)
)
repository_text=[f.read_text(encoding='utf8',errors='ignore').lower() for f in repository_text_files]
for bad in ('Ka'+'sa','연결 '+'예정','가격 '+'관측과 사용 제한','운영사 '+'주장'):
 ok(all(bad.lower() not in text for text in repository_text),bad)
print('PASS: data')
