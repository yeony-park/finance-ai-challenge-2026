import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def ok(x,m):
 if not x:raise AssertionError(m)
products=json.loads((R/'data/products.json').read_text())['products'];p={x['id']:x for x in products};snapshots=json.loads((R/'data/source_snapshots.json').read_text());snap=snapshots['rtms_daejeon_gungdong'];configs=json.loads((R/'data/sou_property_configs.json').read_text())['properties']
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
for bad in ('Ka'+'sa','연결 '+'예정','가격 '+'관측과 사용 제한','운영사 '+'주장'):
 ok(all(bad.lower() not in f.read_text(encoding='utf8',errors='ignore').lower() for f in R.rglob('*') if f.is_file()),bad)
print('PASS: data')
