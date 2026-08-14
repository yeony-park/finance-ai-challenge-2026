# DAKER_1 Finance-AI-Challenge 정량 감사 리포트

## 요약

**원본 JSON 데이터 338건 + 데모 31건 (offerings 4 + trackRecords 27)**
- Adapter 출력 TrackRecord: 338건 (모두 실데이터만)
- API /products: 실미술품 5 + 데모 offerings 4 = 9건
- **비판적 이슈**: 모든 TrackRecords가 TrackRecord만 생성되고 **Offering이 0건**

---

## 1. 원본 JSON 데이터 통계

### 1.1 data/artnguide_track_records.json
| 항목 | 값 |
|------|-----|
| 총 records 개수 | 187 |
| 고유 id | 187 (중복 없음) |
| **Status 분포** | |
| TRANSFER | 138 |
| EXPECTED_TRANSFER | 37 |
| RETURNED_PRODUCT | 12 |
| **Null 개수** | |
| soldMoney | 0 |
| gpMoney | 0 |
| soldTime | 37 (19.8%) |
| profit | 37 (19.8%) |
| **record_annotations** | 187개 모두 매칭됨 |

### 1.2 data/weshareart_research.json
| 항목 | 값 |
|------|-----|
| 총 track_records | 145 |
| 고유 goodsId | 145 (중복 없음) |
| **coPurchaseStatusCategory 분포** | |
| RECRUITED | 93 |
| DISTRIBUTED | 52 |
| **coPurchaseStatus 분포** | |
| BOUGHT | 93 |
| DISTRIBUTED | 52 |
| **Null 개수** | |
| goodsId | 0 |
| goodsName | 0 |
| artistNameForKorean | 0 |
| saleYieldPercent | 0 |
| detail 없음 | 0 (모두 존재) |

### 1.3 data/tessa_sale_records.json
| 항목 | 값 |
|------|-----|
| 총 records | 6 |
| 고유 record_id | 6 (중복 없음) |
| **sale_price.currency 분포** | |
| KRW | 3 |
| HKD | 3 |

### 1.4 data/products.json
| 항목 | 값 |
|------|-----|
| 총 products | 8 |
| **Category 분포** | |
| 미술품 | 5 (62.5%) |
| 부동산 | 3 (37.5%) |
| **미술품 5건 id** | |
| - | at-kim-whanki-009-01 |
| - | at-chonghyun-009-02 |
| - | at-youngkuk-008 |
| - | at-kusama-001 |
| - | at-condo-002 |

### 1.5 data/demo/art-investment.json
| 항목 | 값 |
|------|-----|
| offerings | 4 (모두 isDemo=true) |
| trackRecords | 27 (모두 isDemo=null) |
| artists | 4 (모두 isDemo=null) |
| platforms | 4 (모두 isDemo=null) |

---

## 2. Adapter 매핑 분석

### 2.1 원본 필드 vs 매핑된 필드

#### Artnguide (187건)
**사용된 필드:**
- id, status, authorName, title, gpMoney, dateHold, soldMoney, soldTime, profit

**버려진 필드 (매핑 안 됨):**
- startAt, endAt (오퍼링 기간 미매핑)
- artMaterial, artSize, yearItem, yearProfit (작품 상세정보 미매핑)
- soldPlace, soldNote, thumbnail, oldGpVersion

#### Weshareart (145건)
**사용된 필드:**
- list: goodsId, goodsName, coPurchaseStatusCategory, coPurchaseStatus, saleYieldPercent, artistNameForKorean, titleForKorean
- detail: quantity, pieceAmount, keepingDays, artwork.title
- source_urls: goods_page

**버려진 필드 (매핑 안 됨):**
- **investBeginDateTime, investEndDateTime** (모든 145건에 존재하지만 미매핑)
- artistNameForEnglish, titleForEnglish, dDay, representativeGoodsImageUrl
- goodsCoPurchaseId, purchasedPercent, purchasedQuantity, estimateMinAmount, estimateMaxAmount

#### Tessa (6건)
**사용된 필드:**
- asset, sale_price, initial_price, settlement, calculated_settlement_return_pct, holding_period_days, record_id

**버려진 필드:**
- template_family, category, registration_timestamp, original_written_date

---

## 3. Status 매핑의 미분류 문제

### 원본 Status → TrackRecord Status 매핑

#### Artnguide
| 원본 Status | 건수 | 매핑 후 | 비고 |
|-----------|-----|--------|------|
| TRANSFER | 138 | sold | ✓ |
| EXPECTED_TRANSFER | 37 | exit_in_progress | ✓ |
| RETURNED_PRODUCT | 12 | sold | ⚠️ 미분류값 뭉개짐 |

**발견사항:** RETURNED_PRODUCT 12건이 전부 'sold'로 단순 매핑됨. 반환/거절 상태와 판매완료 상태가 구분 안 됨.

