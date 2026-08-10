"""Optional, secret-safe official API smoke. No fixture or external state is written."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

def smoke(label,fn,detail):
    try:
        value=fn();print(f"PASS: {label} {detail(value)}")
    except server.SourceError:
        print(f"SKIP: {label} unavailable, unauthorised, or schema changed")

configs=server.load_property_configs()
for cfg in configs:
    pipeline=server._new_property_pipeline(cfg)
    smoke(f"SOU {cfg['product_id']}",lambda p=pipeline:p["sou"].fetch(),lambda x:f"endpoints {len(x['payloads'])}")
    smoke(f"상업·업무용 RTMS {cfg['legal_dong']}",lambda p=pipeline:p["commercial"].refresh(),lambda x:f"rows {len(x['rows'])}")
    smoke(f"토지 RTMS {cfg['legal_dong']}",lambda p=pipeline:p["land"].refresh(),lambda x:f"rows {len(x['rows'])}")
    smoke(f"건축HUB {cfg['legal_dong']}",lambda p=pipeline:p["building"].fetch(),lambda x:f"exists {x['exists']}")
    for parcel in cfg["parcels"]:
        smoke(f"VWorld {parcel['pnu']}",lambda pnu=parcel["pnu"]:server.VWorldAdapter(pnu).fetch(),lambda x:f"land-price year {x['official_land_price']['year']}")
smoke("OpenDART 원문",lambda:server.DartAdapter().verify_receipts(["20260513000002"]),lambda x:f"receipts {sum(1 for r in x['receipts'] if r['original_document_received'])}")
smoke("복수 상품 catalog",lambda:server.CatalogService().catalog(),lambda x:f"real-estate {sum(p['category']=='부동산' for p in x['products'])}, art {sum(p['category']=='미술품' for p in x['products'])}")