---

## 4. Adapter 출력 TrackRecord 통계 (338건)

### 4.1 Platform 분포
| Platform | 건수 | 비율 |
|----------|-----|-----|
| platform-artnguide | 187 | 55.3% |
| platform-arttogether | 145 | 42.9% |
| platform-tessa | 6 | 1.8% |
| **합계** | **338** | **100%** |

### 4.2 Status 분포
| Status | 건수 | 비율 |
|--------|-----|-----|
| sold | 150 | 44.4% |
| operating | 93 | 27.5% |
| liquidated | 55 | 16.3% |
| exit_in_progress | 37 | 10.9% |
| loss_confirmed | 3 | 0.9% |
| **합계** | **338** | **100%** |

### 4.3 Platform × Status 분포
| Platform | sold | exit_in_progress | operating | liquidated | loss_confirmed |
|----------|------|-----------------|-----------|------------|----------------|
| artnguide | 150 | 37 | - | - | - |
| arttogether | - | - | 93 | 52 | - |
| tessa | - | - | - | 3 | 3 |

### 4.4 필드 Null 분포
| 필드 | Platform | Null | Total | Null % |
|------|----------|------|-------|--------|
| **offeringAmount** | artnguide | 0 | 187 | 0% |
| | arttogether | 145 | 145 | 100% ✓ |
| | tessa | 0 | 6 | 0% |
| **finalReturn** | artnguide | 187 | 187 | 100% ✓ |
| | arttogether | 93 | 145 | 64.1% |
| | tessa | 0 | 6 | 0% |
| **soldAt** | artnguide | 37 | 187 | 19.8% |
| | arttogether | 145 | 145 | 100% ✓ |
| | tessa | 6 | 6 | 100% ✓ |

### 4.5 Artist 분석
| 항목 | 값 |
|------|-----|
| 고유 artistName | 100 |
| 총 레코드 | 338 |
| 모든 레코드에 artistName 존재 | ✓ Yes |

---

## 5. 비판적 발견사항

### ⚠️ 심각 이슈: Offering 생성 없음
- **TrackRecords**: 338건 생성됨 (artnguide 187 + weshareart 145 + tessa 6)
- **Offerings**: 0건 생성됨
- **Demo offerings**: 4건 (별도, isDemo=true)
- **결과**: 338건 플랫폼 이력이 **모두 TrackRecord로만 입력되고 Offering이 되지 않음**

### ⚠️ Artnguide 설계 문제
1. **RETURNED_PRODUCT의 미분류**: 12건이 'sold'로 뭉개짐
2. **필드 손실**:
   - startAt/endAt (오퍼링 구독 기간)
   - artMaterial, artSize (작품 상세)
   - soldPlace, soldNote (거래 정보)

### ⚠️ Weshareart 설계 문제
1. **offeringAmount 강제 null**: 145건 모두 null (대응 필드 없음)
2. **investBeginDateTime/investEndDateTime 미매핑**: 145건 모두에 존재하지만 사용 안 됨
3. **실제 거래액 미매핑**: quantity × pieceAmount 계산값이 사용되지 않음

### ✓ Tessa (정상)
- 모든 필드가 적절히 매핑됨
- finalReturn 완전성 100%
- 근거: calculated_settlement_return_pct 모두 존재

---

## 6. API 응답 구성

### /api/products (GET)
```
{
  items: [
    // products.json 미술품 5건
    { id: "at-kim-whanki-009-01", ... },
    { id: "at-chonghyun-009-02", ... },
    { id: "at-youngkuk-008", ... },
    { id: "at-kusama-001", ... },
    { id: "at-condo-002", ... },
    // demo offerings 4건
    { id: "demo-art-001", ... },
    { id: "demo-art-002", ... },
    { id: "demo-art-003", ... },
    { id: "demo-art-004", ... }
  ],
  mode: "mixed"  // 실데이터 + 데모 혼합
}
```
**총 9건 (실미술품 5 + 데모 offering 4)**

---

## 결론

### 정량적 검증 요약
- ✓ 원본 JSON 파싱 및 수치 일관성: 정상
- ✓ Adapter TrackRecord 생성: 338건 정상 생성
- ⚠️ **Offering 생성 없음**: 338건 TrackRecord는 생성되지만 Offering으로 변환되지 않음
- ⚠️ **필드 손실**: artnguide, weshareart에서 투자 기간 등 중요 필드 미매핑
- ⚠️ **Status 미분류**: RETURNED_PRODUCT 등 특수 상태 'sold'로 단순화

### 권장 후속 조치
1. Adapter에서 TrackRecord → Offering 변환 로직 추가 필요
2. artnguide의 startAt/endAt → offeringPeriod 매핑 추가
3. weshareart의 investBeginDateTime/investEndDateTime 활용 방안 검토
4. RETURNED_PRODUCT 상태 분류 기준 명확화
