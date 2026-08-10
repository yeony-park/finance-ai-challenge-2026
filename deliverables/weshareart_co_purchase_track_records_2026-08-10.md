# 아트투게더 지난 공동구매 트랙레코드 : 전체 15페이지

## 문서 정보

- [팩트] 수집 대상 : [아트투게더 지난 공동구매](https://weshareart.com/goods?type=ALL&page=1)
- [팩트] 수집·검증 시점 : 2026-08-10 21 : 42~21 : 46 KST
- [팩트] 목록 원문 : [first-party 목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=200&coPurchaseStatusCategory=ALL)
- [팩트] 공개 상세 원문 : 각 레코드의 `GET /api/public/goods?id={goodsId}` 응답
- [팩트] 데이터 분류 : `service_platform_self_reported_track_record` — 아트투게더 운영사 투게더아트가 자체 서비스에 게시한 값
- [범위 주의] 매각 계약서, 경매 낙찰 결과, 입금·분배 내역 등 외부 원자료로 각 거래를 독립 검증한 결과는 아닙니다
- [범위 주의] 경로에 `/api/public`이 포함돼도 외부 개발자용 공개 API로 문서화됐다는 뜻으로 해석하지 않았습니다

## 개인정보 제거 기준

- [팩트] 로그인 쿠키, 세션, 회원 계정, 고객 이름, 전화번호, 이메일, 주소, 계좌, 개인 답안·결과는 수집하거나 기록하지 않았습니다
- [팩트] 작품 식별에 필요한 공개 작가명은 저작자 표시로 보존했습니다. 작가 프로필의 생년·사망년·국적·학력·인물 이미지·약력·수상·전시·소개 값은 모든 레코드에서 제거했습니다
- [팩트] 제거된 상세 필드는 각 레코드의 `_redactedFields`에 필드명만 남겼으며 원값은 싣지 않았습니다
- [팩트] 추적 매개변수(UTM)가 포함된 URL은 수록하지 않았습니다

## 전수 검증 결과

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=200&coPurchaseStatusCategory=ALL) : 145건, 15페이지
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 페이지별 건수 : 1~14페이지 각 10건, 15페이지 5건
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 고유 식별자 : `goodsId` 145개, `goodsCoPurchaseId` 145개, 중복 0개
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 상태 : `RECRUITED / BOUGHT` 93건, `DISTRIBUTED / DISTRIBUTED` 52건. [상태 enum 원문](https://weshareart.com/api/public/enum/fo/list)
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 `saleYieldPercent` 원값 : 최솟값 0, 최댓값 161.19, 양수 52건, 0 93건, 음수 0건. 매각완료 52건은 모두 양수이고 모집종료 93건은 모두 0
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 `goodsDetail` : `true` 128건, `false` 17건
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 공개 상세 : 145건 전부 응답, 목록 18개 필드·상세 최상위 19개 필드·작품 16개 필드·작가 13개 필드의 keyset이 모든 레코드에서 동일
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 공개 상세 `imageList.list` URL : 400개. 별도 `artwork.imageUrl` 145개를 합치면 545개이며 모두 고유합니다. 이미지는 내려받거나 복제하지 않고 URL만 보존
- [팩트] 15개 페이지 결합 순서와 `size=200` 단일 응답의 레코드·필드·원값이 모두 일치했습니다
- [팩트] 목록과 공개 상세의 상품명, 모집기간, 수익률, 상태, 작가명, 대표 이미지 연결을 145건 전수 대조했고 불일치는 각각 0건입니다
- [확인 불가] 매각 summary·목록·상세 endpoint는 비로그인 요청에 HTTP 401과 `COMMON_INVALID_SESSION`을 반환했습니다. 로그인 세션이나 인증 우회 없이 매각일, 매각가, 배분내역은 확인할 수 없습니다

## 원값 보존 규칙

- 각 레코드의 JSON은 값의 의미와 자료형을 보존해 재직렬화했습니다. `null`, 빈 문자열 `""`, 공백 문자열, 숫자 `0`, boolean은 구분하지만 숫자 `0.0`·`1.0`의 소수점 표기 자체는 JSON 재직렬화 과정에서 `0`·`1`로 표시될 수 있습니다
- `investBeginDateTime`·`investEndDateTime`에는 `Z`나 UTC offset이 없습니다. UTC 또는 KST로 변환하지 않고 timezone 미지정 local datetime 원문으로 보존했습니다
- `pieceAmount`·`estimateMinAmount`·`estimateMaxAmount` 등 금액형 필드에는 currency code가 없습니다. 문서에서 통화 단위를 임의로 붙이지 않았습니다
- 화면은 `saleYieldPercent` 뒤에 `%`를 붙입니다. `RECRUITED`의 숫자 `0`은 공개 매각 상세가 없으므로 ‘0% 손익으로 매각’이라는 뜻으로 해석하지 않았습니다
- 화면의 `전체` 필터는 현재 enum 설명상 모집예정 항목을 제외합니다. 따라서 이 문서의 145건은 해당 화면이 반환한 ‘지난 공동구매’ 전수이며 플랫폼 전체 상품 전수라는 뜻은 아닙니다

### 목록 18개 필드의 빈값 분포

- [팩트] 아래 표의 수치·원문 : 2026-08-10 21 : 42~21 : 46 KST, [목록 API 145건](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=200&coPurchaseStatusCategory=ALL)

| 필드 | `null` | 빈 문자열 | 공백만 | 그 외 값 |
|---|---:|---:|---:|---:|
| `goodsCoPurchaseId` | 0 | 0 | 0 | 145 |
| `goodsId` | 0 | 0 | 0 | 145 |
| `goodsName` | 0 | 0 | 0 | 145 |
| `coPurchaseStatusCategory` | 0 | 0 | 0 | 145 |
| `coPurchaseStatus` | 0 | 0 | 0 | 145 |
| `investBeginDateTime` | 0 | 0 | 0 | 145 |
| `investEndDateTime` | 0 | 0 | 0 | 145 |
| `saleYieldPercent` | 0 | 0 | 0 | 145 |
| `artistNameForKorean` | 0 | 0 | 0 | 145 |
| `artistNameForEnglish` | 0 | 0 | 0 | 145 |
| `titleForKorean` | 22 | 81 | 0 | 42 |
| `titleForEnglish` | 3 | 8 | 0 | 134 |
| `goodsDetail` | 0 | 0 | 0 | 145 |
| `representativeGoodsImageUrl` | 0 | 0 | 0 | 145 |
| `showKakaopayList` | 0 | 0 | 0 | 145 |
| `opened` | 0 | 0 | 0 | 145 |
| `dday` | 0 | 145 | 0 | 0 |
| `dDay` | 0 | 145 | 0 | 0 |

## 필드 구조

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 목록 항목 : `goodsCoPurchaseId`, `goodsId`, `goodsName`, `coPurchaseStatusCategory`, `coPurchaseStatus`, `investBeginDateTime`, `investEndDateTime`, `saleYieldPercent`, `artistNameForKorean`, `artistNameForEnglish`, `titleForKorean`, `titleForEnglish`, `goodsDetail`, `representativeGoodsImageUrl`, `showKakaopayList`, `opened`, `dday`, `dDay`
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 상세 최상위 : `artwork`, `availableQuantity`, `estimateMaxAmount`, `estimateMinAmount`, `id`, `imageList`, `interviewUrl`, `investBeginDateTime`, `investEndDateTime`, `keepingDays`, `name`, `pieceAmount`, `purchasedPercent`, `purchasedQuantity`, `quantity`, `saleYieldPercent`, `status`, `statusCategoryCode`, `type`
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 작품 객체 : `artist`, `copyrightText`, `edition`, `id`, `imageUrl`, `material`, `productionYear`, `provenance`, `setComposition`, `signatureInfo`, `size1`, `size2`, `size3`, `size3Type`, `title`, `zoomable`
- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 작가 객체 : `activityHistory`, `artistName`, `artistNameForEnglish`, `artistNameForKorean`, `awardsHistory`, `displayHistory`, `id`, `imageUrl`, `information`, `levelOfEducation`, `nationality`, `yearOfBirth`, `yearOfDeath`
- [팩트] 아래 레코드의 공개 상세 JSON은 상세 최상위·작품·이미지 필드를 원값으로 싣고, 개인정보 제거 대상 작가 프로필 값만 삭제했습니다

## 장문 상세 콘텐츠 범위

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 [상세 콘텐츠 API 표본](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=166)의 항목 구조 : `content`, `investPointTemplateId`, `templateData`, `templateSubType`, `templateTitle`, `templateType`, `title`, `type`
- [팩트] 145개 상품의 상세 콘텐츠는 합계 1,071개 섹션입니다. 유형별로 `ARTWORK_INFO` 145개, `ART_DIRECTOR` 154개, `GOODS_NEWS` 344개, `INVEST` 398개, `SUMMARY` 30개입니다
- [수록 제외] `content`는 장문 HTML 설명·마케팅 문구·이미지로 구성돼 원문 전체를 복제하지 않았습니다. 레코드마다 해당 API 원문 링크를 남겼습니다

## 페이지 목차

| 페이지 | 건수 | 첫 상품 | 마지막 상품 | 화면 | API 원문 |
|---:|---:|---|---|---|---|
| [1](#page-1) | 10 | Untitled (2022) | Vierundzwanzigsterjunizweitausendundzwanzig | [목록](https://weshareart.com/goods?type=ALL&page=1) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) |
| [2](#page-2) | 10 | World Champion | Pumpkin(1982) | [목록](https://weshareart.com/goods?type=ALL&page=2) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) |
| [3](#page-3) | 10 | Sun 4 | 겸재예찬 M II 225 | [목록](https://weshareart.com/goods?type=ALL&page=3) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) |
| [4](#page-4) | 10 | Pumpkin(1983) | Wildflowers | [목록](https://weshareart.com/goods?type=ALL&page=4) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) |
| [5](#page-5) | 10 | Vivien with Hat | Écriture No.010409 | [목록](https://weshareart.com/goods?type=ALL&page=5) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) |
| [6](#page-6) | 10 | Coca-Cola Girl 9 | Untitled 84-7-B | [목록](https://weshareart.com/goods?type=ALL&page=6) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) |
| [7](#page-7) | 10 | Écriture No.120228 | Just a Little Bit | [목록](https://weshareart.com/goods?type=ALL&page=7) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) |
| [8](#page-8) | 10 | Pain and sorrow | Eve of Distruction | [목록](https://weshareart.com/goods?type=ALL&page=8) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) |
| [9](#page-9) | 10 | 물방울 | New York Couples 5 | [목록](https://weshareart.com/goods?type=ALL&page=9) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) |
| [10](#page-10) | 10 | 화동의 꽃은 무궁화처럼 질기다 | Dora Mear au chat2-p | [목록](https://weshareart.com/goods?type=ALL&page=10) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) |
| [11](#page-11) | 10 | Portrait of an artist (pool with two figures) II | Taboo Yogini - Scarlet F1002 | [목록](https://weshareart.com/goods?type=ALL&page=11) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) |
| [12](#page-12) | 10 | Stars and Stripes | Commune with... | [목록](https://weshareart.com/goods?type=ALL&page=12) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) |
| [13](#page-13) | 10 | Commune with... | An Homage to monopink 1960 A | [목록](https://weshareart.com/goods?type=ALL&page=13) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) |
| [14](#page-14) | 10 | Flower(set of 2) | Seen 201212 | [목록](https://weshareart.com/goods?type=ALL&page=14) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) |
| [15](#page-15) | 5 | Un Passage | Halte de Comediens ambulants avec Hibou, from series 347 | [목록](https://weshareart.com/goods?type=ALL&page=15) | [JSON](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) |

## 전체 레코드

- [팩트] 아래 145건의 원문 시점 : 2026-08-10 21 : 42~21 : 46 KST. 순서는 [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=200&coPurchaseStatusCategory=ALL) 응답 순서와 동일
- 각 항목의 첫 JSON은 목록 18개 필드 전부, 둘째 JSON은 개인정보 제거 후 공개 상세 구조입니다

<a id="page-1"></a>

### 1페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=1) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>1. 조디 커윅 : Untitled — 모집종료 / goodsId 166</summary>

- 식별자 : `goodsId` 166 / `goodsCoPurchaseId` 298
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/166) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=166) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=166)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 298,
  "goodsId": 166,
  "goodsName": "Untitled (2022)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-11-28T14:00:00",
  "investEndDateTime": "2022-11-29T23:52:30",
  "saleYieldPercent": 0,
  "artistNameForKorean": "조디 커윅",
  "artistNameForEnglish": "Jordy Kerwick",
  "titleForKorean": "Untitled",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/166/20221117164514e6a8ab89-c924-429d-80ce-95cc64205ec8.png",
  "showKakaopayList": true,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 166,
  "artwork": {
    "id": 174,
    "artist": {
      "id": 151,
      "artistName": "조디 커윅",
      "artistNameForEnglish": "Jordy Kerwick",
      "artistNameForKorean": "조디 커윅",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Untitled",
    "material": "Oil, acrylic and spray paint on canvas",
    "size1": 120,
    "size2": 100,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2022",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/174/2022111716440337f1e7b2-1b0e-432a-ac07-331ba49c5dca.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled (2022)",
  "quantity": 17475,
  "pieceAmount": 10000,
  "estimateMinAmount": 166000000,
  "estimateMaxAmount": 244000000,
  "investBeginDateTime": "2022-11-28T14:00:00",
  "investEndDateTime": "2022-11-29T23:52:30",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/166/20221117164514e6a8ab89-c924-429d-80ce-95cc64205ec8.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 17475
}</code></pre>

</details>

<details>
<summary>2. 김환기 : 무제(1960s) — 모집종료 / goodsId 158</summary>

- 식별자 : `goodsId` 158 / `goodsCoPurchaseId` 290
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/158) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=158) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=158)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 290,
  "goodsId": 158,
  "goodsName": "무제(1960s)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-10-24T14:00:00",
  "investEndDateTime": "2022-11-04T23:59:00",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김환기",
  "artistNameForEnglish": "Kim Whanki",
  "titleForKorean": "무제(1960s)",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/158/2022113012274859cd5677-8f09-4838-ba1e-96c59818e7ee.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 158,
  "artwork": {
    "id": 169,
    "artist": {
      "id": 46,
      "artistName": "김환기",
      "artistNameForEnglish": "Kim Whanki",
      "artistNameForKorean": "김환기",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(1960s)",
    "material": "oil on canvas",
    "size1": 51,
    "size2": 41,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1960",
    "signatureInfo": "",
    "provenance": "2022.09 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/169/20221116152453275a96e4-e671-452b-be20-383c44b68e32.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제(1960s)",
  "quantity": 39550,
  "pieceAmount": 10000,
  "estimateMinAmount": 375000000,
  "estimateMaxAmount": 530000000,
  "investBeginDateTime": "2022-10-24T14:00:00",
  "investEndDateTime": "2022-11-04T23:59:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/158/2022113012274859cd5677-8f09-4838-ba1e-96c59818e7ee.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 39550,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>3. 남춘모 : Spring 21-03 — 모집종료 / goodsId 157</summary>

- 식별자 : `goodsId` 157 / `goodsCoPurchaseId` 289
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/157) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=157) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=157)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 289,
  "goodsId": 157,
  "goodsName": "Spring 21-03",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-10-18T14:00:00",
  "investEndDateTime": "2022-10-18T23:59:00",
  "saleYieldPercent": 0,
  "artistNameForKorean": "남춘모",
  "artistNameForEnglish": "Tchunmo Nam",
  "titleForKorean": "",
  "titleForEnglish": "Spring 21-03",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/157/20221011185605936ff6f0-4fab-41d6-b9e0-2d5ca70e9830.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 157,
  "artwork": {
    "id": 168,
    "artist": {
      "id": 146,
      "artistName": "남춘모",
      "artistNameForEnglish": "Tchunmo Nam",
      "artistNameForKorean": "남춘모",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Spring 21-03",
    "material": "Acrylic on coated canvas",
    "size1": 160,
    "size2": 120,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2021",
    "signatureInfo": "",
    "provenance": "2022.09 Private Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/168/2022101118523449a4e432-2ad6-4fdc-ad37-c37da3678c50.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Spring 21-03",
  "quantity": 8800,
  "pieceAmount": 10000,
  "estimateMinAmount": 83000000,
  "estimateMaxAmount": 120000000,
  "investBeginDateTime": "2022-10-18T14:00:00",
  "investEndDateTime": "2022-10-18T23:59:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/157/20221011185605936ff6f0-4fab-41d6-b9e0-2d5ca70e9830.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 8800,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>4. 앤디 워홀 : Flowers (F. &amp; S.Ⅱ.64) — 매각완료 / goodsId 155</summary>

- 식별자 : `goodsId` 155 / `goodsCoPurchaseId` 287
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/155) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=155) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=155)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 108.07

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 287,
  "goodsId": 155,
  "goodsName": "Flowers (F. &amp; S.Ⅱ.64)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-10-12T14:00:00",
  "investEndDateTime": "2022-10-12T14:08:30",
  "saleYieldPercent": 108.07,
  "artistNameForKorean": "앤디 워홀",
  "artistNameForEnglish": "Andy Warhol",
  "titleForKorean": "",
  "titleForEnglish": "Flowers (F. &amp; S.Ⅱ.64)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/155/20220929181903a14d9767-b947-45c2-800b-b79951182bfe.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 155,
  "artwork": {
    "id": 155,
    "artist": {
      "id": 26,
      "artistName": "앤디 워홀",
      "artistNameForEnglish": "Andy Warhol",
      "artistNameForKorean": "앤디 워홀",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Flowers (F. &amp; S.Ⅱ.64)",
    "material": "Silkscreen",
    "size1": 89.5,
    "size2": 89.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "A.P T (aside from the edition of 250)",
    "productionYear": "1970",
    "signatureInfo": "",
    "provenance": "2022.09 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/155/20220929181430aac718fe-2e6f-4634-b129-04f08c6a054f.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Flowers (F. &amp; S.Ⅱ.64)",
  "quantity": 4080,
  "pieceAmount": 10000,
  "estimateMinAmount": 38000000,
  "estimateMaxAmount": 57000000,
  "investBeginDateTime": "2022-10-12T14:00:00",
  "investEndDateTime": "2022-10-12T14:08:30",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 108.07,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/155/20220929181903a14d9767-b947-45c2-800b-b79951182bfe.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4080,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>5. 앤디 워홀 : Flowers (F. &amp; S.Ⅱ.66) — 매각완료 / goodsId 156</summary>

- 식별자 : `goodsId` 156 / `goodsCoPurchaseId` 288
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/156) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=156) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=156)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 44.94

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 288,
  "goodsId": 156,
  "goodsName": "Flowers (F. &amp; S.Ⅱ.66)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-10-12T14:00:00",
  "investEndDateTime": "2022-10-12T15:13:31",
  "saleYieldPercent": 44.94,
  "artistNameForKorean": "앤디 워홀",
  "artistNameForEnglish": "Andy Warhol",
  "titleForKorean": "",
  "titleForEnglish": "Flowers (F. &amp; S.Ⅱ.66)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/156/20220929182016418665c6-7707-4ed8-930f-bae463d4f4b6.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 156,
  "artwork": {
    "id": 156,
    "artist": {
      "id": 26,
      "artistName": "앤디 워홀",
      "artistNameForEnglish": "Andy Warhol",
      "artistNameForKorean": "앤디 워홀",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Flowers (F. &amp; S.Ⅱ.66)",
    "material": "Silkscreen",
    "size1": 89.5,
    "size2": 89.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.219/250 (plus 26 artist's proofs lettered A-Z)",
    "productionYear": "1970",
    "signatureInfo": "",
    "provenance": "2022.09 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/156/2022092918163268cf2cce-1064-4cb1-aefe-80dcfab3fcb1.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Flowers (F. &amp; S.Ⅱ.66)",
  "quantity": 7900,
  "pieceAmount": 10000,
  "estimateMinAmount": 75000000,
  "estimateMaxAmount": 110000000,
  "investBeginDateTime": "2022-10-12T14:00:00",
  "investEndDateTime": "2022-10-12T15:13:31",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 44.94,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/156/20220929182016418665c6-7707-4ed8-930f-bae463d4f4b6.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 7900
}</code></pre>

</details>

<details>
<summary>6. 김환기 : 산월 — 모집종료 / goodsId 154</summary>

- 식별자 : `goodsId` 154 / `goodsCoPurchaseId` 286
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/154) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=154) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=154)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 286,
  "goodsId": 154,
  "goodsName": "산월",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-09-07T14:00:00",
  "investEndDateTime": "2022-09-07T15:23:00",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김환기",
  "artistNameForEnglish": "Kim Whanki",
  "titleForKorean": "산월",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/154/20221130122847e202e946-0e13-40f1-b424-d4806e83e37c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 154,
  "artwork": {
    "id": 154,
    "artist": {
      "id": 46,
      "artistName": "김환기",
      "artistNameForEnglish": "Kim Whanki",
      "artistNameForKorean": "김환기",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "산월",
    "material": "gouache on paper",
    "size1": 29,
    "size2": 20,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1964",
    "signatureInfo": "",
    "provenance": "2022.08 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/154/20220929183612351b35c2-e665-4cda-8277-dfcee3ae90d2.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "산월",
  "quantity": 5825,
  "pieceAmount": 10000,
  "estimateMinAmount": 55000000,
  "estimateMaxAmount": 80000000,
  "investBeginDateTime": "2022-09-07T14:00:00",
  "investEndDateTime": "2022-09-07T15:23:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/154/20221130122847e202e946-0e13-40f1-b424-d4806e83e37c.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5825,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>7. 박서보 : 묘법 No. 950618 — 모집종료 / goodsId 153</summary>

- 식별자 : `goodsId` 153 / `goodsCoPurchaseId` 285
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/153) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=153) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=153)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 285,
  "goodsId": 153,
  "goodsName": "묘법 No. 950618 ",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-08-31T14:00:00",
  "investEndDateTime": "2022-08-31T14:09:43",
  "saleYieldPercent": 0,
  "artistNameForKorean": "박서보",
  "artistNameForEnglish": "Seobo Park",
  "titleForKorean": "묘법 No. 950618",
  "titleForEnglish": "Écriture No. 950618",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1000000/2022082515060502c3fb0b-e1e1-4a5c-9442-942f4534fc4d.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 153,
  "artwork": {
    "id": 153,
    "artist": {
      "id": 35,
      "artistName": "박서보",
      "artistNameForEnglish": "Seobo Park",
      "artistNameForKorean": "박서보",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "묘법 No. 950618(Écriture No. 950618)",
    "material": "Mixed media with Korean paper on canvas",
    "size1": 15.8,
    "size2": 22.7,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1995",
    "signatureInfo": "",
    "provenance": "2022.08 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/153/20220825150301c830c39d-a148-4efe-b514-021479a5c434.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "묘법 No. 950618 ",
  "quantity": 3495,
  "pieceAmount": 10000,
  "estimateMinAmount": 33000000,
  "estimateMaxAmount": 48000000,
  "investBeginDateTime": "2022-08-31T14:00:00",
  "investEndDateTime": "2022-08-31T14:09:43",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1000000/2022082515060502c3fb0b-e1e1-4a5c-9442-942f4534fc4d.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1000000/2022082515060601a1c28b-9426-4e96-8fed-e2ab6e8f088a.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3495,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>8. 플로라 유크노비치 : Study (22) — 모집종료 / goodsId 152</summary>

- 식별자 : `goodsId` 152 / `goodsCoPurchaseId` 284
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/152) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=152) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=152)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 284,
  "goodsId": 152,
  "goodsName": "Study (22)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-08-04T14:00:00",
  "investEndDateTime": "2022-08-16T13:50:44",
  "saleYieldPercent": 0,
  "artistNameForKorean": "플로라 유크노비치",
  "artistNameForEnglish": "Flora Yukhnovich",
  "titleForKorean": "",
  "titleForEnglish": "Study (22)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/152/202207261334102efe042b-1f58-4fd6-afa0-0656be93bdfe.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 152,
  "artwork": {
    "id": 152,
    "artist": {
      "id": 81,
      "artistName": "플로라 유크노비치",
      "artistNameForEnglish": "Flora Yukhnovich",
      "artistNameForKorean": "플로라 유크노비치",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Study (22)",
    "material": "종이에 유채",
    "size1": 21,
    "size2": 15.8,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2018",
    "signatureInfo": "",
    "provenance": "2022.07 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/152/2022072613254721eddda1-de37-4947-907a-393c2dfa79a7.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Study (22)",
  "quantity": 11650,
  "pieceAmount": 10000,
  "estimateMinAmount": 110000000,
  "estimateMaxAmount": 163000000,
  "investBeginDateTime": "2022-08-04T14:00:00",
  "investEndDateTime": "2022-08-16T13:50:44",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/152/202207261334102efe042b-1f58-4fd6-afa0-0656be93bdfe.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 11650,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>9. 정창섭 : 묵고 23206 — 모집종료 / goodsId 151</summary>

- 식별자 : `goodsId` 151 / `goodsCoPurchaseId` 283
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/151) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=151) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=151)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 283,
  "goodsId": 151,
  "goodsName": "묵고 23206",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-07-19T17:33:00",
  "investEndDateTime": "2022-07-21T16:57:16",
  "saleYieldPercent": 0,
  "artistNameForKorean": "정창섭",
  "artistNameForEnglish": "Changsup Chung",
  "titleForKorean": "묵고 23206",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/151/20220712172637d7edc24f-7ed8-4d16-afa8-f0194e2d7a83.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 151,
  "artwork": {
    "id": 151,
    "artist": {
      "id": 80,
      "artistName": "정창섭",
      "artistNameForEnglish": "Changsup Chung",
      "artistNameForKorean": "정창섭",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "묵고 23206",
    "material": "면포에 닥종이",
    "size1": 70,
    "size2": 70,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2003",
    "signatureInfo": "",
    "provenance": "2022.06 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/151/20220712165253f9c6f177-c19e-4aa2-a3f6-67205c764068.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "묵고 23206",
  "quantity": 2680,
  "pieceAmount": 10000,
  "estimateMinAmount": 25000000,
  "estimateMaxAmount": 37000000,
  "investBeginDateTime": "2022-07-19T17:33:00",
  "investEndDateTime": "2022-07-21T16:57:16",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/151/20220712172637d7edc24f-7ed8-4d16-afa8-f0194e2d7a83.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 2680
}</code></pre>

</details>

<details>
<summary>10. 우고 론디노네 : Vierundzwanzigsterjunizweitausendundzwanzig — 모집종료 / goodsId 150</summary>

- 식별자 : `goodsId` 150 / `goodsCoPurchaseId` 282
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/150) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=1&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=150) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=150)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 282,
  "goodsId": 150,
  "goodsName": "Vierundzwanzigsterjunizweitausendundzwanzig",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-07-13T14:00:00",
  "investEndDateTime": "2022-07-21T16:56:52",
  "saleYieldPercent": 0,
  "artistNameForKorean": "우고 론디노네",
  "artistNameForEnglish": "Ugo Rondinone",
  "titleForKorean": "",
  "titleForEnglish": "Vierundzwanzigsterjunizweitausendundzwanzig",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/150/20220707110111ba7162a7-f14f-4841-b89c-c52b454955f0.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 150,
  "artwork": {
    "id": 150,
    "artist": {
      "id": 58,
      "artistName": "우고 론디노네",
      "artistNameForEnglish": "Ugo Rondinone",
      "artistNameForKorean": "우고 론디노네",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Vierundzwanzigsterjunizweitausendundzwanzig",
    "material": "Watercolour on canvas",
    "size1": 27.8,
    "size2": 40.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2020",
    "signatureInfo": "",
    "provenance": "2022.06 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/150/20220707110101767e4de6-bb8a-4061-8775-fda764bf06e9.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Vierundzwanzigsterjunizweitausendundzwanzig",
  "quantity": 9320,
  "pieceAmount": 10000,
  "estimateMinAmount": 88000000,
  "estimateMaxAmount": 120000000,
  "investBeginDateTime": "2022-07-13T14:00:00",
  "investEndDateTime": "2022-07-21T16:56:52",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/150/20220707110111ba7162a7-f14f-4841-b89c-c52b454955f0.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 9320,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-2"></a>

### 2페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=2) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>11. 에드가 플랜스 : World Champion — 모집종료 / goodsId 149</summary>

- 식별자 : `goodsId` 149 / `goodsCoPurchaseId` 281
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/149) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=149) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=149)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 281,
  "goodsId": 149,
  "goodsName": "World Champion",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-07-07T14:00:00",
  "investEndDateTime": "2022-07-11T12:33:39",
  "saleYieldPercent": 0,
  "artistNameForKorean": "에드가 플랜스",
  "artistNameForEnglish": "Edgar Plans",
  "titleForKorean": "",
  "titleForEnglish": "World Champion",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/149/20220630102437e46910fa-9554-47d7-b61e-35f6a725c948.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 149,
  "artwork": {
    "id": 149,
    "artist": {
      "id": 79,
      "artistName": "에드가 플랜스",
      "artistNameForEnglish": "Edgar Plans",
      "artistNameForKorean": "에드가 플랜스",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "World Champion",
    "material": "패널에 혼합재료",
    "size1": 41,
    "size2": 33,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "",
    "provenance": "2022.06 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/149/20220630102150f46a6e17-a86f-4994-9c0e-75b523ecfe9c.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "World Champion",
  "quantity": 8155,
  "pieceAmount": 10000,
  "estimateMinAmount": 77000000,
  "estimateMaxAmount": 110000000,
  "investBeginDateTime": "2022-07-07T14:00:00",
  "investEndDateTime": "2022-07-11T12:33:39",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/149/20220630102437e46910fa-9554-47d7-b61e-35f6a725c948.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 8155,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>12. 이배 : 붓질 268 — 매각완료 / goodsId 148</summary>

- 식별자 : `goodsId` 148 / `goodsCoPurchaseId` 280
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/148) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=148) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=148)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 9.3

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 280,
  "goodsId": 148,
  "goodsName": "붓질 268",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-06-29T14:00:00",
  "investEndDateTime": "2022-07-06T10:27:32",
  "saleYieldPercent": 9.3,
  "artistNameForKorean": "이배",
  "artistNameForEnglish": "Bae Lee",
  "titleForKorean": "붓질 268",
  "titleForEnglish": "Brushstroke 268",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/148/202206231834367ae3795a-5e5f-4bbd-909a-6bd8e2a2a236.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 148,
  "artwork": {
    "id": 148,
    "artist": {
      "id": 17,
      "artistName": "이배",
      "artistNameForEnglish": "Bae Lee",
      "artistNameForKorean": "이배",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "붓질 268(Brushstroke 268)",
    "material": "종이에 숯",
    "size1": 132,
    "size2": 163.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2020",
    "signatureInfo": "우측 하단",
    "provenance": "2022.06 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/148/20220623183124aa83ed28-ca20-4dfe-90e0-d14869d71bd4.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "붓질 268",
  "quantity": 13980,
  "pieceAmount": 10000,
  "estimateMinAmount": 132000000,
  "estimateMaxAmount": 195000000,
  "investBeginDateTime": "2022-06-29T14:00:00",
  "investEndDateTime": "2022-07-06T10:27:32",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 9.3,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/148/202206231834367ae3795a-5e5f-4bbd-909a-6bd8e2a2a236.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/148/2022062318343689b46a34-80a1-4440-8ccb-06b552b2d536.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 13980,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>13. 이건용 : The Method of Drawing 76-1-8-1 — 모집종료 / goodsId 147</summary>

- 식별자 : `goodsId` 147 / `goodsCoPurchaseId` 279
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/147) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=147) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=147)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 279,
  "goodsId": 147,
  "goodsName": "The Method of Drawing 76-1-8-1",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-06-23T14:00:00",
  "investEndDateTime": "2022-06-23T14:25:05",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이건용",
  "artistNameForEnglish": "Kun-Yong Lee",
  "titleForKorean": "",
  "titleForEnglish": "The Method of Drawing 76-1-8-1",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/147/20220616135532ad342d30-153f-481e-a5a5-0788a80ee890.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 147,
  "artwork": {
    "id": 147,
    "artist": {
      "id": 59,
      "artistName": "이건용",
      "artistNameForEnglish": "Kun-Yong Lee",
      "artistNameForKorean": "이건용",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "The Method of Drawing 76-1-8-1",
    "material": "Acrylic on canvas",
    "size1": 45.5,
    "size2": 33.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2015",
    "signatureInfo": "",
    "provenance": "Private Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/147/20220616135346657aa716-e577-4db6-9863-9639dcc81421.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "The Method of Drawing 76-1-8-1",
  "quantity": 5280,
  "pieceAmount": 10000,
  "estimateMinAmount": 50000000,
  "estimateMaxAmount": 73000000,
  "investBeginDateTime": "2022-06-23T14:00:00",
  "investEndDateTime": "2022-06-23T14:25:05",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/147/20220616135532ad342d30-153f-481e-a5a5-0788a80ee890.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/147/2022061613553372028356-894a-4a60-8986-a7a813a7f3cb.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/147/20220616135533918698b0-6ac0-44b4-9908-01bc414e091a.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/147/202206161355336f7e423d-4f9f-43a1-9d0e-3237e92c2af5.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 5280
}</code></pre>

</details>

<details>
<summary>14. 이우환 : 무제(2013) — 매각완료 / goodsId 146</summary>

- 식별자 : `goodsId` 146 / `goodsCoPurchaseId` 278
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/146) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=146) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=146)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 6.31

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 278,
  "goodsId": 146,
  "goodsName": "무제 (2013)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-06-16T14:00:00",
  "investEndDateTime": "2022-06-16T14:06:55",
  "saleYieldPercent": 6.31,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "무제(2013)",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/146/20220614111132f1046b15-1065-4e46-9e52-b8915f8305bc.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 146,
  "artwork": {
    "id": 146,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(2013)(Untitled)",
    "material": "Lithograph",
    "size1": 44,
    "size2": 59,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "edition of 250",
    "productionYear": "2013",
    "signatureInfo": "",
    "provenance": "K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/146/20220614110834c0ec6d64-6e18-4072-843f-8eb7d03b79e5.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2013)",
  "quantity": 1600,
  "pieceAmount": 10000,
  "estimateMinAmount": 15000000,
  "estimateMaxAmount": 22000000,
  "investBeginDateTime": "2022-06-16T14:00:00",
  "investEndDateTime": "2022-06-16T14:06:55",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 6.31,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/146/20220614111132f1046b15-1065-4e46-9e52-b8915f8305bc.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/146/2022061411113105488d3b-0bba-4253-ae99-35c499a0f196.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 1600,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>15. 우고 론디노네 : Dreiundzwanzigstermarzzweitausendundeinundzwanzig — 모집종료 / goodsId 145</summary>

- 식별자 : `goodsId` 145 / `goodsCoPurchaseId` 277
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/145) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=145) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=145)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 277,
  "goodsId": 145,
  "goodsName": "Dreiundzwanzigstermarzzweitausendundeinundzwanzig",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-06-14T14:00:00",
  "investEndDateTime": "2022-06-14T15:38:58",
  "saleYieldPercent": 0,
  "artistNameForKorean": "우고 론디노네",
  "artistNameForEnglish": "Ugo Rondinone",
  "titleForKorean": "",
  "titleForEnglish": "Dreiundzwanzigstermarzzweitausendundeinundzwanzig",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/145/2022060812131948adad59-d9c1-4894-9974-56ff955d7e15.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 145,
  "artwork": {
    "id": 145,
    "artist": {
      "id": 58,
      "artistName": "우고 론디노네",
      "artistNameForEnglish": "Ugo Rondinone",
      "artistNameForKorean": "우고 론디노네",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Dreiundzwanzigstermarzzweitausendundeinundzwanzig",
    "material": "Watercolour on canvas",
    "size1": 20,
    "size2": 30,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2021",
    "signatureInfo": "",
    "provenance": "K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/145/20220608121013c874475f-df7b-456e-a798-42d2768b35f3.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Dreiundzwanzigstermarzzweitausendundeinundzwanzig",
  "quantity": 7500,
  "pieceAmount": 10000,
  "estimateMinAmount": 71000000,
  "estimateMaxAmount": 105000000,
  "investBeginDateTime": "2022-06-14T14:00:00",
  "investEndDateTime": "2022-06-14T15:38:58",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/145/2022060812131948adad59-d9c1-4894-9974-56ff955d7e15.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 7500,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>16. 아담 핸들러 : Nintendo Ghost Abduction with Sweet Pink Clouds — 모집종료 / goodsId 144</summary>

- 식별자 : `goodsId` 144 / `goodsCoPurchaseId` 276
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/144) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=144) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=144)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 276,
  "goodsId": 144,
  "goodsName": "Nintendo Ghost Abduction with Sweet Pink Clouds",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-06-09T14:00:00",
  "investEndDateTime": "2022-06-09T14:01:38",
  "saleYieldPercent": 0,
  "artistNameForKorean": "아담 핸들러",
  "artistNameForEnglish": "Adam Handler",
  "titleForKorean": "",
  "titleForEnglish": "Nintendo Ghost Abduction with Sweet Pink Clouds",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/144/20220603134236fc6d19d3-31d2-4317-8f96-829df7db7fe3.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 144,
  "artwork": {
    "id": 143,
    "artist": {
      "id": 78,
      "artistName": "아담 핸들러",
      "artistNameForEnglish": "Adam Handler",
      "artistNameForKorean": "아담 핸들러",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Nintendo Ghost Abduction with Sweet Pink Clouds",
    "material": "Acrylic and oil stick on canvas",
    "size1": 76,
    "size2": 61,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2021",
    "signatureInfo": "",
    "provenance": "K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/143/2022060312245755f39ae8-e4cc-4849-ab78-313e2a27cebb.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Nintendo Ghost Abduction with Sweet Pink Clouds",
  "quantity": 1190,
  "pieceAmount": 10000,
  "estimateMinAmount": 11000000,
  "estimateMaxAmount": 16000000,
  "investBeginDateTime": "2022-06-09T14:00:00",
  "investEndDateTime": "2022-06-09T14:01:38",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/144/20220603134236fc6d19d3-31d2-4317-8f96-829df7db7fe3.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1190,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>17. 백남준 : Evolution, Revolution, Resolution (complete set of 8 prints) — 매각완료 / goodsId 143</summary>

- 식별자 : `goodsId` 143 / `goodsCoPurchaseId` 275
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/143) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=143) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=143)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 27.8

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 275,
  "goodsId": 143,
  "goodsName": "Evolution, Revolution, Resolution (complete set of 8 prints)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-06-03T14:00:00",
  "investEndDateTime": "2022-06-03T14:07:21",
  "saleYieldPercent": 27.8,
  "artistNameForKorean": "백남준",
  "artistNameForEnglish": "NamJune Paik",
  "titleForKorean": null,
  "titleForEnglish": "Evolution, Revolution, Resolution (complete set of 8 prints)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/143/202205301651293eed265c-7fcb-4833-a045-22f9b87b486f.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 143,
  "artwork": {
    "id": 142,
    "artist": {
      "id": 39,
      "artistName": "백남준",
      "artistNameForEnglish": "NamJune Paik",
      "artistNameForKorean": "백남준",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Evolution, Revolution, Resolution (complete set of 8 prints)",
    "material": "Lithograph and etching",
    "size1": 76,
    "size2": 57,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "edition of 64",
    "productionYear": "1989",
    "signatureInfo": null,
    "provenance": "Private Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/142/202205301651517f02f774-19b7-43b3-ba0c-bfb94cb0f8fc.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Evolution, Revolution, Resolution (complete set of 8 prints)",
  "quantity": 7000,
  "pieceAmount": 10000,
  "estimateMinAmount": 68000000,
  "estimateMaxAmount": 100000000,
  "investBeginDateTime": "2022-06-03T14:00:00",
  "investEndDateTime": "2022-06-03T14:07:21",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 27.8,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/143/202205301651293eed265c-7fcb-4833-a045-22f9b87b486f.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 7000
}</code></pre>

</details>

<details>
<summary>18. 이건용 : Bodyscape 76-1-2016 — 모집종료 / goodsId 142</summary>

- 식별자 : `goodsId` 142 / `goodsCoPurchaseId` 274
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/142) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=142) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=142)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 274,
  "goodsId": 142,
  "goodsName": "Bodyscape 76-1-2016",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-05-23T14:00:00",
  "investEndDateTime": "2022-05-24T18:29:32",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이건용",
  "artistNameForEnglish": "Kun-Yong Lee",
  "titleForKorean": "",
  "titleForEnglish": "Bodyscape 76-1-2016",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/142/202205181208320d6b854c-1589-4feb-a982-2963dc02c844.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 142,
  "artwork": {
    "id": 141,
    "artist": {
      "id": 59,
      "artistName": "이건용",
      "artistNameForEnglish": "Kun-Yong Lee",
      "artistNameForKorean": "이건용",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Bodyscape 76-1-2016",
    "material": "Acrylic on canvas",
    "size1": 34,
    "size2": 63,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "우측 하단",
    "provenance": "Private Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/141/2022051812062533f5b6c6-112b-4c8f-8e1e-671df94001c2.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Bodyscape 76-1-2016",
  "quantity": 7800,
  "pieceAmount": 10000,
  "estimateMinAmount": 74000000,
  "estimateMaxAmount": 109000000,
  "investBeginDateTime": "2022-05-23T14:00:00",
  "investEndDateTime": "2022-05-24T18:29:32",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/142/202205181208320d6b854c-1589-4feb-a982-2963dc02c844.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/142/20220520153806300e1b7c-180e-4fc8-a2b8-404a108b38b0.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/142/202205201538051dd9ac8c-cf15-4f6f-81f4-a969391580db.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 7800,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>19. 심문섭 : The Presentation — 모집종료 / goodsId 141</summary>

- 식별자 : `goodsId` 141 / `goodsCoPurchaseId` 273
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/141) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=141) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=141)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 273,
  "goodsId": 141,
  "goodsName": "The Presentation(2019)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-05-18T14:00:00",
  "investEndDateTime": "2022-05-19T00:59:13",
  "saleYieldPercent": 0,
  "artistNameForKorean": "심문섭",
  "artistNameForEnglish": "Moonseup Shim",
  "titleForKorean": "",
  "titleForEnglish": "The Presentation",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/141/20220512110011153d5bec-0984-49cf-ad1e-ed1d87bc0bd4.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 141,
  "artwork": {
    "id": 140,
    "artist": {
      "id": 77,
      "artistName": "심문섭",
      "artistNameForEnglish": "Moonseup Shim",
      "artistNameForKorean": "심문섭",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "The Presentation",
    "material": "Acrylic on canvas",
    "size1": 72.5,
    "size2": 52.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "",
    "provenance": "2022.04 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/140/20220512105824b0165c76-fb06-437c-a74b-be4edb2df666.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "The Presentation(2019)",
  "quantity": 3834,
  "pieceAmount": 10000,
  "estimateMinAmount": 36000000,
  "estimateMaxAmount": 53000000,
  "investBeginDateTime": "2022-05-18T14:00:00",
  "investEndDateTime": "2022-05-19T00:59:13",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/141/20220512110011153d5bec-0984-49cf-ad1e-ed1d87bc0bd4.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/141/20220512110011a47c2f3b-9679-4142-bc60-44521479dda3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/141/20220512110011b3d20d8b-46b8-42f6-93be-c85925a08a99.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3834,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>20. 야요이 쿠사마 : Pumpkin — 모집종료 / goodsId 140</summary>

- 식별자 : `goodsId` 140 / `goodsCoPurchaseId` 272
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/140) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=2&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=140) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=140)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 272,
  "goodsId": 140,
  "goodsName": "Pumpkin(1982)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-05-13T14:00:00",
  "investEndDateTime": "2022-05-13T15:11:31",
  "saleYieldPercent": 0,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "",
  "titleForEnglish": "Pumpkin",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/140/20220509155958ec9ff27a-85ad-4c5b-adeb-fe1a7bb6d487.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 140,
  "artwork": {
    "id": 139,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pumpkin",
    "material": "Lithograph and screenprint",
    "size1": 64.5,
    "size2": 54.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "edition 35/70",
    "productionYear": "1982",
    "signatureInfo": "우측 하단",
    "provenance": "2022.04 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/139/2022050915540734298f1a-826e-4d76-a805-49c034a734db.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pumpkin(1982)",
  "quantity": 14376,
  "pieceAmount": 10000,
  "estimateMinAmount": 140000000,
  "estimateMaxAmount": 200000000,
  "investBeginDateTime": "2022-05-13T14:00:00",
  "investEndDateTime": "2022-05-13T15:11:31",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/140/20220509155958ec9ff27a-85ad-4c5b-adeb-fe1a7bb6d487.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/140/202205091559583fb00c0c-66f4-4f45-a3b6-b0312fd4d743.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 14376,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-3"></a>

### 3페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=3) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>21. 우고 론디노네 : Sun 4 — 모집종료 / goodsId 139</summary>

- 식별자 : `goodsId` 139 / `goodsCoPurchaseId` 271
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/139) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=139) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=139)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 271,
  "goodsId": 139,
  "goodsName": "Sun 4",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-05-10T14:00:00",
  "investEndDateTime": "2022-05-10T14:40:27",
  "saleYieldPercent": 0,
  "artistNameForKorean": "우고 론디노네",
  "artistNameForEnglish": "Ugo Rondinone",
  "titleForKorean": "",
  "titleForEnglish": "Sun 4",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/139/202205061441517aa467fc-642c-4f99-8680-0a9b40640a4c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 139,
  "artwork": {
    "id": 136,
    "artist": {
      "id": 58,
      "artistName": "우고 론디노네",
      "artistNameForEnglish": "Ugo Rondinone",
      "artistNameForKorean": "우고 론디노네",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Sun 4",
    "material": "Silkscreen",
    "size1": 152.4,
    "size2": 152.4,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "edition AP 3/8",
    "productionYear": "2019",
    "signatureInfo": "우측 하단",
    "provenance": "2022.04 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/136/20220506134621e51b6ad4-3cc1-4a5b-91f3-6230fb1d4ddf.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Sun 4",
  "quantity": 3495,
  "pieceAmount": 10000,
  "estimateMinAmount": 33000000,
  "estimateMaxAmount": 48000000,
  "investBeginDateTime": "2022-05-10T14:00:00",
  "investEndDateTime": "2022-05-10T14:40:27",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/139/202205061441517aa467fc-642c-4f99-8680-0a9b40640a4c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/139/20220506144150b50bd421-7346-4446-beda-b8d4eb7fb6c0.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 3495
}</code></pre>

</details>

<details>
<summary>22. 김창열 : 회귀 SA95018 — 매각완료 / goodsId 136</summary>

- 식별자 : `goodsId` 136 / `goodsCoPurchaseId` 269
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/136) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=136) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=136)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 19.22

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 269,
  "goodsId": 136,
  "goodsName": "회귀(Recurrence) SA95018",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-05-06T14:00:00",
  "investEndDateTime": "2022-05-06T14:15:20",
  "saleYieldPercent": 19.22,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "회귀 SA95018",
  "titleForEnglish": "Recurrence SA95018",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/136/2022050312513158163632-0669-4a58-a8d0-17be11220c5e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 136,
  "artwork": {
    "id": 134,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "회귀 SA95018(Recurrence SA95018)",
    "material": "acrylic &amp; color on hemp cloth",
    "size1": 53,
    "size2": 72.7,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1995",
    "signatureInfo": "",
    "provenance": "2022.04 K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/134/202205031250307c5bf0dd-2b13-4a84-b1c1-9fe0b836d88e.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "회귀(Recurrence) SA95018",
  "quantity": 4194,
  "pieceAmount": 10000,
  "estimateMinAmount": 39000000,
  "estimateMaxAmount": 58000000,
  "investBeginDateTime": "2022-05-06T14:00:00",
  "investEndDateTime": "2022-05-06T14:15:20",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 19.22,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/136/2022050312513158163632-0669-4a58-a8d0-17be11220c5e.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/136/202205031251315e02b6d9-74ad-4ea7-b407-1d63b86cda87.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4194,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>23. 이우환 : 점으로부터 — 모집종료 / goodsId 137</summary>

- 식별자 : `goodsId` 137 / `goodsCoPurchaseId` 270
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/137) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=137) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=137)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 270,
  "goodsId": 137,
  "goodsName": "점으로부터(From Point, 1978)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-05-02T14:00:00",
  "investEndDateTime": "2022-05-03T11:52:01",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "점으로부터",
  "titleForEnglish": "From Point",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/137/20220428181913b5b7a1d0-3a38-410b-b111-28b816df5295.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 137,
  "artwork": {
    "id": 135,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "점으로부터(From Point)",
    "material": "oil and mineral pigment on canvas",
    "size1": 24.2,
    "size2": 33,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1978",
    "signatureInfo": "뒷면",
    "provenance": "2022.04.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//2022042818184183e7ff7b-e9fd-46ea-9c67-6ad1ca45e63e.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "점으로부터(From Point, 1978)",
  "quantity": 31148,
  "pieceAmount": 10000,
  "estimateMinAmount": 300000000,
  "estimateMaxAmount": 430000000,
  "investBeginDateTime": "2022-05-02T14:00:00",
  "investEndDateTime": "2022-05-03T11:52:01",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/137/20220428181913b5b7a1d0-3a38-410b-b111-28b816df5295.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/137/2022042818191838462def-e0d7-4d6c-8178-79b76cca6a98.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/137/2022042818192321bab258-ceab-4d8e-a074-c0e75b7032b6.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 31148,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>24. 랄프 플렉 : Stadion 17/VII — 모집종료 / goodsId 135</summary>

- 식별자 : `goodsId` 135 / `goodsCoPurchaseId` 268
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/135) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=135) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=135)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 268,
  "goodsId": 135,
  "goodsName": "Stadion 17/VII",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-04-20T14:00:00",
  "investEndDateTime": "2022-04-20T16:04:49",
  "saleYieldPercent": 0,
  "artistNameForKorean": "랄프 플렉",
  "artistNameForEnglish": "Ralph Fleck",
  "titleForKorean": "",
  "titleForEnglish": "Stadion 17/VII",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/135/202204061425467cd7db7f-6620-499f-a367-f294405f29f0.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 135,
  "artwork": {
    "id": 133,
    "artist": {
      "id": 75,
      "artistName": "랄프 플렉",
      "artistNameForEnglish": "Ralph Fleck",
      "artistNameForKorean": "랄프 플렉",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Stadion 17/VII",
    "material": "oil on canvas",
    "size1": 120,
    "size2": 100,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "2007",
    "signatureInfo": "뒷면",
    "provenance": "2022.03.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/133/20220406125459f235dc44-446e-465c-847f-fffde7dcd4d1.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Stadion 17/VII",
  "quantity": 2995,
  "pieceAmount": 10000,
  "estimateMinAmount": 28000000,
  "estimateMaxAmount": 41000000,
  "investBeginDateTime": "2022-04-20T14:00:00",
  "investEndDateTime": "2022-04-20T16:04:49",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/135/202204061425467cd7db7f-6620-499f-a367-f294405f29f0.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/135/2022040614255106ed8992-ba0c-4719-845b-e8a23bb3ac19.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 2995,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>25. 이우환 : 선으로부터 — 모집종료 / goodsId 134</summary>

- 식별자 : `goodsId` 134 / `goodsCoPurchaseId` 267
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/134) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=134) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=134)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 267,
  "goodsId": 134,
  "goodsName": "선으로부터(From Line, 1977)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-04-11T14:00:00",
  "investEndDateTime": "2022-04-12T15:55:14",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "선으로부터",
  "titleForEnglish": "From Line",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/134/2022040114311953147161-0678-49d1-881c-c80d08ba6629.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 134,
  "artwork": {
    "id": 130,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "선으로부터(From Line)",
    "material": "oil and mineral pigment on canvas",
    "size1": 40.5,
    "size2": 31.7,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "1977",
    "signatureInfo": "뒷면",
    "provenance": "2022.03.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/130/202204011427410c1b4888-e7bd-48c6-91ef-1d74978432a0.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "선으로부터(From Line, 1977)",
  "quantity": 38336,
  "pieceAmount": 10000,
  "estimateMinAmount": 370000000,
  "estimateMaxAmount": 480000000,
  "investBeginDateTime": "2022-04-11T14:00:00",
  "investEndDateTime": "2022-04-12T15:55:14",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/134/2022040114311953147161-0678-49d1-881c-c80d08ba6629.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/134/202204011431224e117d86-684a-41d0-be75-2afc518b569a.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/134/2022040114312713fec66a-8103-48d9-a3a2-b78f2a60e40e.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 38336
}</code></pre>

</details>

<details>
<summary>26. 이강소 : 청명(淸明)-18042 — 모집종료 / goodsId 133</summary>

- 식별자 : `goodsId` 133 / `goodsCoPurchaseId` 266
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/133) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=133) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=133)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 266,
  "goodsId": 133,
  "goodsName": "청명(淸明)-18042",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-04-05T14:00:00",
  "investEndDateTime": "2022-04-06T18:15:30",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이강소",
  "artistNameForEnglish": "Kangso Lee",
  "titleForKorean": "청명(淸明)-18042",
  "titleForEnglish": "Serenity-18042",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/133/202203311539030b2162a0-fa69-4098-a2d7-1a2749c2eef8.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 133,
  "artwork": {
    "id": 129,
    "artist": {
      "id": 47,
      "artistName": "이강소",
      "artistNameForEnglish": "Kangso Lee",
      "artistNameForKorean": "이강소",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "청명(淸明)-18042(Serenity-18042)",
    "material": "acrylic on canvas",
    "size1": 72.7,
    "size2": 90.9,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "2018",
    "signatureInfo": "뒷면",
    "provenance": "2022.03.K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/129/20220331151814fd7d4998-8291-4c97-ae1f-15c8f9ca07c5.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "청명(淸明)-18042",
  "quantity": 8388,
  "pieceAmount": 10000,
  "estimateMinAmount": 79000000,
  "estimateMaxAmount": 117000000,
  "investBeginDateTime": "2022-04-05T14:00:00",
  "investEndDateTime": "2022-04-06T18:15:30",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/133/202203311539030b2162a0-fa69-4098-a2d7-1a2749c2eef8.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/133/202203311539084cf9197f-b221-4ae4-a915-96c4612b1096.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/133/2022033115391250c9c051-4b61-4b45-9fa6-1d44d2291c9c.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 8388,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>27. 마키 호소카와 : Let's Go to Seattle! — 모집종료 / goodsId 132</summary>

- 식별자 : `goodsId` 132 / `goodsCoPurchaseId` 265
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/132) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=132) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=132)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 265,
  "goodsId": 132,
  "goodsName": "Let's Go to Seattle!",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-04-01T14:00:00",
  "investEndDateTime": "2022-04-01T14:40:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "마키 호소카와",
  "artistNameForEnglish": "Maki Hosokawa",
  "titleForKorean": "",
  "titleForEnglish": "Let's Go to Seattle!",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/132/20220328185734750877e7-8cdb-41c6-b812-4c9da05806cb.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 132,
  "artwork": {
    "id": 128,
    "artist": {
      "id": 74,
      "artistName": "마키 호소카와",
      "artistNameForEnglish": "Maki Hosokawa",
      "artistNameForKorean": "마키 호소카와",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Let's Go to Seattle!",
    "material": "acrylic on canvas",
    "size1": 50,
    "size2": 76,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "2011",
    "signatureInfo": "뒷면",
    "provenance": "2022.03.K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/128/2022032818541429cc1479-1de4-4c1e-a81c-26df881849cc.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Let's Go to Seattle!",
  "quantity": 3961,
  "pieceAmount": 10000,
  "estimateMinAmount": 37000000,
  "estimateMaxAmount": 55000000,
  "investBeginDateTime": "2022-04-01T14:00:00",
  "investEndDateTime": "2022-04-01T14:40:34",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/132/20220328185734750877e7-8cdb-41c6-b812-4c9da05806cb.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/132/202203281857385ef4505b-4a50-43b6-ab91-54e7a21cdb9b.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3961,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>28. 장마리아 : In Between - Spring Series — 모집종료 / goodsId 131</summary>

- 식별자 : `goodsId` 131 / `goodsCoPurchaseId` 264
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/131) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=131) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=131)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 264,
  "goodsId": 131,
  "goodsName": "In Between - Spring Series",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-03-30T14:00:00",
  "investEndDateTime": "2022-03-30T14:02:37",
  "saleYieldPercent": 0,
  "artistNameForKorean": "장마리아",
  "artistNameForEnglish": "Maria Chang",
  "titleForKorean": "",
  "titleForEnglish": "In Between - Spring Series",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/131/202203251911315575d2fe-a1e7-47f0-8f74-e6312a36eac5.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 131,
  "artwork": {
    "id": 127,
    "artist": {
      "id": 73,
      "artistName": "장마리아",
      "artistNameForEnglish": "Maria Chang",
      "artistNameForKorean": "장마리아",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "In Between - Spring Series",
    "material": "마포에 혼합재료",
    "size1": 116.8,
    "size2": 91,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "2021",
    "signatureInfo": "뒷면",
    "provenance": "2022.03.K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/127/202203251909391b029e1c-0698-4673-bae8-e5dbf806c366.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "In Between - Spring Series",
  "quantity": 2796,
  "pieceAmount": 10000,
  "estimateMinAmount": 26000000,
  "estimateMaxAmount": 39000000,
  "investBeginDateTime": "2022-03-30T14:00:00",
  "investEndDateTime": "2022-03-30T14:02:37",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/131/202203251911315575d2fe-a1e7-47f0-8f74-e6312a36eac5.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/131/20220325191139b81f365f-4dad-4e31-abac-c353ab4dbfaf.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 2796,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>29. 토모카즈 마츠야마 : The Couch Unsent Piano — 모집종료 / goodsId 130</summary>

- 식별자 : `goodsId` 130 / `goodsCoPurchaseId` 263
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/130) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=130) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=130)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 263,
  "goodsId": 130,
  "goodsName": "The Couch Unsent Piano",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-03-23T14:00:00",
  "investEndDateTime": "2022-03-23T14:01:10",
  "saleYieldPercent": 0,
  "artistNameForKorean": "토모카즈 마츠야마",
  "artistNameForEnglish": "Tomokazu Matsuyama",
  "titleForKorean": "",
  "titleForEnglish": "The Couch Unsent Piano",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/130/20220317175539b46272cb-6f18-41e7-ab27-b6f602a47eeb.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 130,
  "artwork": {
    "id": 126,
    "artist": {
      "id": 70,
      "artistName": "토모카즈 마츠야마",
      "artistNameForEnglish": "Tomokazu Matsuyama",
      "artistNameForKorean": "토모카즈 마츠야마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "The Couch Unsent Piano",
    "material": "Digital print featuring screen printed pearlised ink, white gloss and hand applied gold leaf",
    "size1": 89.5,
    "size2": 57.6,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "ed.24/100",
    "productionYear": "2020",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/126/20220317174659e9544351-e771-4170-90df-d0d325fb27bd.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "The Couch Unsent Piano",
  "quantity": 850,
  "pieceAmount": 10000,
  "estimateMinAmount": 8000000,
  "estimateMaxAmount": 11000000,
  "investBeginDateTime": "2022-03-23T14:00:00",
  "investEndDateTime": "2022-03-23T14:01:10",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/130/20220317175539b46272cb-6f18-41e7-ab27-b6f602a47eeb.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/130/20220317175545eddb5745-f0da-4af6-b8a9-6490686a170d.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/130/2022031717555223d833c1-8ff2-4c3c-9ec9-84791fe7c248.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/130/202203171756008e41789b-8e34-461d-b9c6-80ed5e4fd350.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 850
}</code></pre>

</details>

<details>
<summary>30. 윤명로 : 겸재예찬 M II 225 — 모집종료 / goodsId 129</summary>

- 식별자 : `goodsId` 129 / `goodsCoPurchaseId` 262
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/129) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=3&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=129) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=129)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 262,
  "goodsId": 129,
  "goodsName": "겸재예찬 M II 225",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-03-17T14:00:00",
  "investEndDateTime": "2022-03-17T14:04:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "윤명로",
  "artistNameForEnglish": "Myungro Yoon",
  "titleForKorean": "겸재예찬 M II 225",
  "titleForEnglish": "Homage to the Gyeomjae M II 225",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/129/202203071524034b993c9b-a69b-4eca-89e5-d4e456b3be70.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 129,
  "artwork": {
    "id": 125,
    "artist": {
      "id": 72,
      "artistName": "윤명로",
      "artistNameForEnglish": "Myungro Yoon",
      "artistNameForKorean": "윤명로",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "겸재예찬 M II 225(Homage to the Gyeomjae M II 225)",
    "material": "acrylic, iron powder and binder on cotton",
    "size1": 72,
    "size2": 60,
    "size3": 0,
    "size3Type": "cm",
    "setComposition": false,
    "edition": "",
    "productionYear": "2002",
    "signatureInfo": "signed, titled and dated on the reverse",
    "provenance": "2022.02. Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/125/20220307114232072942fb-a706-4881-bd61-c3742985ae4f.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "겸재예찬 M II 225",
  "quantity": 3416,
  "pieceAmount": 10000,
  "estimateMinAmount": 32000000,
  "estimateMaxAmount": 47000000,
  "investBeginDateTime": "2022-03-17T14:00:00",
  "investEndDateTime": "2022-03-17T14:04:34",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/129/202203071524034b993c9b-a69b-4eca-89e5-d4e456b3be70.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/129/20220307152406367b89e4-d24e-4d4f-8ced-7778b709ea95.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/129/20220307152409a133311a-15da-4adf-92cb-395b1e7110dc.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3416,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-4"></a>

### 4페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=4) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>31. 야요이 쿠사마 : Pumpkin — 모집종료 / goodsId 128</summary>

- 식별자 : `goodsId` 128 / `goodsCoPurchaseId` 261
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/128) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=128) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=128)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 261,
  "goodsId": 128,
  "goodsName": "Pumpkin(1983)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-03-10T14:00:00",
  "investEndDateTime": "2022-03-10T14:04:29",
  "saleYieldPercent": 0,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "",
  "titleForEnglish": "Pumpkin",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/20220304171952234308ac-518c-4d3a-a2cc-b17319cc40a7.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 128,
  "artwork": {
    "id": 124,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pumpkin",
    "material": "스크린프린트(Screenprint)",
    "size1": 68.1,
    "size2": 55.1,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed. 27/75",
    "productionYear": "1983",
    "signatureInfo": "signed, titled, dated and numbered on front",
    "provenance": "2022.02 Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//202203041719117327f072-5ea3-428a-a78f-2f247e8e7630.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pumpkin(1983)",
  "quantity": 16510,
  "pieceAmount": 10000,
  "estimateMinAmount": 158000000,
  "estimateMaxAmount": 210000000,
  "investBeginDateTime": "2022-03-10T14:00:00",
  "investEndDateTime": "2022-03-10T14:04:29",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/20220304171952234308ac-518c-4d3a-a2cc-b17319cc40a7.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/20220304171955485817be-aedf-481c-a88d-0f81125fff33.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/202203041719585522aae5-cbbd-4fcf-a6a1-1d985fec4a7b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/20220304172000d6f80e56-0710-43ec-b575-b6dd4fb24ae9.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/128/2022030417200362ecb282-bcb4-421e-bc53-a55b3959ad08.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 16510,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>32. 김창열 : 물방울 SN2014 — 모집종료 / goodsId 126</summary>

- 식별자 : `goodsId` 126 / `goodsCoPurchaseId` 260
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/126) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=126) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=126)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 260,
  "goodsId": 126,
  "goodsName": "물방울 SN2014",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-03-03T14:00:00",
  "investEndDateTime": "2022-03-03T14:02:45",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "물방울 SN2014",
  "titleForEnglish": "Waterdrops SN2014",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/126/202202252342598e27b52b-cfaf-4d29-8a20-dc628d22ff2c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 126,
  "artwork": {
    "id": 123,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "물방울 SN2014(Waterdrops SN2014)",
    "material": "마포에 유채(Oil on hemp cloth)",
    "size1": 33,
    "size2": 55,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2014",
    "signatureInfo": "",
    "provenance": "2022.02. K Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//2022022523370668ab1fdb-a1d0-48d3-81f8-6a69c01f000d.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "물방울 SN2014",
  "quantity": 5887,
  "pieceAmount": 10000,
  "estimateMinAmount": 55000000,
  "estimateMaxAmount": 82000000,
  "investBeginDateTime": "2022-03-03T14:00:00",
  "investEndDateTime": "2022-03-03T14:02:45",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/126/202202252342598e27b52b-cfaf-4d29-8a20-dc628d22ff2c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/126/20220225234319ada50a6d-39f4-4080-867a-297607757c94.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5887,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>33. 데이비드 호크니 : "Two Chairs with People" 2014 — 매각완료 / goodsId 125</summary>

- 식별자 : `goodsId` 125 / `goodsCoPurchaseId` 259
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/125) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=125) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=125)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 7.95

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 259,
  "goodsId": 125,
  "goodsName": "\"Two Chairs with People\" 2014",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-02-18T14:00:00",
  "investEndDateTime": "2022-02-18T14:24:38",
  "saleYieldPercent": 7.95,
  "artistNameForKorean": "데이비드 호크니",
  "artistNameForEnglish": "David Hockney",
  "titleForKorean": "",
  "titleForEnglish": "\"Two Chairs with People\" 2014",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/125/20220211182210f5927a73-e458-4e9a-a992-feee6b9efb3d.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 125,
  "artwork": {
    "id": 122,
    "artist": {
      "id": 38,
      "artistName": "데이비드 호크니",
      "artistNameForEnglish": "David Hockney",
      "artistNameForKorean": "데이비드 호크니",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "\"Two Chairs with People\" 2014",
    "material": "포토그래픽 드로잉 프린트(Photographic Drawings)",
    "size1": 108,
    "size2": 176.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition 20 of 25",
    "productionYear": "2014",
    "signatureInfo": "signed, dated and numbered on the front",
    "provenance": "Private Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//20220211182132611a698c-71ec-49e9-91c5-100eba5ed6ae.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "\"Two Chairs with People\" 2014",
  "quantity": 8800,
  "pieceAmount": 10000,
  "estimateMinAmount": 83000000,
  "estimateMaxAmount": 123000000,
  "investBeginDateTime": "2022-02-18T14:00:00",
  "investEndDateTime": "2022-02-18T14:24:38",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 7.95,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/125/20220211182210f5927a73-e458-4e9a-a992-feee6b9efb3d.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/125/20220216152237849b2bc4-8379-4f92-9afa-52bdbfd3caee.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/125/20220216152222cf4d3d62-c1eb-463d-8d01-82bf6853f383.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/125/202202161446019433d1a5-b037-4ec4-abb8-31d3a54cd7f2.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 8800
}</code></pre>

</details>

<details>
<summary>34. 박서보 : 묘법 시리즈 V-17 — 모집종료 / goodsId 124</summary>

- 식별자 : `goodsId` 124 / `goodsCoPurchaseId` 258
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/124) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=124) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=124)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 258,
  "goodsId": 124,
  "goodsName": "묘법 시리즈 V-17",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-02-11T14:00:00",
  "investEndDateTime": "2022-02-11T14:08:39",
  "saleYieldPercent": 0,
  "artistNameForKorean": "박서보",
  "artistNameForEnglish": "Seobo Park",
  "titleForKorean": "묘법 시리즈 V-17",
  "titleForEnglish": "Écriture Series V-17",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/124/20220207133024c60ef122-bef5-44ca-aa09-345097022685.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 124,
  "artwork": {
    "id": 121,
    "artist": {
      "id": 35,
      "artistName": "박서보",
      "artistNameForEnglish": "Seobo Park",
      "artistNameForKorean": "박서보",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "묘법 시리즈 V-17(Écriture Series V-17)",
    "material": "Mixografia® monotype on hand made paper",
    "size1": 74.3,
    "size2": 99,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1994",
    "signatureInfo": "signed and dated on the lower left",
    "provenance": "2022.01.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//20220207122137dd89e274-14d5-4d3c-a2ae-73856bae66e9.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "묘법 시리즈 V-17",
  "quantity": 3793,
  "pieceAmount": 10000,
  "estimateMinAmount": 33000000,
  "estimateMaxAmount": 49000000,
  "investBeginDateTime": "2022-02-11T14:00:00",
  "investEndDateTime": "2022-02-11T14:08:39",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/124/20220207133024c60ef122-bef5-44ca-aa09-345097022685.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/124/2022020713303389b4d81f-8ac3-4dac-b891-0d9b8e3e8af6.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3793,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>35. 노은님 : 무서운 바다 — 모집종료 / goodsId 123</summary>

- 식별자 : `goodsId` 123 / `goodsCoPurchaseId` 257
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/123) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=123) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=123)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 257,
  "goodsId": 123,
  "goodsName": "무서운 바다",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-02-07T14:00:00",
  "investEndDateTime": "2022-02-07T14:30:22",
  "saleYieldPercent": 0,
  "artistNameForKorean": "노은님",
  "artistNameForEnglish": "Eunnim Ro",
  "titleForKorean": "무서운 바다",
  "titleForEnglish": "Scary Sea",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/123/202201261705403bf81879-26df-48b6-abcb-6d951e8f30ad.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 123,
  "artwork": {
    "id": 120,
    "artist": {
      "id": 69,
      "artistName": "노은님",
      "artistNameForEnglish": "Eunnim Ro",
      "artistNameForKorean": "노은님",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무서운 바다(Scary Sea)",
    "material": "acrylic on paper",
    "size1": 70.5,
    "size2": 140.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2007",
    "signatureInfo": "signed and dated on the lower right",
    "provenance": "2022.01.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/120/2022012617000675ea43fc-8e3d-442b-84b0-f9d6fbb88774.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무서운 바다",
  "quantity": 3570,
  "pieceAmount": 10000,
  "estimateMinAmount": 33000000,
  "estimateMaxAmount": 49000000,
  "investBeginDateTime": "2022-02-07T14:00:00",
  "investEndDateTime": "2022-02-07T14:30:22",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/123/202201261705403bf81879-26df-48b6-abcb-6d951e8f30ad.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/123/20220126180002c7d202fa-b5b7-4c1f-baae-3dfbefa99f2e.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3570,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>36. 이강소 : An Island - 07015 — 매각완료 / goodsId 122</summary>

- 식별자 : `goodsId` 122 / `goodsCoPurchaseId` 256
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/122) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=122) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=122)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 24.86

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 256,
  "goodsId": 122,
  "goodsName": "An Island - 07015",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2022-01-20T14:00:00",
  "investEndDateTime": "2022-01-26T18:17:07",
  "saleYieldPercent": 24.86,
  "artistNameForKorean": "이강소",
  "artistNameForEnglish": "Kangso Lee",
  "titleForKorean": "",
  "titleForEnglish": "An Island - 07015",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/122/2022012711521196e1415c-7ef3-42ad-b2a3-d280ac6bfb5d.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 122,
  "artwork": {
    "id": 119,
    "artist": {
      "id": 47,
      "artistName": "이강소",
      "artistNameForEnglish": "Kangso Lee",
      "artistNameForKorean": "이강소",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "An Island - 07015",
    "material": "캔버스에 유채(oil on canvas)",
    "size1": 130.3,
    "size2": 162,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2007",
    "signatureInfo": "signed, titled, and dated on the reverse",
    "provenance": "2021.12.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/119/20220127115244d4dece62-b733-4131-8bed-8e15f8dc40a6.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "An Island - 07015",
  "quantity": 9036,
  "pieceAmount": 10000,
  "estimateMinAmount": 85000000,
  "estimateMaxAmount": 126000000,
  "investBeginDateTime": "2022-01-20T14:00:00",
  "investEndDateTime": "2022-01-26T18:17:07",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 24.86,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/122/2022012711521196e1415c-7ef3-42ad-b2a3-d280ac6bfb5d.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/122/20220127115216d3959f4e-84ab-4d30-b71a-038521a648c1.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/122/2022012711522179d6310a-2d42-4530-ac9b-75d65fb01ec5.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 9036,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>37. 김구림 : 음양 7-S. 169 — 모집종료 / goodsId 121</summary>

- 식별자 : `goodsId` 121 / `goodsCoPurchaseId` 255
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/121) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=121) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=121)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 255,
  "goodsId": 121,
  "goodsName": "음양7-S. 169",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2022-01-13T14:00:00",
  "investEndDateTime": "2022-01-14T17:46:18",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김구림",
  "artistNameForEnglish": "Kulim Kim",
  "titleForKorean": "음양 7-S. 169",
  "titleForEnglish": "Yin and Yang 7-S. 169",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/121/20211228174333ad429f2b-15b9-40c5-9a0f-f0a72f28e71b.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 121,
  "artwork": {
    "id": 117,
    "artist": {
      "id": 68,
      "artistName": "김구림",
      "artistNameForEnglish": "Kulim Kim",
      "artistNameForKorean": "김구림",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "음양 7-S. 169(Yin and Yang 7-S. 169)",
    "material": "acrylic, collage and digital print on canvas",
    "size1": 112,
    "size2": 144.4,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2007",
    "signatureInfo": "signed, titled, and dated on the reverse",
    "provenance": "2021.12.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/117/202112271822412296d6e5-111c-48ce-b253-51bbf76974bc.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "음양7-S. 169",
  "quantity": 10040,
  "pieceAmount": 10000,
  "estimateMinAmount": 95000000,
  "estimateMaxAmount": 140000000,
  "investBeginDateTime": "2022-01-13T14:00:00",
  "investEndDateTime": "2022-01-14T17:46:18",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/121/20211228174333ad429f2b-15b9-40c5-9a0f-f0a72f28e71b.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/121/20211228174508ebf5d95a-3549-4281-8cd8-2149168d0116.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/121/2021122817451421fa7b55-be3c-441d-8f0c-97acde903659.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 10040
}</code></pre>

</details>

<details>
<summary>38. 데미안 허스트 : Oleandrin — 모집종료 / goodsId 119</summary>

- 식별자 : `goodsId` 119 / `goodsCoPurchaseId` 254
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/119) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=119) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=119)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 254,
  "goodsId": 119,
  "goodsName": "Oleandrin",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-12-30T14:00:00",
  "investEndDateTime": "2022-01-03T18:25:33",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": "",
  "titleForEnglish": "Oleandrin",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/119/20211222163906305b0b17-e6ec-4fb0-a395-8c4ae786619e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 119,
  "artwork": {
    "id": 116,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Oleandrin",
    "material": "household gloss on canvas",
    "size1": 37.2,
    "size2": 33.2,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2010",
    "signatureInfo": "signed, titled, and dated on the reverse",
    "provenance": "2021.12. Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/116/20211222163308aa4309a6-bc0c-4698-b5c8-94de1354bc97.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Oleandrin",
  "quantity": 25630,
  "pieceAmount": 10000,
  "estimateMinAmount": 243000000,
  "estimateMaxAmount": 358000000,
  "investBeginDateTime": "2021-12-30T14:00:00",
  "investEndDateTime": "2022-01-03T18:25:33",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/119/20211222163906305b0b17-e6ec-4fb0-a395-8c4ae786619e.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/119/20211222163906822a71d3-0a24-47f0-aacf-4d74dd402e59.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/119/202112221639060401c8a0-a287-4594-a7fe-4feb75b90209.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/119/20211222163907404ae142-2edd-47b6-9214-576d6a2405d0.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 25630,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>39. 아야코 록카쿠 : 무제 — 모집종료 / goodsId 117</summary>

- 식별자 : `goodsId` 117 / `goodsCoPurchaseId` 253
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/117) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=117) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=117)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 253,
  "goodsId": 117,
  "goodsName": "무제 (2006)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-12-17T14:00:00",
  "investEndDateTime": "2021-12-27T15:52:48",
  "saleYieldPercent": 0,
  "artistNameForKorean": "아야코 록카쿠",
  "artistNameForEnglish": "Rokkaku Ayako",
  "titleForKorean": "무제",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/117/20211213180412879f6982-d1aa-4a74-b4c4-100a61537ba8.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 117,
  "artwork": {
    "id": 115,
    "artist": {
      "id": 67,
      "artistName": "아야코 록카쿠",
      "artistNameForEnglish": "Rokkaku Ayako",
      "artistNameForKorean": "아야코 록카쿠",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(Untitled)",
    "material": "acrylic on cardboard",
    "size1": 50.3,
    "size2": 58.6,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2006",
    "signatureInfo": "",
    "provenance": "2021.11.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/115/20211213175945eaf5cb0a-e504-4e4b-9345-3c450107fbfb.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2006)",
  "quantity": 12829,
  "pieceAmount": 10000,
  "estimateMinAmount": 121000000,
  "estimateMaxAmount": 179000000,
  "investBeginDateTime": "2021-12-17T14:00:00",
  "investEndDateTime": "2021-12-27T15:52:48",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/117/20211213180412879f6982-d1aa-4a74-b4c4-100a61537ba8.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 12829,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>40. 알렉스 카츠 : Wildflowers — 모집종료 / goodsId 116</summary>

- 식별자 : `goodsId` 116 / `goodsCoPurchaseId` 252
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/116) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=4&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=116) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=116)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 252,
  "goodsId": 116,
  "goodsName": "Wildflowers",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-12-13T14:00:00",
  "investEndDateTime": "2021-12-13T14:06:24",
  "saleYieldPercent": 0,
  "artistNameForKorean": "알렉스 카츠",
  "artistNameForEnglish": "Alex Katz",
  "titleForKorean": "",
  "titleForEnglish": "Wildflowers",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/116/20211209123021e7840b73-60d5-4842-a6db-70ce0ce65936.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 116,
  "artwork": {
    "id": 114,
    "artist": {
      "id": 61,
      "artistName": "알렉스 카츠",
      "artistNameForEnglish": "Alex Katz",
      "artistNameForKorean": "알렉스 카츠",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Wildflowers",
    "material": "Silkscreen",
    "size1": 100.5,
    "size2": 126,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "A.P. 15/20 (plus 60 artist's proofs)",
    "productionYear": "2017",
    "signatureInfo": "",
    "provenance": "2021.11.23_서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//20211209122947db38a182-7c28-4410-b222-734f21ad8d59.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Wildflowers",
  "quantity": 1785,
  "pieceAmount": 10000,
  "estimateMinAmount": 16000000,
  "estimateMaxAmount": 24000000,
  "investBeginDateTime": "2021-12-13T14:00:00",
  "investEndDateTime": "2021-12-13T14:06:24",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/116/20211209123021e7840b73-60d5-4842-a6db-70ce0ce65936.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1785,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-5"></a>

### 5페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=5) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>41. 알렉스 카츠 : Vivien with Hat — 매각완료 / goodsId 115</summary>

- 식별자 : `goodsId` 115 / `goodsCoPurchaseId` 251
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/115) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=115) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=115)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 23.26

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 251,
  "goodsId": 115,
  "goodsName": "Vivien with Hat",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-12-09T14:00:00",
  "investEndDateTime": "2021-12-09T15:09:56",
  "saleYieldPercent": 23.26,
  "artistNameForKorean": "알렉스 카츠",
  "artistNameForEnglish": "Alex Katz",
  "titleForKorean": "",
  "titleForEnglish": "Vivien with Hat",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/115/202112011401225d45c6e7-8fcd-436c-baf2-0ccb22430ead.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 115,
  "artwork": {
    "id": 113,
    "artist": {
      "id": 61,
      "artistName": "알렉스 카츠",
      "artistNameForEnglish": "Alex Katz",
      "artistNameForKorean": "알렉스 카츠",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Vivien with Hat",
    "material": "archival pigment print",
    "size1": 91.5,
    "size2": 121.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.131/150",
    "productionYear": "2021",
    "signatureInfo": "",
    "provenance": "2021.11.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//20211201140057c8e53060-8952-4a99-8730-85e3099124f1.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Vivien with Hat",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 42000000,
  "estimateMaxAmount": 62000000,
  "investBeginDateTime": "2021-12-09T14:00:00",
  "investEndDateTime": "2021-12-09T15:09:56",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 23.26,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/115/202112011401225d45c6e7-8fcd-436c-baf2-0ccb22430ead.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 4462
}</code></pre>

</details>

<details>
<summary>42. 조엘 메슬러 : 무제 (c) — 모집종료 / goodsId 114</summary>

- 식별자 : `goodsId` 114 / `goodsCoPurchaseId` 250
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/114) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=114) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=114)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 250,
  "goodsId": 114,
  "goodsName": "Untitled (c)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-12-02T14:00:00",
  "investEndDateTime": "2021-12-06T17:10:05",
  "saleYieldPercent": 0,
  "artistNameForKorean": "조엘 메슬러",
  "artistNameForEnglish": "Joel Mesler",
  "titleForKorean": "무제 (c)",
  "titleForEnglish": "Untitled (c)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/114/20211126130227250b6c0b-cbdd-421c-9a05-d1d5a6a89a13.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 114,
  "artwork": {
    "id": 112,
    "artist": {
      "id": 66,
      "artistName": "조엘 메슬러",
      "artistNameForEnglish": "Joel Mesler",
      "artistNameForKorean": "조엘 메슬러",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제 (c)(Untitled (c))",
    "material": "pigment on linen",
    "size1": 122,
    "size2": 101.4,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2018",
    "signatureInfo": "",
    "provenance": "2021.11.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/112/20211126130537a734529c-3bfe-418e-8bd8-32fd190ef16a.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled (c)",
  "quantity": 26772,
  "pieceAmount": 10000,
  "estimateMinAmount": 250000000,
  "estimateMaxAmount": 370000000,
  "investBeginDateTime": "2021-12-02T14:00:00",
  "investEndDateTime": "2021-12-06T17:10:05",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/114/20211126130227250b6c0b-cbdd-421c-9a05-d1d5a6a89a13.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/114/2021112613023154cf09c0-e765-4f95-82fe-58487e1fe11a.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/114/2021112613023675735b99-9f91-4f44-b114-fecc1f3211d6.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 26772,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>43. 김태호 : 내재율 2014-3 — 모집종료 / goodsId 113</summary>

- 식별자 : `goodsId` 113 / `goodsCoPurchaseId` 249
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/113) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=113) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=113)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 249,
  "goodsId": 113,
  "goodsName": "내재율(Internal Rhythm) 2014-3",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-11-26T14:00:00",
  "investEndDateTime": "2021-11-28T13:59:14",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김태호",
  "artistNameForEnglish": "Taeho Kim",
  "titleForKorean": "내재율 2014-3",
  "titleForEnglish": "Internal Rhythm 2014-3",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/113/20211125144011811a25c0-fdba-442a-b11b-a07f70a530b7.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 113,
  "artwork": {
    "id": 111,
    "artist": {
      "id": 65,
      "artistName": "김태호",
      "artistNameForEnglish": "Taeho Kim",
      "artistNameForKorean": "김태호",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "내재율 2014-3(Internal Rhythm 2014-3)",
    "material": "캔버스에 아크릴릭(acrylic on canvas)",
    "size1": 72.6,
    "size2": 60.8,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2014",
    "signatureInfo": "뒷면",
    "provenance": "2021.11.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/111/20211129124921f4290c87-6c97-40cb-adbf-06b355120220.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "내재율(Internal Rhythm) 2014-3",
  "quantity": 5355,
  "pieceAmount": 10000,
  "estimateMinAmount": 50000000,
  "estimateMaxAmount": 74000000,
  "investBeginDateTime": "2021-11-26T14:00:00",
  "investEndDateTime": "2021-11-28T13:59:14",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/113/20211125144011811a25c0-fdba-442a-b11b-a07f70a530b7.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/113/202111251440164bdb62bb-3198-45ca-9620-f0ba3eae98df.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5355,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>44. 김태호 : Internal Rhythm 2017-76-P, 2016-23-P, 2011-58-P (Set of 3) — 모집종료 / goodsId 112</summary>

- 식별자 : `goodsId` 112 / `goodsCoPurchaseId` 248
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/112) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=112) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=112)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 248,
  "goodsId": 112,
  "goodsName": "Internal Rhythm 2017-76-P, 2016-23-P, 2011-58-P (Set of 3)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-11-23T14:00:00",
  "investEndDateTime": "2021-11-23T14:22:49",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김태호",
  "artistNameForEnglish": "Taeho Kim",
  "titleForKorean": "",
  "titleForEnglish": "Internal Rhythm 2017-76-P, 2016-23-P, 2011-58-P (Set of 3)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/112/20250730154505655dbb5d-8566-44e8-b2e2-8c047738dc91.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 112,
  "artwork": {
    "id": 109,
    "artist": {
      "id": 65,
      "artistName": "김태호",
      "artistNameForEnglish": "Taeho Kim",
      "artistNameForKorean": "김태호",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Internal Rhythm 2017-76-P, 2016-23-P, 2011-58-P (Set of 3)",
    "material": "캔버스에 실크스크린, 혼합재료(Silk Screen and Mixed Media on Canvas)",
    "size1": 53,
    "size2": 45.4,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed. 44/100",
    "productionYear": "2021",
    "signatureInfo": "옆면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/109/20250730171724f2edc6b2-d575-42c8-b70e-17717efbf9ed.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Internal Rhythm 2017-76-P, 2016-23-P, 2011-58-P (Set of 3)",
  "quantity": 2100,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 29000000,
  "investBeginDateTime": "2021-11-23T14:00:00",
  "investEndDateTime": "2021-11-23T14:22:49",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/112/20250730154505655dbb5d-8566-44e8-b2e2-8c047738dc91.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/112/20250730145120ce444df9-d3a1-430b-95f1-f0757632b28c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/112/202507301451206f9995e6-4125-4bb4-8a1d-29e314dca5b0.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/112/20250730145120eb59454b-9a2e-407b-83ff-d3fe6ea49632.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 2100,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>45. 최영욱 : Karma — 모집종료 / goodsId 111</summary>

- 식별자 : `goodsId` 111 / `goodsCoPurchaseId` 247
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/111) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=111) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=111)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 247,
  "goodsId": 111,
  "goodsName": "Karma",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-11-19T14:00:00",
  "investEndDateTime": "2021-11-19T14:27:15",
  "saleYieldPercent": 0,
  "artistNameForKorean": "최영욱",
  "artistNameForEnglish": "Youngwook Choi",
  "titleForKorean": "",
  "titleForEnglish": "Karma",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/111/202111151229006d79c393-4e8a-4214-80dd-a858fc4b5a7e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 111,
  "artwork": {
    "id": 108,
    "artist": {
      "id": 64,
      "artistName": "최영욱",
      "artistNameForEnglish": "Youngwook Choi",
      "artistNameForKorean": "최영욱",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Karma",
    "material": "캔버스에 혼합재료(mixed media on canvas)",
    "size1": 70,
    "size2": 72,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2011",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/108/202111191626290ff33bd7-5db0-4a9e-b677-3600c067f068.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Karma",
  "quantity": 4200,
  "pieceAmount": 10000,
  "estimateMinAmount": 39000000,
  "estimateMaxAmount": 58000000,
  "investBeginDateTime": "2021-11-19T14:00:00",
  "investEndDateTime": "2021-11-19T14:27:15",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/111/202111151229006d79c393-4e8a-4214-80dd-a858fc4b5a7e.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 4200
}</code></pre>

</details>

<details>
<summary>46. 문형태 : Tagger — 모집종료 / goodsId 110</summary>

- 식별자 : `goodsId` 110 / `goodsCoPurchaseId` 246
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/110) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=110) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=110)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 246,
  "goodsId": 110,
  "goodsName": "Tagger",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-11-16T14:00:00",
  "investEndDateTime": "2021-11-16T14:08:09",
  "saleYieldPercent": 0,
  "artistNameForKorean": "문형태",
  "artistNameForEnglish": "Hyeongtae Moon",
  "titleForKorean": "",
  "titleForEnglish": "Tagger",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/110/202111121543109f5e329a-d4e2-4036-ad6b-45622d0db8d5.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 110,
  "artwork": {
    "id": 107,
    "artist": {
      "id": 63,
      "artistName": "문형태",
      "artistNameForEnglish": "Hyeongtae Moon",
      "artistNameForKorean": "문형태",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Tagger",
    "material": "Oil on Canvas(캔버스에 유채)",
    "size1": 72.7,
    "size2": 60.6,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "뒷면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//20211111205816e34be88c-040b-4543-a887-75202cce65d0.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Tagger",
  "quantity": 3990,
  "pieceAmount": 10000,
  "estimateMinAmount": 37000000,
  "estimateMaxAmount": 55000000,
  "investBeginDateTime": "2021-11-16T14:00:00",
  "investEndDateTime": "2021-11-16T14:08:09",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/110/202111121543109f5e329a-d4e2-4036-ad6b-45622d0db8d5.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3990,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>47. 데이비드 호크니 : Untitled No.13 from “The Yosemite Suite” — 매각완료 / goodsId 109</summary>

- 식별자 : `goodsId` 109 / `goodsCoPurchaseId` 245
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/109) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=109) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=109)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 14.47

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 245,
  "goodsId": 109,
  "goodsName": "Untitled No.13 from “The Yosemite Suite”",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-11-10T14:00:00",
  "investEndDateTime": "2021-11-10T19:25:49",
  "saleYieldPercent": 14.47,
  "artistNameForKorean": "데이비드 호크니",
  "artistNameForEnglish": "David Hockney",
  "titleForKorean": "",
  "titleForEnglish": "Untitled No.13 from “The Yosemite Suite”",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/109/20211104171101581ecf1d-319c-4be9-b74e-c30f744b6239.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 109,
  "artwork": {
    "id": 106,
    "artist": {
      "id": 38,
      "artistName": "데이비드 호크니",
      "artistNameForEnglish": "David Hockney",
      "artistNameForKorean": "데이비드 호크니",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Untitled No.13 from “The Yosemite Suite”",
    "material": "아이패드 드로잉 프린트(iPad drawing printed on paper)",
    "size1": 91.2,
    "size2": 69,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.13/25",
    "productionYear": "2010",
    "signatureInfo": "",
    "provenance": "2021.10.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork//202111041709426fb9ce69-a462-473e-a92e-e2297e6be0c8.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Untitled No.13 from “The Yosemite Suite”",
  "quantity": 11068,
  "pieceAmount": 10000,
  "estimateMinAmount": 105000000,
  "estimateMaxAmount": 154000000,
  "investBeginDateTime": "2021-11-10T14:00:00",
  "investEndDateTime": "2021-11-10T19:25:49",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 14.47,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/109/20211104171101581ecf1d-319c-4be9-b74e-c30f744b6239.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 11068,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>48. 김기린 : 무제 — 모집종료 / goodsId 108</summary>

- 식별자 : `goodsId` 108 / `goodsCoPurchaseId` 244
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/108) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=108) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=108)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 244,
  "goodsId": 108,
  "goodsName": "무제 (2002)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-11-04T14:00:00",
  "investEndDateTime": "2021-11-04T14:14:12",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김기린",
  "artistNameForEnglish": "GuiLine Kim",
  "titleForKorean": "무제",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/108/2021102815170474117ed6-b4de-4ef7-86c2-bf2652f7201b.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 108,
  "artwork": {
    "id": 105,
    "artist": {
      "id": 62,
      "artistName": "김기린",
      "artistNameForEnglish": "GuiLine Kim",
      "artistNameForKorean": "김기린",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(Untitled)",
    "material": "캔버스에 유채(Oil on canvas)",
    "size1": 54.9,
    "size2": 64.7,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2002",
    "signatureInfo": "signed, dated on the reverse",
    "provenance": "2021.10.Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/105/202110281515046fb0089d-49ff-4267-9c47-6a1b160240a5.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2002)",
  "quantity": 1806,
  "pieceAmount": 10000,
  "estimateMinAmount": 17000000,
  "estimateMaxAmount": 25000000,
  "investBeginDateTime": "2021-11-04T14:00:00",
  "investEndDateTime": "2021-11-04T14:14:12",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/108/2021102815170474117ed6-b4de-4ef7-86c2-bf2652f7201b.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/108/202110281517040cce85d3-419c-472f-abc7-4525fca66683.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/108/202110281517049a92efe7-a886-4032-bfa8-dbecaad2b83d.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1806,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>49. 야요이 쿠사마 : Lemon Squash — 모집종료 / goodsId 107</summary>

- 식별자 : `goodsId` 107 / `goodsCoPurchaseId` 243
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/107) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=107) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=107)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 243,
  "goodsId": 107,
  "goodsName": "Lemon Squash",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-10-29T14:00:00",
  "investEndDateTime": "2021-10-29T14:23:59",
  "saleYieldPercent": 0,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "",
  "titleForEnglish": "Lemon Squash",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/107/20211025110031497290e0-a600-4bc9-a605-16c880fddf9b.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 107,
  "artwork": {
    "id": 104,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Lemon Squash",
    "material": "석판화(Lithograph)",
    "size1": 37.5,
    "size2": 29,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 150 (plus 20 artist’s proofs)",
    "productionYear": "1992",
    "signatureInfo": "signed, titled ‘レモンスカッシュ’, dated and numbered on the recto",
    "provenance": "2021.09 Seoul Auction Autumn Sale",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/104/202110251053589ef5bd85-e857-4c72-a338-d6f6de1aad15.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Lemon Squash",
  "quantity": 3347,
  "pieceAmount": 10000,
  "estimateMinAmount": 31000000,
  "estimateMaxAmount": 46000000,
  "investBeginDateTime": "2021-10-29T14:00:00",
  "investEndDateTime": "2021-10-29T14:23:59",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/107/20211025110031497290e0-a600-4bc9-a605-16c880fddf9b.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/107/20211025110031fae8d6f1-859b-405a-be0c-1412a0843805.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 3347
}</code></pre>

</details>

<details>
<summary>50. 박서보 : Écriture No.010409 — 모집종료 / goodsId 106</summary>

- 식별자 : `goodsId` 106 / `goodsCoPurchaseId` 242
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/106) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=5&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=106) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=106)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 242,
  "goodsId": 106,
  "goodsName": "Écriture No.010409",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-10-25T14:00:00",
  "investEndDateTime": "2021-10-25T19:16:15",
  "saleYieldPercent": 0,
  "artistNameForKorean": "박서보",
  "artistNameForEnglish": "Seobo Park",
  "titleForKorean": "",
  "titleForEnglish": "Écriture No.010409",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/106/20211020155237e5dbeb2a-faf0-4eae-af24-ae830f88dfc6.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 106,
  "artwork": {
    "id": 102,
    "artist": {
      "id": 35,
      "artistName": "박서보",
      "artistNameForEnglish": "Seobo Park",
      "artistNameForKorean": "박서보",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Écriture No.010409",
    "material": "mixed media with Korean paper",
    "size1": 27,
    "size2": 35.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2001",
    "signatureInfo": "signed titled and dated on the reverse",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/102/2021102015533301b5f885-fe79-4564-8c90-4d13bef35480.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Écriture No.010409",
  "quantity": 9660,
  "pieceAmount": 10000,
  "estimateMinAmount": 90000000,
  "estimateMaxAmount": 150000000,
  "investBeginDateTime": "2021-10-25T14:00:00",
  "investEndDateTime": "2021-10-25T19:16:15",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/106/20211020155237e5dbeb2a-faf0-4eae-af24-ae830f88dfc6.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/106/20211020155200db27afba-7760-486d-a621-ffe448297d7e.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 9660,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-6"></a>

### 6페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=6) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>51. 알렉스 카츠 : Coca-Cola Girl 9 — 매각완료 / goodsId 104</summary>

- 식별자 : `goodsId` 104 / `goodsCoPurchaseId` 240
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/104) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=104) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=104)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 16.2

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 240,
  "goodsId": 104,
  "goodsName": "Coca-Cola Girl 9",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-10-22T14:00:00",
  "investEndDateTime": "2021-10-25T04:20:06",
  "saleYieldPercent": 16.2,
  "artistNameForKorean": "알렉스 카츠",
  "artistNameForEnglish": "Alex Katz",
  "titleForKorean": "",
  "titleForEnglish": "Coca-Cola Girl 9",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/104/202110271353081602131d-5e07-4695-bd51-a7c391f440fd.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 104,
  "artwork": {
    "id": 100,
    "artist": {
      "id": 61,
      "artistName": "알렉스 카츠",
      "artistNameForEnglish": "Alex Katz",
      "artistNameForKorean": "알렉스 카츠",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Coca-Cola Girl 9",
    "material": "silkscreen",
    "size1": 91,
    "size2": 259,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "A.P 20/20 (aside from the edition of 60)",
    "productionYear": "2019",
    "signatureInfo": "",
    "provenance": "2021.10 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/100/20211027135237b9b58362-1a77-4bbc-b780-72df6efc240f.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Coca-Cola Girl 9",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 42000000,
  "estimateMaxAmount": 62000000,
  "investBeginDateTime": "2021-10-22T14:00:00",
  "investEndDateTime": "2021-10-25T04:20:06",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 16.2,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/104/202110271353081602131d-5e07-4695-bd51-a7c391f440fd.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4462,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>52. 이우환 : Gateway to East (Set of 3) — 모집종료 / goodsId 105</summary>

- 식별자 : `goodsId` 105 / `goodsCoPurchaseId` 241
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/105) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=105) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=105)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 241,
  "goodsId": 105,
  "goodsName": "Gateway to East (Set of 3)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-10-20T14:00:00",
  "investEndDateTime": "2021-10-20T14:05:16",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "",
  "titleForEnglish": "Gateway to East (Set of 3)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/105/202110131727285fa0a106-c21d-4556-a5b3-30c946b7fefe.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 105,
  "artwork": {
    "id": 101,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Gateway to East (Set of 3)",
    "material": "애쿼틴트(aquatint)",
    "size1": 35.6,
    "size2": 29.6,
    "size3": 0,
    "size3Type": "height",
    "setComposition": true,
    "edition": "Edition of 50",
    "productionYear": "1998",
    "signatureInfo": "signed, numbered and dated on the recto",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/101/20211013154754235eef7e-2be2-43ab-93ad-bc37900c7eb5.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Gateway to East (Set of 3)",
  "quantity": 3000,
  "pieceAmount": 10000,
  "estimateMinAmount": 28000000,
  "estimateMaxAmount": 42000000,
  "investBeginDateTime": "2021-10-20T14:00:00",
  "investEndDateTime": "2021-10-20T14:05:16",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/105/202110131727285fa0a106-c21d-4556-a5b3-30c946b7fefe.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/105/202110131727280247be11-75ad-4d12-8d77-1b4ad1b82b9f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/105/20211013172728413efa4a-9ed7-463a-bf21-8dd7cc26f91c.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/105/2021101317272857a4a2cc-5735-44ef-901b-0667dea525f9.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>53. 이우환 : 무제(2000) — 모집종료 / goodsId 103</summary>

- 식별자 : `goodsId` 103 / `goodsCoPurchaseId` 239
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/103) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=103) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=103)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 239,
  "goodsId": 103,
  "goodsName": "무제 (2000)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-10-18T14:00:00",
  "investEndDateTime": "2021-10-18T16:29:38",
  "saleYieldPercent": 0,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "무제(2000)",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/103/2021100811140361e93cdf-1154-45cd-a420-90d35ec5ce0c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 103,
  "artwork": {
    "id": 99,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(2000)(Untitled)",
    "material": "종이에 수채(Color on paper)",
    "size1": 76.6,
    "size2": 57.3,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2000",
    "signatureInfo": "",
    "provenance": "2021.9.28_서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/99/202110061636512fe6d7b2-988f-4d6d-bec3-9a7e8900a54d.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2000)",
  "quantity": 9817,
  "pieceAmount": 10000,
  "estimateMinAmount": 93000000,
  "estimateMaxAmount": 137000000,
  "investBeginDateTime": "2021-10-18T14:00:00",
  "investEndDateTime": "2021-10-18T16:29:38",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/103/2021100811140361e93cdf-1154-45cd-a420-90d35ec5ce0c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/103/2021100811140378e23398-2c7f-4456-b8cf-7f0236ac9735.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 9817
}</code></pre>

</details>

<details>
<summary>54. 이우환 : With Winds — 매각완료 / goodsId 102</summary>

- 식별자 : `goodsId` 102 / `goodsCoPurchaseId` 238
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/102) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=102) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=102)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 24.93

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 238,
  "goodsId": 102,
  "goodsName": "With Winds",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-10-13T14:00:00",
  "investEndDateTime": "2021-10-14T11:26:27",
  "saleYieldPercent": 24.93,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": null,
  "titleForEnglish": "With Winds",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/102/2021100614201206a61cd7-a428-4967-be9c-73759ffb8b90.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 102,
  "artwork": {
    "id": 98,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "With Winds",
    "material": "oil and mineral pigment on canvas",
    "size1": 60.5,
    "size2": 72.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "1990",
    "signatureInfo": "signed titled and dated on the reverse",
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/98/202110061417111ec1694a-ab54-43f9-8fb4-079a3026813a.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "With Winds",
  "quantity": 22310,
  "pieceAmount": 10000,
  "estimateMinAmount": 230000000,
  "estimateMaxAmount": 350000000,
  "investBeginDateTime": "2021-10-13T14:00:00",
  "investEndDateTime": "2021-10-14T11:26:27",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 24.93,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/102/2021100614201206a61cd7-a428-4967-be9c-73759ffb8b90.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/102/20211006142012c193252e-5d8f-44c4-a710-201fa98032f5.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 22310,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>55. 하비에르 카예하 : Up to You — 모집종료 / goodsId 101</summary>

- 식별자 : `goodsId` 101 / `goodsCoPurchaseId` 237
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/101) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=101) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=101)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 237,
  "goodsId": 101,
  "goodsName": "Up to You",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-10-07T14:00:00",
  "investEndDateTime": "2021-10-07T14:19:38",
  "saleYieldPercent": 0,
  "artistNameForKorean": "하비에르 카예하",
  "artistNameForEnglish": "Javier Calleja",
  "titleForKorean": "",
  "titleForEnglish": "Up to You",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/101/20210930154807937cff0e-fa46-45c5-ba40-3927c53eee17.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 101,
  "artwork": {
    "id": 97,
    "artist": {
      "id": 60,
      "artistName": "하비에르 카예하",
      "artistNameForEnglish": "Javier Calleja",
      "artistNameForKorean": "하비에르 카예하",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Up to You",
    "material": "mixed media screenprint with lithograph",
    "size1": 98.1,
    "size2": 65.8,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 75",
    "productionYear": "2020",
    "signatureInfo": "signed, numbered on the recto",
    "provenance": "2021.09 서울옥션 AUTUMN SALE",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/97/20211012111916ab5c391b-f892-4527-81b9-b372b665f80a.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Up to You",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 42000000,
  "estimateMaxAmount": 62000000,
  "investBeginDateTime": "2021-10-07T14:00:00",
  "investEndDateTime": "2021-10-07T14:19:38",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/101/20210930154807937cff0e-fa46-45c5-ba40-3927c53eee17.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/101/20210930154842477706bf-fffa-4708-a85e-aa118558cbd0.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 4462,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>56. 데이비드 호크니 : Perspective Should be Reversed — 모집종료 / goodsId 100</summary>

- 식별자 : `goodsId` 100 / `goodsCoPurchaseId` 236
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/100) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=100) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=100)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 236,
  "goodsId": 100,
  "goodsName": "Perspective Should be Reversed",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-09-27T14:00:00",
  "investEndDateTime": "2021-09-27T14:23:44",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데이비드 호크니",
  "artistNameForEnglish": "David Hockney",
  "titleForKorean": "",
  "titleForEnglish": "Perspective Should be Reversed",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/100/20210916165049077095b8-e325-4ef1-9e6e-b2e6392d703e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 100,
  "artwork": {
    "id": 96,
    "artist": {
      "id": 38,
      "artistName": "데이비드 호크니",
      "artistNameForEnglish": "David Hockney",
      "artistNameForKorean": "데이비드 호크니",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Perspective Should be Reversed",
    "material": "포토그래픽 드로잉 프린트(photographic drawing printed on paper mounted on Dibond)",
    "size1": 107,
    "size2": 176,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 25",
    "productionYear": "2014",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/96/20210916164740a5bbcb8f-9828-467b-a657-108ef1468908.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Perspective Should be Reversed",
  "quantity": 14200,
  "pieceAmount": 10000,
  "estimateMinAmount": 134000000,
  "estimateMaxAmount": 198000000,
  "investBeginDateTime": "2021-09-27T14:00:00",
  "investEndDateTime": "2021-09-27T14:23:44",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/100/20210916165049077095b8-e325-4ef1-9e6e-b2e6392d703e.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 14200,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>57. 이건용 : 무제(2011) — 매각완료 / goodsId 98</summary>

- 식별자 : `goodsId` 98 / `goodsCoPurchaseId` 234
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/98) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=98) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=98)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 25.98

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 234,
  "goodsId": 98,
  "goodsName": "무제 (2011)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-09-15T14:00:00",
  "investEndDateTime": "2021-09-15T14:03:11",
  "saleYieldPercent": 25.98,
  "artistNameForKorean": "이건용",
  "artistNameForEnglish": "Kun-Yong Lee",
  "titleForKorean": "무제(2011)",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/98/202109101808499257fedc-cafb-4e62-a919-c84ff6372679.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 98,
  "artwork": {
    "id": 93,
    "artist": {
      "id": 59,
      "artistName": "이건용",
      "artistNameForEnglish": "Kun-Yong Lee",
      "artistNameForKorean": "이건용",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(2011)(Untitled)",
    "material": "캔버스에 아크릴(Acrylic on canvas)",
    "size1": 45.5,
    "size2": 38,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "2011",
    "signatureInfo": "signed and dated on the lower right, signed and inscribed '76-1-2011- on the reverse",
    "provenance": "2021.09 e-BID 라이브경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/93/20210910170909101cf7c7-3e67-4d76-9ec4-448cf7e483c0.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2011)",
  "quantity": 3570,
  "pieceAmount": 10000,
  "estimateMinAmount": 40000000,
  "estimateMaxAmount": 80000000,
  "investBeginDateTime": "2021-09-15T14:00:00",
  "investEndDateTime": "2021-09-15T14:03:11",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 25.98,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/98/202109101808499257fedc-cafb-4e62-a919-c84ff6372679.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/98/202109101808491914bb2b-fc46-40c0-bf2d-fbdae038d9e8.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 3570
}</code></pre>

</details>

<details>
<summary>58. 우고 론디노네 : Elftermärzzweitausendundsechzehn — 매각완료 / goodsId 97</summary>

- 식별자 : `goodsId` 97 / `goodsCoPurchaseId` 233
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/97) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=97) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=97)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 22.03

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 233,
  "goodsId": 97,
  "goodsName": "Elftermärzzweitausendundsechzehn",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-09-08T14:00:00",
  "investEndDateTime": "2021-09-08T14:50:03",
  "saleYieldPercent": 22.03,
  "artistNameForKorean": "우고 론디노네",
  "artistNameForEnglish": "Ugo Rondinone",
  "titleForKorean": null,
  "titleForEnglish": "Elftermärzzweitausendundsechzehn",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/97/20210901144513d63dadf7-b3f8-4536-8e63-82aa8fe8fc66.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 97,
  "artwork": {
    "id": 92,
    "artist": {
      "id": 58,
      "artistName": "우고 론디노네",
      "artistNameForEnglish": "Ugo Rondinone",
      "artistNameForKorean": "우고 론디노네",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Elftermärzzweitausendundsechzehn",
    "material": "캔버스에 아크릴(Acrylic on canvas)",
    "size1": 91.4,
    "size2": 60.9,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "2016",
    "signatureInfo": null,
    "provenance": "2021.07 K-Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/92/2021090115330731ea712c-ca36-48e7-8ed1-11a064e04bae.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Elftermärzzweitausendundsechzehn",
  "quantity": 10641,
  "pieceAmount": 10000,
  "estimateMinAmount": 100000000,
  "estimateMaxAmount": 200000000,
  "investBeginDateTime": "2021-09-08T14:00:00",
  "investEndDateTime": "2021-09-08T14:50:03",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 22.03,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/97/20210901144513d63dadf7-b3f8-4536-8e63-82aa8fe8fc66.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/97/2021090114451444269df0-7d81-44e7-ad2c-1a1bbb8ea4d2.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 10641,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>59. 우국원 : Frog B, Frog O — 모집종료 / goodsId 96</summary>

- 식별자 : `goodsId` 96 / `goodsCoPurchaseId` 232
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/96) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=96) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=96)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 232,
  "goodsId": 96,
  "goodsName": "Frog B, Frog O",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-09-01T14:00:00",
  "investEndDateTime": "2021-09-01T14:02:04",
  "saleYieldPercent": 0,
  "artistNameForKorean": "우국원",
  "artistNameForEnglish": "KukWon Woo",
  "titleForKorean": "",
  "titleForEnglish": "Frog B, Frog O",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/202108311516019aa55ef8-07be-4257-92a7-c6b4a061551e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 96,
  "artwork": {
    "id": 91,
    "artist": {
      "id": 57,
      "artistName": "우국원",
      "artistNameForEnglish": "KukWon Woo",
      "artistNameForKorean": "우국원",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Frog B, Frog O",
    "material": "캔버스에 유채, 아크릴 채색(Oil and acrylic on canvas)",
    "size1": 53,
    "size2": 45.5,
    "size3": 0,
    "size3Type": "0",
    "setComposition": true,
    "edition": "",
    "productionYear": "2010",
    "signatureInfo": "",
    "provenance": "서울옥션 보증서 有",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/91/20210901143727f3adf6cf-abb8-4841-804c-b226965c29ac.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Frog B, Frog O",
  "quantity": 5000,
  "pieceAmount": 10000,
  "estimateMinAmount": 47000000,
  "estimateMaxAmount": 70000000,
  "investBeginDateTime": "2021-09-01T14:00:00",
  "investEndDateTime": "2021-09-01T14:02:04",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/202108311516019aa55ef8-07be-4257-92a7-c6b4a061551e.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/20210831151619cca3a2c9-e36f-412a-b32f-66d9f8543fea.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/20210831151619938d373a-f463-481e-b5f8-1adc48544451.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/20210831151620609b9323-7e3a-4ff2-b684-f38b9a4c1b31.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/2021083115161992e2dbba-6d90-45a1-a7a5-38b90ac4c8ff.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/96/20210831151620165f5489-6b22-41b5-8550-b38acb2cb090.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>60. 정상화 : 무제 84-7-B — 모집종료 / goodsId 95</summary>

- 식별자 : `goodsId` 95 / `goodsCoPurchaseId` 231
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/95) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=6&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=95) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=95)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 231,
  "goodsId": 95,
  "goodsName": "Untitled 84-7-B",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-08-18T14:00:00",
  "investEndDateTime": "2021-08-24T15:49:09",
  "saleYieldPercent": 0,
  "artistNameForKorean": "정상화",
  "artistNameForEnglish": "SangHwa Chung",
  "titleForKorean": "무제 84-7-B",
  "titleForEnglish": "Untitled 84-7-B",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/95/202108111439423b45c23b-2173-4e7d-92f6-8d431a52bc8f.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 95,
  "artwork": {
    "id": 90,
    "artist": {
      "id": 55,
      "artistName": "정상화",
      "artistNameForEnglish": "SangHwa Chung",
      "artistNameForKorean": "정상화",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제 84-7-B(Untitled 84-7-B)",
    "material": "캔버스에 아크릴릭(Acrylic on Canvas)",
    "size1": 82,
    "size2": 74.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1984",
    "signatureInfo": "",
    "provenance": "21.07 서울옥션 대구경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/90/20210811143049f831957f-8640-40e5-b48e-e407dcec7502.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled 84-7-B",
  "quantity": 37927,
  "pieceAmount": 10000,
  "estimateMinAmount": 360000000,
  "estimateMaxAmount": 500000000,
  "investBeginDateTime": "2021-08-18T14:00:00",
  "investEndDateTime": "2021-08-24T15:49:09",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/95/202108111439423b45c23b-2173-4e7d-92f6-8d431a52bc8f.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/95/202108111439420853071f-42ee-4c29-85b8-20d7c13d6eee.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 37927,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-7"></a>

### 7페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=7) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>61. 박서보 : Écriture No.120228 — 모집종료 / goodsId 94</summary>

- 식별자 : `goodsId` 94 / `goodsCoPurchaseId` 230
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/94) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=94) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=94)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 230,
  "goodsId": 94,
  "goodsName": "Écriture No.120228",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-08-11T14:00:00",
  "investEndDateTime": "2021-08-11T14:04:31",
  "saleYieldPercent": 0,
  "artistNameForKorean": "박서보",
  "artistNameForEnglish": "Seobo Park",
  "titleForKorean": "",
  "titleForEnglish": "Écriture No.120228",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/94/2021080517535634f627bd-ff63-4c91-a212-d970057bad08.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 94,
  "artwork": {
    "id": 89,
    "artist": {
      "id": 35,
      "artistName": "박서보",
      "artistNameForEnglish": "Seobo Park",
      "artistNameForKorean": "박서보",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Écriture No.120228",
    "material": "mixed media with Korean paper on canvas",
    "size1": 35.2,
    "size2": 27.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "2012",
    "signatureInfo": "뒷면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/89/202108051750398a39dd7f-c17b-494a-b5b5-794a6390b05b.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Écriture No.120228",
  "quantity": 10290,
  "pieceAmount": 10000,
  "estimateMinAmount": 90000000,
  "estimateMaxAmount": 150000000,
  "investBeginDateTime": "2021-08-11T14:00:00",
  "investEndDateTime": "2021-08-11T14:04:31",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/94/2021080517535634f627bd-ff63-4c91-a212-d970057bad08.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/94/2021080517541043128dcb-e8cb-4e96-9f7f-d3961a3b2f95.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 10290
}</code></pre>

</details>

<details>
<summary>62. 앤디 워홀 : $ (Quadrant) — 모집종료 / goodsId 93</summary>

- 식별자 : `goodsId` 93 / `goodsCoPurchaseId` 229
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/93) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=93) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=93)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 229,
  "goodsId": 93,
  "goodsName": "$ (Quadrant)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-08-04T14:00:00",
  "investEndDateTime": "2021-08-04T14:10:57",
  "saleYieldPercent": 0,
  "artistNameForKorean": "앤디 워홀",
  "artistNameForEnglish": "Andy Warhol",
  "titleForKorean": "",
  "titleForEnglish": "$ (Quadrant)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/93/2021072616450301893d51-9fc6-4d9c-a57c-64725fa26761.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 93,
  "artwork": {
    "id": 88,
    "artist": {
      "id": 26,
      "artistName": "앤디 워홀",
      "artistNameForEnglish": "Andy Warhol",
      "artistNameForKorean": "앤디 워홀",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "$ (Quadrant)",
    "material": "뮤지엄보드에 스크린프린트(screenprint)",
    "size1": 101.6,
    "size2": 81.3,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.2/60",
    "productionYear": "1982",
    "signatureInfo": "왼쪽하단",
    "provenance": "21.07 K옥션 메이저 경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/202107261643480af9ec3c-08f0-48cd-9f94-c9afa4011c50.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "$ (Quadrant)",
  "quantity": 16980,
  "pieceAmount": 10000,
  "estimateMinAmount": 160000000,
  "estimateMaxAmount": 237000000,
  "investBeginDateTime": "2021-08-04T14:00:00",
  "investEndDateTime": "2021-08-04T14:10:57",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/93/2021072616450301893d51-9fc6-4d9c-a57c-64725fa26761.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/93/20210726164502d2276780-7deb-4a82-81ba-0da8c263e137.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 16980,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>63. 데미안 허스트 : Curare — 모집종료 / goodsId 91</summary>

- 식별자 : `goodsId` 91 / `goodsCoPurchaseId` 227
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/91) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=91) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=91)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 227,
  "goodsId": 91,
  "goodsName": "Curare",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-07-29T14:00:00",
  "investEndDateTime": "2021-07-29T14:02:11",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": "",
  "titleForEnglish": "Curare",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/91/20210721170934dc34b8c9-d6fc-4467-a331-e52859ac5037.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 91,
  "artwork": {
    "id": 86,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Curare",
    "material": "woodcut",
    "size1": 45.7,
    "size2": 45.7,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 55 on 410 gsm",
    "productionYear": "2011",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/86/2021072116330648935986-b223-417b-9294-24fe9795e842.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Curare",
  "quantity": 1400,
  "pieceAmount": 10000,
  "estimateMinAmount": 13500000,
  "estimateMaxAmount": 20000000,
  "investBeginDateTime": "2021-07-29T14:00:00",
  "investEndDateTime": "2021-07-29T14:02:11",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/91/20210721170934dc34b8c9-d6fc-4467-a331-e52859ac5037.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/91/20210721170934c069faed-a06c-4fcd-82e8-4429c3b98b37.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1400,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>64. 데미안 허스트 : Fenbufen — 모집종료 / goodsId 92</summary>

- 식별자 : `goodsId` 92 / `goodsCoPurchaseId` 228
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/92) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=92) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=92)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 228,
  "goodsId": 92,
  "goodsName": "Fenbufen",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-07-29T14:00:00",
  "investEndDateTime": "2021-07-29T14:00:56",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": "",
  "titleForEnglish": "Fenbufen",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/92/20210721175230f4269d0a-4075-4463-96f2-286096ef527c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 92,
  "artwork": {
    "id": 87,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Fenbufen",
    "material": "woodcut",
    "size1": 45.8,
    "size2": 45.8,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 55 on 410 gsm",
    "productionYear": "2011",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/87/2021072116494250b85147-bfd3-4bc1-8809-06eed551678b.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Fenbufen",
  "quantity": 1400,
  "pieceAmount": 10000,
  "estimateMinAmount": 13500000,
  "estimateMaxAmount": 20000000,
  "investBeginDateTime": "2021-07-29T14:00:00",
  "investEndDateTime": "2021-07-29T14:00:56",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/92/20210721175230f4269d0a-4075-4463-96f2-286096ef527c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/92/20210721175230d3d15b9b-9a3a-41c4-8c83-b6950b5ade5f.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1400,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>65. 김창열 : 물방울 P.A. 84016-84 — 모집종료 / goodsId 90</summary>

- 식별자 : `goodsId` 90 / `goodsCoPurchaseId` 226
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/90) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=90) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=90)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 226,
  "goodsId": 90,
  "goodsName": "물방울 P.A. 84016-84",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-07-21T14:00:00",
  "investEndDateTime": "2021-07-21T15:04:16",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "",
  "titleForEnglish": "물방울 P.A. 84016-84",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/90/20210720114049f079276e-4338-4fc0-bb96-d9da71c140d4.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 90,
  "artwork": {
    "id": 85,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "물방울 P.A. 84016-84",
    "material": "마포에 유채",
    "size1": 50,
    "size2": 50,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1984",
    "signatureInfo": "측면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/85/20210720113745b9eeeac4-84a0-43ef-879d-9252218ade48.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "물방울 P.A. 84016-84",
  "quantity": 17850,
  "pieceAmount": 10000,
  "estimateMinAmount": 169000000,
  "estimateMaxAmount": 249000000,
  "investBeginDateTime": "2021-07-21T14:00:00",
  "investEndDateTime": "2021-07-21T15:04:16",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/90/20210720114049f079276e-4338-4fc0-bb96-d9da71c140d4.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/90/202107201139546aff20dc-7e8a-4e9b-b477-b9d255dd83ab.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/90/2021072011395413b02062-4163-4b47-ae24-e2068bf34b3c.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/90/202107201139542ca27845-f05c-436f-b740-9460624d2343.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 17850
}</code></pre>

</details>

<details>
<summary>66. 로이 리히텐슈타인 : Still Life with Picasso from Homage to Picasso — 모집종료 / goodsId 89</summary>

- 식별자 : `goodsId` 89 / `goodsCoPurchaseId` 225
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/89) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=89) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=89)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 225,
  "goodsId": 89,
  "goodsName": "Still Life with Picasso from Homage to Picasso",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-07-15T14:00:00",
  "investEndDateTime": "2021-07-15T14:00:51",
  "saleYieldPercent": 0,
  "artistNameForKorean": "로이 리히텐슈타인",
  "artistNameForEnglish": "Roy Lichtenstein",
  "titleForKorean": "",
  "titleForEnglish": "Still Life with Picasso from Homage to Picasso",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/89/2021070815163192b5f8f9-f9e2-4a28-8836-903b39eb89d9.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 89,
  "artwork": {
    "id": 84,
    "artist": {
      "id": 53,
      "artistName": "로이 리히텐슈타인",
      "artistNameForEnglish": "Roy Lichtenstein",
      "artistNameForKorean": "로이 리히텐슈타인",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Still Life with Picasso from Homage to Picasso",
    "material": "screenprint",
    "size1": 72,
    "size2": 53,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.60/90 (plus 30 artist's proofs)",
    "productionYear": "1973",
    "signatureInfo": "작품 하단",
    "provenance": "21.06.22 161st 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/84/2021070815103073a9900a-0083-4070-a31e-582aadf4251f.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Still Life with Picasso from Homage to Picasso",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 42000000,
  "estimateMaxAmount": 62000000,
  "investBeginDateTime": "2021-07-15T14:00:00",
  "investEndDateTime": "2021-07-15T14:00:51",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/89/2021070815163192b5f8f9-f9e2-4a28-8836-903b39eb89d9.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/89/2021070815162080d72449-99ba-44e9-8030-d24dae1f34f3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/89/20210708151620bf88c733-e9ff-4894-8e35-b800fe4aaf77.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 4462,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>67. 호안 미로 : Oiseaux Birds — 모집종료 / goodsId 88</summary>

- 식별자 : `goodsId` 88 / `goodsCoPurchaseId` 224
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/88) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=88) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=88)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 224,
  "goodsId": 88,
  "goodsName": "Oiseaux Birds",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-07-08T14:00:00",
  "investEndDateTime": "2021-07-08T15:30:29",
  "saleYieldPercent": 0,
  "artistNameForKorean": "호안 미로",
  "artistNameForEnglish": "JOAN MIRÓ",
  "titleForKorean": "",
  "titleForEnglish": "Oiseaux Birds",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/88/20210630192116a0a67077-4490-41dd-8cfc-54f94edd92bb.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 88,
  "artwork": {
    "id": 83,
    "artist": {
      "id": 36,
      "artistName": "호안 미로",
      "artistNameForEnglish": "JOAN MIRÓ",
      "artistNameForKorean": "호안 미로",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Oiseaux Birds",
    "material": "종이에 수채, 파스텔, 잉크",
    "size1": 38,
    "size2": 28,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1975",
    "signatureInfo": "",
    "provenance": "21.06 K옥션 경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/202106301916070e866544-59b5-4e5a-85bb-f6c6b2ad1e40.png\n",
    "copyrightText": "",
    "zoomable": true
  },
  "type": "CO_PURCHASE",
  "name": "Oiseaux Birds",
  "quantity": 11547,
  "pieceAmount": 10000,
  "estimateMinAmount": 109000000,
  "estimateMaxAmount": 161000000,
  "investBeginDateTime": "2021-07-08T14:00:00",
  "investEndDateTime": "2021-07-08T15:30:29",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/88/20210630192116a0a67077-4490-41dd-8cfc-54f94edd92bb.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/88/20210630192116b07f3e39-46dd-4ef4-b68c-78e35a4e08ca.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 11547,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>68. 유영국 : work — 매각완료 / goodsId 86</summary>

- 식별자 : `goodsId` 86 / `goodsCoPurchaseId` 222
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/86) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=86) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=86)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 61.93

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 222,
  "goodsId": 86,
  "goodsName": "Work",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-06-29T14:00:00",
  "investEndDateTime": "2021-06-29T14:10:35",
  "saleYieldPercent": 61.93,
  "artistNameForKorean": "유영국",
  "artistNameForEnglish": "Yoo Youngkuk",
  "titleForKorean": null,
  "titleForEnglish": "work",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/86/20210608160401d1b0c5ef-ca20-4c0b-adbe-74694080bcbf.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 86,
  "artwork": {
    "id": 81,
    "artist": {
      "id": 52,
      "artistName": "유영국",
      "artistNameForEnglish": "Yoo Youngkuk",
      "artistNameForKorean": "유영국",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "work",
    "material": "oil on canvas",
    "size1": 52.5,
    "size2": 72,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "1989",
    "signatureInfo": "우측 하단",
    "provenance": "21.06.서울옥션 X 디자인하우스 Living with Art &amp; Design 경매 DAY 1",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/81/202106081543333097efc6-36f2-4d01-a324-cab5873072b3.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Work",
  "quantity": 11713,
  "pieceAmount": 10000,
  "estimateMinAmount": 100000000,
  "estimateMaxAmount": 250000000,
  "investBeginDateTime": "2021-06-29T14:00:00",
  "investEndDateTime": "2021-06-29T14:10:35",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 61.93,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/86/20210608160401d1b0c5ef-ca20-4c0b-adbe-74694080bcbf.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/86/202106081604010ff2aa59-c6bb-4f22-8a18-e5aaa824387c.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 11713,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>69. 줄리안 오피 : Running women — 모집종료 / goodsId 87</summary>

- 식별자 : `goodsId` 87 / `goodsCoPurchaseId` 223
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/87) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=87) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=87)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 223,
  "goodsId": 87,
  "goodsName": "[emart24 이벤트] 줄리안오피_Running women",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-06-22T14:00:00",
  "investEndDateTime": "2021-07-21T14:00:00",
  "saleYieldPercent": 0,
  "artistNameForKorean": "줄리안 오피",
  "artistNameForEnglish": "Julian Opie",
  "titleForKorean": "",
  "titleForEnglish": "Running women",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/87/20210618175107ec3d265b-6902-462b-9fb3-cb76d4e57d18.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 87,
  "artwork": {
    "id": 82,
    "artist": {
      "id": 3,
      "artistName": "줄리안 오피",
      "artistNameForEnglish": "Julian Opie",
      "artistNameForKorean": "줄리안 오피",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Running women",
    "material": "Screenprinted in 21 colours, on Somerset Satin tub sized 410 gsm paper, presented in brushed aluminium frames specified by the artist",
    "size1": 152.8,
    "size2": 156.1,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition 10 of 50",
    "productionYear": "2016",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/2021061817383151053a80-d424-4413-8514-2f4682bc495d.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "[emart24 이벤트] 줄리안오피_Running women",
  "quantity": 4400,
  "pieceAmount": 10000,
  "estimateMinAmount": 41000000,
  "estimateMaxAmount": 61000000,
  "investBeginDateTime": "2021-06-22T14:00:00",
  "investEndDateTime": "2021-07-21T14:00:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/87/20210618175107ec3d265b-6902-462b-9fb3-cb76d4e57d18.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/87/202106181751135b59e782-75d9-499f-98b7-4a1455a8f89a.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 4400
}</code></pre>

</details>

<details>
<summary>70. 요시토모 나라 : Just a Little Bit — 모집종료 / goodsId 85</summary>

- 식별자 : `goodsId` 85 / `goodsCoPurchaseId` 221
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/85) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=7&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=85) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=85)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 221,
  "goodsId": 85,
  "goodsName": "Just a Little Bit",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-06-21T14:51:00",
  "investEndDateTime": "2021-06-21T17:16:23",
  "saleYieldPercent": 0,
  "artistNameForKorean": "요시토모 나라",
  "artistNameForEnglish": "Yoshitomo Nara",
  "titleForKorean": "",
  "titleForEnglish": "Just a Little Bit",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/85/202106071349465d58f46d-abad-4b6b-a098-440ac01d4f91.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 85,
  "artwork": {
    "id": 80,
    "artist": {
      "id": 43,
      "artistName": "요시토모 나라",
      "artistNameForEnglish": "Yoshitomo Nara",
      "artistNameForKorean": "요시토모 나라",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Just a Little Bit",
    "material": "woodcut",
    "size1": 42,
    "size2": 30,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.8/25",
    "productionYear": "2013",
    "signatureInfo": "뒷면",
    "provenance": "21.06.서울옥션 X 디자인하우스 Living with Art &amp; Design 경매 DAY 1",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/202106071200494337599f-502f-49e1-a9be-e9e229345dcc.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Just a Little Bit",
  "quantity": 10040,
  "pieceAmount": 10000,
  "estimateMinAmount": 95000000,
  "estimateMaxAmount": 140000000,
  "investBeginDateTime": "2021-06-21T14:51:00",
  "investEndDateTime": "2021-06-21T17:16:23",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/85/202106071349465d58f46d-abad-4b6b-a098-440ac01d4f91.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/85/20210607134951fb322d6a-96b3-4ea6-96a8-d8a75c2906fc.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 10040,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-8"></a>

### 8페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=8) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>71. 데미안 허스트 : Pain and Sorrow — 매각완료 / goodsId 84</summary>

- 식별자 : `goodsId` 84 / `goodsCoPurchaseId` 220
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/84) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=84) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=84)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 20.93

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 220,
  "goodsId": 84,
  "goodsName": "Pain and sorrow",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-06-11T14:00:00",
  "investEndDateTime": "2021-06-16T16:46:22",
  "saleYieldPercent": 20.93,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": null,
  "titleForEnglish": "Pain and Sorrow",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/84/2021060412140989e59d76-ae74-4197-91c1-cf3666a70994.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 84,
  "artwork": {
    "id": 79,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pain and Sorrow",
    "material": "pencil, printed paper, blade, scalpel, sticky note, cigarette, cigarette pack, Bisodol box, aluminum pill foil and pills collaged on aquatint",
    "size1": 203,
    "size2": 109,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": null,
    "signatureInfo": "우측 하단",
    "provenance": "21.06.서울옥션 X 디자인하우스 Living with Art &amp; Design 경매 DAY 1",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/79/20210604105529826cdcb2-5fb6-4517-830a-f94f12917d25.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pain and sorrow",
  "quantity": 22310,
  "pieceAmount": 10000,
  "estimateMinAmount": 200000000,
  "estimateMaxAmount": 340000000,
  "investBeginDateTime": "2021-06-11T14:00:00",
  "investEndDateTime": "2021-06-16T16:46:22",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 20.93,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/84/2021060412140989e59d76-ae74-4197-91c1-cf3666a70994.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/84/20210604121411210cdb3d-5f22-496b-8d7b-2603c6492ea7.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/84/202106041214139baef04f-b5f7-453a-bc57-e1eb19a1bf4d.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 22310,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>72. 트레이시 에민 : Love is what you want — 매각완료 / goodsId 83</summary>

- 식별자 : `goodsId` 83 / `goodsCoPurchaseId` 219
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/83) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=83) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=83)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 88.24

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 219,
  "goodsId": 83,
  "goodsName": "Love is what you want",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-06-01T14:00:00",
  "investEndDateTime": "2021-06-01T14:00:29",
  "saleYieldPercent": 88.24,
  "artistNameForKorean": "트레이시 에민",
  "artistNameForEnglish": "Tracey Emin",
  "titleForKorean": "",
  "titleForEnglish": "Love is what you want",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/83/20210618155734cfadc677-32f2-431a-b1f9-6e249254617c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 83,
  "artwork": {
    "id": 78,
    "artist": {
      "id": 51,
      "artistName": "트레이시 에민",
      "artistNameForEnglish": "Tracey Emin",
      "artistNameForKorean": "트레이시 에민",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Love is what you want",
    "material": "250 GSM Silk Finish Paper",
    "size1": 69.9,
    "size2": 49.8,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 500",
    "productionYear": "2018",
    "signatureInfo": "우측 하단",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/78/20210618155644687beaed-1df5-4f49-88f4-0eabbadabb7a.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Love is what you want",
  "quantity": 340,
  "pieceAmount": 10000,
  "estimateMinAmount": 3000000,
  "estimateMaxAmount": 4500000,
  "investBeginDateTime": "2021-06-01T14:00:00",
  "investEndDateTime": "2021-06-01T14:00:29",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 88.24,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/83/20210618155734cfadc677-32f2-431a-b1f9-6e249254617c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/83/2021061815574179e65d4a-f614-4856-97db-0c9e8867f841.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 340,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>73. 캐서린 번하드 : Save the Amazon — 모집종료 / goodsId 82</summary>

- 식별자 : `goodsId` 82 / `goodsCoPurchaseId` 218
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/82) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=82) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=82)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 218,
  "goodsId": 82,
  "goodsName": "Save the Amazon",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-05-27T14:00:00",
  "investEndDateTime": "2021-05-27T14:02:14",
  "saleYieldPercent": 0,
  "artistNameForKorean": "캐서린 번하드",
  "artistNameForEnglish": "Katherine Bernhardt",
  "titleForKorean": "",
  "titleForEnglish": "Save the Amazon",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170650441d18a7-ce82-4db4-8a8a-30e4b1d0ab1e.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 82,
  "artwork": {
    "id": 77,
    "artist": {
      "id": 49,
      "artistName": "캐서린 번하드",
      "artistNameForEnglish": "Katherine Bernhardt",
      "artistNameForKorean": "캐서린 번하드",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Save the Amazon",
    "material": "12 + color screen print on 100% cotton Don Bosco 250 gr paper",
    "size1": 75,
    "size2": 55,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Limited Edition of 100",
    "productionYear": "2019",
    "signatureInfo": "우측 하단",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/77/202105201648282cbbde84-3077-4d9e-9741-3ba6bdf901e2.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Save the Amazon",
  "quantity": 340,
  "pieceAmount": 10000,
  "estimateMinAmount": 3000000,
  "estimateMaxAmount": 4500000,
  "investBeginDateTime": "2021-05-27T14:00:00",
  "investEndDateTime": "2021-05-27T14:02:14",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170650441d18a7-ce82-4db4-8a8a-30e4b1d0ab1e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170653d64fbbab-2f4c-4b33-a73d-dbc9dc3b7153.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/202105201706566cb5c6f5-2846-4f00-bbf4-ebae43bf3627.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170658056b24cd-c72f-4541-bb50-f70ff7d555d7.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/202105201707005dcb768a-5ee3-4368-a8a4-3c1080febf20.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170703642e6db4-8c29-49dc-9f8b-67b51a3aa7e3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170706ceff76d2-7f27-4666-99f9-eda621df2eda.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/82/20210520170709826655c0-cfa2-4403-9f4e-d1c71462c79b.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 340
}</code></pre>

</details>

<details>
<summary>74. 게르하르트 리히터 : Cage 6 — 모집종료 / goodsId 81</summary>

- 식별자 : `goodsId` 81 / `goodsCoPurchaseId` 217
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/81) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=81) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=81)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 217,
  "goodsId": 81,
  "goodsName": "Cage 6",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-05-20T14:00:00",
  "investEndDateTime": "2021-05-20T14:04:46",
  "saleYieldPercent": 0,
  "artistNameForKorean": "게르하르트 리히터",
  "artistNameForEnglish": "Gerhard Richter",
  "titleForKorean": "",
  "titleForEnglish": "Cage 6",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/20210517112525650e835d-1d88-48e8-9ed3-e54ba77a5867.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 81,
  "artwork": {
    "id": 76,
    "artist": {
      "id": 48,
      "artistName": "게르하르트 리히터",
      "artistNameForEnglish": "Gerhard Richter",
      "artistNameForKorean": "게르하르트 리히터",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Cage 6",
    "material": "Diasec-mounted Giclee print on aluminium composite panel",
    "size1": 100,
    "size2": 100,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.183/200",
    "productionYear": "2020",
    "signatureInfo": "Numbered and labelled on the back",
    "provenance": ".",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/76/202105171115313135da8e-b7f2-4d34-8b43-2b18067f4211.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Cage 6",
  "quantity": 4200,
  "pieceAmount": 10000,
  "estimateMinAmount": 39000000,
  "estimateMaxAmount": 58000000,
  "investBeginDateTime": "2021-05-20T14:00:00",
  "investEndDateTime": "2021-05-20T14:04:46",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/20210517112525650e835d-1d88-48e8-9ed3-e54ba77a5867.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/20210517112515761e23b3-b39e-48c9-ab1b-e7753025130d.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/20210517112515e5e16dac-91f2-49a7-8310-b3608824f8b5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/2021051711240296d1a48e-6765-41e5-87c7-74ba64cdbb66.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/81/20210517112402510e2d63-142b-4e33-bb24-79a835af4800.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 4200,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>75. 이강소 : From an Island-03060 — 매각완료 / goodsId 80</summary>

- 식별자 : `goodsId` 80 / `goodsCoPurchaseId` 216
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/80) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=80) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=80)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 79.13

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 216,
  "goodsId": 80,
  "goodsName": "From an Island-03060",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-05-12T14:00:00",
  "investEndDateTime": "2021-05-12T16:11:50",
  "saleYieldPercent": 79.13,
  "artistNameForKorean": "이강소",
  "artistNameForEnglish": "Kangso Lee",
  "titleForKorean": null,
  "titleForEnglish": "From an Island-03060",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/80/202104281841133786ab59-7338-46b0-95a2-7bc77cc52dfa.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 80,
  "artwork": {
    "id": 75,
    "artist": {
      "id": 47,
      "artistName": "이강소",
      "artistNameForEnglish": "Kangso Lee",
      "artistNameForKorean": "이강소",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "From an Island-03060",
    "material": "Oil on canvas",
    "size1": 162,
    "size2": 162,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "2003",
    "signatureInfo": "우측상단, 뒷면",
    "provenance": "2021.04.160th 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/75/2021042818195145af7c0d-ab8a-4088-86ab-5962ad58b0e3.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "From an Island-03060",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 40000000,
  "estimateMaxAmount": 80000000,
  "investBeginDateTime": "2021-05-12T14:00:00",
  "investEndDateTime": "2021-05-12T16:11:50",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 79.13,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/80/202104281841133786ab59-7338-46b0-95a2-7bc77cc52dfa.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/80/2021042818410441598770-71bb-4cd1-bef6-9ab325d7eab8.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/80/202104281841043ef6c335-51b2-4906-951f-69c3b4cd98d6.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/80/202104281841045d03c5e9-b202-471e-b607-c08a24b723b3.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4462,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>76. 김환기 : 무제 — 모집종료 / goodsId 79</summary>

- 식별자 : `goodsId` 79 / `goodsCoPurchaseId` 215
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/79) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=79) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=79)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 215,
  "goodsId": 79,
  "goodsName": "무제",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-05-04T14:00:00",
  "investEndDateTime": "2021-05-04T14:40:26",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김환기",
  "artistNameForEnglish": "Kim Whanki",
  "titleForKorean": "무제",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/79/20221130122938afd68b00-5628-42a7-b7d2-0b7b850cc578.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 79,
  "artwork": {
    "id": 74,
    "artist": {
      "id": 46,
      "artistName": "김환기",
      "artistNameForEnglish": "Kim Whanki",
      "artistNameForKorean": "김환기",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(Untitled)",
    "material": "gouache on paper",
    "size1": 30.7,
    "size2": 21.2,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "",
    "signatureInfo": "",
    "provenance": "2021.04.160th 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/74/20220929183547be8b6672-f4ba-4c6e-9748-99f28a68fbcc.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제",
  "quantity": 4686,
  "pieceAmount": 10000,
  "estimateMinAmount": 44000000,
  "estimateMaxAmount": 65000000,
  "investBeginDateTime": "2021-05-04T14:00:00",
  "investEndDateTime": "2021-05-04T14:40:26",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/79/20221130122938afd68b00-5628-42a7-b7d2-0b7b850cc578.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 4686,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>77. 매드사키 : You wanna take me to a kung fu movie?_P — 모집종료 / goodsId 78</summary>

- 식별자 : `goodsId` 78 / `goodsCoPurchaseId` 214
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/78) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=78) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=78)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 214,
  "goodsId": 78,
  "goodsName": "You wanna take me to a kung fu movie?_P",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-04-14T14:00:00",
  "investEndDateTime": "2021-04-14T14:00:20",
  "saleYieldPercent": 0,
  "artistNameForKorean": "매드사키",
  "artistNameForEnglish": "Madsaki",
  "titleForKorean": "",
  "titleForEnglish": "You wanna take me to a kung fu movie?_P",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/78/202104081852143524af4b-a0a3-4535-af86-383ffc20013f.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 78,
  "artwork": {
    "id": 73,
    "artist": {
      "id": 33,
      "artistName": "매드사키",
      "artistNameForEnglish": "Madsaki",
      "artistNameForKorean": "매드사키",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "You wanna take me to a kung fu movie?_P",
    "material": "오프셋",
    "size1": 70,
    "size2": 70,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.140/300",
    "productionYear": "2020",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/73/2021040818503765cbc932-8edc-48d1-a87a-ce87586f615f.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "You wanna take me to a kung fu movie?_P",
  "quantity": 210,
  "pieceAmount": 10000,
  "estimateMinAmount": 1500000,
  "estimateMaxAmount": 2800000,
  "investBeginDateTime": "2021-04-14T14:00:00",
  "investEndDateTime": "2021-04-14T14:00:20",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/78/202104081852143524af4b-a0a3-4535-af86-383ffc20013f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/78/20210414103420ff143bd1-1687-4cb1-8129-d39ee8d7d00d.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 210
}</code></pre>

</details>

<details>
<summary>78. 조나스 우드 : Shelf Still Life — 모집종료 / goodsId 76</summary>

- 식별자 : `goodsId` 76 / `goodsCoPurchaseId` 212
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/76) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=76) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=76)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 212,
  "goodsId": 76,
  "goodsName": "Shelf Still Life",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-04-07T14:00:00",
  "investEndDateTime": "2021-04-07T14:07:11",
  "saleYieldPercent": 0,
  "artistNameForKorean": "조나스 우드",
  "artistNameForEnglish": "Jonas Wood",
  "titleForKorean": "",
  "titleForEnglish": "Shelf Still Life",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/76/202103241817210a88d9f1-6a6e-4403-83f1-25c591d71217.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 76,
  "artwork": {
    "id": 71,
    "artist": {
      "id": 44,
      "artistName": "조나스 우드",
      "artistNameForEnglish": "Jonas Wood",
      "artistNameForKorean": "조나스 우드",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Shelf Still Life",
    "material": "lithograph, screenprint",
    "size1": 81,
    "size2": 65.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.52/80 (plus 20 artist’s proofs)",
    "productionYear": "2018",
    "signatureInfo": "",
    "provenance": "2021.03.서울옥션 Seoul Auction Spring Sale with Artsy Live",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/20210324180547c6b864f6-eeac-4aeb-bf21-b856b0552270.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Shelf Still Life",
  "quantity": 3235,
  "pieceAmount": 10000,
  "estimateMinAmount": 30000000,
  "estimateMaxAmount": 45000000,
  "investBeginDateTime": "2021-04-07T14:00:00",
  "investEndDateTime": "2021-04-07T14:07:11",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/76/202103241817210a88d9f1-6a6e-4403-83f1-25c591d71217.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/76/20210324181721ded0bdb1-5db2-40f7-9f4c-4add041d2a26.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3235,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>79. 마르크 샤갈 : Maternité Rouge — 모집종료 / goodsId 77</summary>

- 식별자 : `goodsId` 77 / `goodsCoPurchaseId` 213
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/77) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=77) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=77)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 213,
  "goodsId": 77,
  "goodsName": "Maternité Rouge",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-03-31T14:00:00",
  "investEndDateTime": "2021-03-31T15:16:17",
  "saleYieldPercent": 0,
  "artistNameForKorean": "마르크 샤갈",
  "artistNameForEnglish": "Marc Chagall",
  "titleForKorean": "",
  "titleForEnglish": "Maternité Rouge",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/77/2021032418314268c831b4-e580-476d-b3d2-dc1d28da264b.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 77,
  "artwork": {
    "id": 72,
    "artist": {
      "id": 45,
      "artistName": "마르크 샤갈",
      "artistNameForEnglish": "Marc Chagall",
      "artistNameForKorean": "마르크 샤갈",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Maternité Rouge",
    "material": "lithograph",
    "size1": 93.5,
    "size2": 59.6,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.30/50",
    "productionYear": "1980",
    "signatureInfo": "",
    "provenance": "2021.03.서울옥션 Seoul Auction Spring Sale with Artsy Live",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/20210324182504a2c849b6-b265-4caa-a2c8-cbc1cd1c3b67.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Maternité Rouge",
  "quantity": 5466,
  "pieceAmount": 10000,
  "estimateMinAmount": 51000000,
  "estimateMaxAmount": 76000000,
  "investBeginDateTime": "2021-03-31T14:00:00",
  "investEndDateTime": "2021-03-31T15:16:17",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/77/2021032418314268c831b4-e580-476d-b3d2-dc1d28da264b.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/77/202103251150030a113cc5-4a6b-4445-9079-61d1917c3928.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5466,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>80. 요시토모 나라 : Eve of Distruction — 매각완료 / goodsId 74</summary>

- 식별자 : `goodsId` 74 / `goodsCoPurchaseId` 210
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/74) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=8&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=74) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=74)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 30.31

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 210,
  "goodsId": 74,
  "goodsName": "Eve of Distruction",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-03-02T14:00:00",
  "investEndDateTime": "2021-03-24T14:00:00",
  "saleYieldPercent": 30.31,
  "artistNameForKorean": "요시토모 나라",
  "artistNameForEnglish": "Yoshitomo Nara",
  "titleForKorean": null,
  "titleForEnglish": "Eve of Distruction",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/74/20210224150222bd9672ed-d55f-4040-9619-561ddff5fa15.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 74,
  "artwork": {
    "id": 69,
    "artist": {
      "id": 43,
      "artistName": "요시토모 나라",
      "artistNameForEnglish": "Yoshitomo Nara",
      "artistNameForKorean": "요시토모 나라",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Eve of Distruction",
    "material": "Colored pencil on envelope",
    "size1": 23.5,
    "size2": 18.6,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": null,
    "signatureInfo": null,
    "provenance": "2021.02.제159회 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/69/20210224144637150b120b-68d7-44b7-ac58-e480852cdf22.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Eve of Distruction",
  "quantity": 12271,
  "pieceAmount": 10000,
  "estimateMinAmount": 100000000,
  "estimateMaxAmount": 150000000,
  "investBeginDateTime": "2021-03-02T14:00:00",
  "investEndDateTime": "2021-03-24T14:00:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 30.31,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/74/20210224150222bd9672ed-d55f-4040-9619-561ddff5fa15.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 12271,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-9"></a>

### 9페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=9) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>81. 김창열 : 물방울 — 매각완료 / goodsId 75</summary>

- 식별자 : `goodsId` 75 / `goodsCoPurchaseId` 211
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/75) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=75) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=75)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 35.61

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 211,
  "goodsId": 75,
  "goodsName": "물방울",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-03-02T14:00:00",
  "investEndDateTime": "2021-03-18T14:33:42",
  "saleYieldPercent": 35.61,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "물방울",
  "titleForEnglish": "waterdrop",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/75/202102241709118cf2c6b5-88d4-4e28-8a0c-cb4e42adcb56.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 75,
  "artwork": {
    "id": 70,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "물방울(waterdrop)",
    "material": "oil on hemp cloth",
    "size1": 91,
    "size2": 72.2,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "1983",
    "signatureInfo": "우측",
    "provenance": "2021.02.제159회 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/70/2021022414481841898449-7903-45ec-b183-4ac068b70bde.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "물방울",
  "quantity": 21753,
  "pieceAmount": 10000,
  "estimateMinAmount": 180000000,
  "estimateMaxAmount": 250000000,
  "investBeginDateTime": "2021-03-02T14:00:00",
  "investEndDateTime": "2021-03-18T14:33:42",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 35.61,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/75/202102241709118cf2c6b5-88d4-4e28-8a0c-cb4e42adcb56.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/75/20210224170911ce4b89ca-0e2b-46f3-b940-6f5d4b5b1130.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 21753
}</code></pre>

</details>

<details>
<summary>82. 나라 요시토모 &amp; 스기토 히로시 : 무제 — 매각완료 / goodsId 73</summary>

- 식별자 : `goodsId` 73 / `goodsCoPurchaseId` 209
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/73) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=73) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=73)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 42.42

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 209,
  "goodsId": 73,
  "goodsName": "무제",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-02-17T14:00:00",
  "investEndDateTime": "2021-02-17T14:00:24",
  "saleYieldPercent": 42.42,
  "artistNameForKorean": "나라 요시토모 &amp; 스기토 히로시",
  "artistNameForEnglish": "Nara Yoshitomo &amp; Sugito Hiroshi",
  "titleForKorean": "무제",
  "titleForEnglish": "untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/73/202102101327272f39d255-892b-4349-8ecb-d9262ccc08e1.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 73,
  "artwork": {
    "id": 68,
    "artist": {
      "id": 42,
      "artistName": "나라 요시토모 &amp; 스기토 히로시",
      "artistNameForEnglish": "Nara Yoshitomo &amp; Sugito Hiroshi",
      "artistNameForKorean": "나라 요시토모 &amp; 스기토 히로시",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(untitled)",
    "material": "lithograph on wove paper",
    "size1": 30,
    "size2": 23,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.52/100",
    "productionYear": "2005",
    "signatureInfo": "both artists signed, dated and numbered on the recto",
    "provenance": "2021.02.서울옥션 e BID 프리미엄 경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/68/202102101324152cdbcb28-e5a1-4703-89d6-86fa2d8b1064.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제",
  "quantity": 1765,
  "pieceAmount": 10000,
  "estimateMinAmount": 15000000,
  "estimateMaxAmount": 50000000,
  "investBeginDateTime": "2021-02-17T14:00:00",
  "investEndDateTime": "2021-02-17T14:00:24",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 42.42,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/73/202102101327272f39d255-892b-4349-8ecb-d9262ccc08e1.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/73/20210210132711a261d1c6-5a10-49be-aa2b-ff914736682b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/73/2021021013271101736095-19a7-4ca5-88bc-ad1b647d956b.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/73/20210210132711c0258f29-0749-42f2-9254-1b6879d7b728.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 1765,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>83. 김창열 : 물방울 — 모집종료 / goodsId 72</summary>

- 식별자 : `goodsId` 72 / `goodsCoPurchaseId` 208
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/72) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=72) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=72)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 208,
  "goodsId": 72,
  "goodsName": "물방울",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-01-28T14:00:00",
  "investEndDateTime": "2021-01-28T14:03:25",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "물방울",
  "titleForEnglish": "Waterdrops",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/72/20210120110948a6858094-eee3-4f9d-ac34-f6d4cf904e03.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 72,
  "artwork": {
    "id": 67,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "물방울(Waterdrops)",
    "material": "마대에 유채",
    "size1": 73,
    "size2": 60,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "",
    "productionYear": "1992",
    "signatureInfo": "우측",
    "provenance": "2021.01.서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/67/20210209131048046eeb97-c465-459c-910b-d64d15fab866.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "물방울",
  "quantity": 4800,
  "pieceAmount": 10000,
  "estimateMinAmount": 45000000,
  "estimateMaxAmount": 67000000,
  "investBeginDateTime": "2021-01-28T14:00:00",
  "investEndDateTime": "2021-01-28T14:03:25",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/72/20210120110948a6858094-eee3-4f9d-ac34-f6d4cf904e03.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/72/2021012011094862156f7f-fa13-4497-997b-a209afa0868f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/72/20210125131008ad7d3ec2-d38e-4be6-a47c-a3b8d3d22f74.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/72/202101251310178c7169d5-e1a6-4aae-b9f8-c1f2b4aa4a77.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 4800,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>84. 이우환 : 무제(2012) — 매각완료 / goodsId 71</summary>

- 식별자 : `goodsId` 71 / `goodsCoPurchaseId` 207
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/71) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=71) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=71)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 20.01

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 207,
  "goodsId": 71,
  "goodsName": "무제 (2012)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2021-01-18T14:00:00",
  "investEndDateTime": "2021-01-18T14:01:40",
  "saleYieldPercent": 20.01,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "무제(2012)",
  "titleForEnglish": null,
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/71/20210112165100b5d2b7d8-b5b3-472a-8260-311f1b84b69f.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 71,
  "artwork": {
    "id": 66,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "무제(2012)",
    "material": "lithograph",
    "size1": 46,
    "size2": 60,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed. 177/250",
    "productionYear": "2012",
    "signatureInfo": "우측하단",
    "provenance": "2021.01 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/66/20210209131105e9065b87-1c25-4c0c-b52d-e54e7eb3406a.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "무제 (2012)",
  "quantity": 1372,
  "pieceAmount": 10000,
  "estimateMinAmount": 13000000,
  "estimateMaxAmount": 19000000,
  "investBeginDateTime": "2021-01-18T14:00:00",
  "investEndDateTime": "2021-01-18T14:01:40",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 20.01,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/71/20210112165100b5d2b7d8-b5b3-472a-8260-311f1b84b69f.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/71/202101121651000fd92467-dbe3-45d3-8b69-bff8ade25ee8.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 1372,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>85. 다카시 무라카미 : Wouldn't it be nice if we could do such a thing ? — 모집종료 / goodsId 69</summary>

- 식별자 : `goodsId` 69 / `goodsCoPurchaseId` 206
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/69) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=69) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=69)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 206,
  "goodsId": 69,
  "goodsName": "Wouldn't it Be Nice if We Could Do Such A Thing",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2021-01-07T14:00:00",
  "investEndDateTime": "2021-01-07T14:05:22",
  "saleYieldPercent": 0,
  "artistNameForKorean": "다카시 무라카미",
  "artistNameForEnglish": "Takashi Murakami",
  "titleForKorean": "",
  "titleForEnglish": "Wouldn't it be nice if we could do such a thing ?",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/69/2020123112032888af6467-99b3-420e-bd1a-3ad054d5a69d.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 69,
  "artwork": {
    "id": 65,
    "artist": {
      "id": 15,
      "artistName": "다카시 무라카미",
      "artistNameForEnglish": "Takashi Murakami",
      "artistNameForKorean": "다카시 무라카미",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Wouldn't it be nice if we could do such a thing ?",
    "material": "Gold foils on silkscreen print",
    "size1": 46.4,
    "size2": 94,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed. 81/ 300",
    "productionYear": "2019",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/65/202102091311191a59e9f4-ed94-4003-89c9-74904a39effb.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Wouldn't it Be Nice if We Could Do Such A Thing",
  "quantity": 1000,
  "pieceAmount": 10000,
  "estimateMinAmount": 9500000,
  "estimateMaxAmount": 13000000,
  "investBeginDateTime": "2021-01-07T14:00:00",
  "investEndDateTime": "2021-01-07T14:05:22",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/69/2020123112032888af6467-99b3-420e-bd1a-3ad054d5a69d.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/69/20201231120347a97499a6-1ebd-4203-b69d-f9c83eacecc7.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/69/2020123112035372d3c645-0de8-407a-9088-41893baaf02d.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 1000
}</code></pre>

</details>

<details>
<summary>86. 야요이 쿠사마 : Pumpkin — 매각완료 / goodsId 68</summary>

- 식별자 : `goodsId` 68 / `goodsCoPurchaseId` 205
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/68) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=68) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=68)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 27

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 205,
  "goodsId": 68,
  "goodsName": "Pumpkin",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-11-17T14:00:00",
  "investEndDateTime": "2020-12-15T16:02:46",
  "saleYieldPercent": 27,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "Pumpkin",
  "titleForEnglish": "Pumpkin",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/68/202010301636158287a2cd-364c-40d1-8f49-ebed47d5b3c2.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 68,
  "artwork": {
    "id": 64,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pumpkin(Pumpkin)",
    "material": "screenprint",
    "size1": 90.8,
    "size2": 67.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "E.A (aside from the edition of 50)",
    "productionYear": "1988",
    "signatureInfo": "signed, titled ‘カボチャ’, dated and numbered on the recto",
    "provenance": "2020.10.28 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/64/20201110185034d0e07bbd-c668-4de4-a595-101f46de3c69.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pumpkin",
  "quantity": 13386,
  "pieceAmount": 10000,
  "estimateMinAmount": 100000000,
  "estimateMaxAmount": 140000000,
  "investBeginDateTime": "2020-11-17T14:00:00",
  "investEndDateTime": "2020-12-15T16:02:46",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 27,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/68/202010301636158287a2cd-364c-40d1-8f49-ebed47d5b3c2.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/68/2020103016360663d75ae1-0acc-4513-beeb-d4c553cb3cac.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/68/202010301636053222db29-a226-4388-acce-15f8193de369.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 13386,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>87. 김종학 : 풍경 — 매각완료 / goodsId 67</summary>

- 식별자 : `goodsId` 67 / `goodsCoPurchaseId` 204
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/67) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=67) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=67)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 43.42

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 204,
  "goodsId": 67,
  "goodsName": "풍경",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-11-11T14:00:00",
  "investEndDateTime": "2020-12-31T14:00:00",
  "saleYieldPercent": 43.42,
  "artistNameForKorean": "김종학",
  "artistNameForEnglish": "ChongHak Kim",
  "titleForKorean": "풍경",
  "titleForEnglish": "Landscape",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/67/20201030162900aa580c1e-6c5e-4d16-97c0-ec4f7547552e.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 67,
  "artwork": {
    "id": 63,
    "artist": {
      "id": 41,
      "artistName": "김종학",
      "artistNameForEnglish": "ChongHak Kim",
      "artistNameForKorean": "김종학",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "풍경(Landscape)",
    "material": "Oil on canvas",
    "size1": 73,
    "size2": 100,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": null,
    "signatureInfo": "signed on the upper left",
    "provenance": "2020.10.28 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/63/2020111018504855b1ff9d-7625-40c0-ad37-0bd5ceccbb90.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "풍경",
  "quantity": 5578,
  "pieceAmount": 10000,
  "estimateMinAmount": 50000000,
  "estimateMaxAmount": 100000000,
  "investBeginDateTime": "2020-11-11T14:00:00",
  "investEndDateTime": "2020-12-31T14:00:00",
  "availableQuantity": 0,
  "interviewUrl": "zpNFHMPrK_o",
  "saleYieldPercent": 43.42,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/67/20201030162900aa580c1e-6c5e-4d16-97c0-ec4f7547552e.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/67/2020103016290334839edd-3c29-42c9-b8e7-9a3aac1a639c.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 5578,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>88. 멜 보크너 : Blah, Blah, Blah — 매각완료 / goodsId 66</summary>

- 식별자 : `goodsId` 66 / `goodsCoPurchaseId` 203
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/66) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=66) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=66)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 19.49

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 203,
  "goodsId": 66,
  "goodsName": "Blah, Blah, Blah",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-11-05T14:00:00",
  "investEndDateTime": "2020-12-15T15:36:00",
  "saleYieldPercent": 19.49,
  "artistNameForKorean": "멜 보크너",
  "artistNameForEnglish": "Mel Bochner",
  "titleForKorean": null,
  "titleForEnglish": "Blah, Blah, Blah",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/66/20201030161940a4391723-092d-4111-a049-348d9679fa04.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 66,
  "artwork": {
    "id": 62,
    "artist": {
      "id": 40,
      "artistName": "멜 보크너",
      "artistNameForEnglish": "Mel Bochner",
      "artistNameForKorean": "멜 보크너",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Blah, Blah, Blah",
    "material": "monoprint in oil paint with collage, engraving and embossment on hand-dyed twinrocker handmade paper",
    "size1": 69,
    "size2": 56.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": null,
    "productionYear": "2019",
    "signatureInfo": "signed and dated on the lower right, printed title and date on the gallery label affixed to the reverse",
    "provenance": "2020.10.28 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/62/20201110175207de6fdb03-5e35-412e-828c-056fba43ab66.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Blah, Blah, Blah",
  "quantity": 4462,
  "pieceAmount": 10000,
  "estimateMinAmount": 35000000,
  "estimateMaxAmount": 65000000,
  "investBeginDateTime": "2020-11-05T14:00:00",
  "investEndDateTime": "2020-12-15T15:36:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 19.49,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/66/20201030161940a4391723-092d-4111-a049-348d9679fa04.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/66/202010301619443fcb62a4-d9f5-4dbd-b0e1-5224982f18a3.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4462,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>89. 데미안 허스트 : Water — 매각완료 / goodsId 64</summary>

- 식별자 : `goodsId` 64 / `goodsCoPurchaseId` 202
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/64) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=64) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=64)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 20.35

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 202,
  "goodsId": 64,
  "goodsName": "Water",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-10-30T14:00:00",
  "investEndDateTime": "2020-10-30T14:49:10",
  "saleYieldPercent": 20.35,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": null,
  "titleForEnglish": "Water",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/64/202010291704223fe58171-2c9b-4b3b-96a8-8984c315bf00.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 64,
  "artwork": {
    "id": 61,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Water",
    "material": "Diasec-mounted Giclée print on aluminum composite panel",
    "size1": 100,
    "size2": 100,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.46/60(plus 10 artist’s proofs)",
    "productionYear": "2020",
    "signatureInfo": "뒷면",
    "provenance": "2020.10.28 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/61/202011101752441ede937b-cd52-421e-8a9b-3c98efda62c9.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Water",
  "quantity": 2231,
  "pieceAmount": 10000,
  "estimateMinAmount": 21000000,
  "estimateMaxAmount": 31000000,
  "investBeginDateTime": "2020-10-30T14:00:00",
  "investEndDateTime": "2020-10-30T14:49:10",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 20.35,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/64/202010291704223fe58171-2c9b-4b3b-96a8-8984c315bf00.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/64/20201029170402884776e4-cd01-4095-a3bc-d213a01ec5a6.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 2231
}</code></pre>

</details>

<details>
<summary>90. 줄리안 오피 : New York Couples 5 — 매각완료 / goodsId 62</summary>

- 식별자 : `goodsId` 62 / `goodsCoPurchaseId` 200
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/62) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=9&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=62) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=62)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 22.92

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 200,
  "goodsId": 62,
  "goodsName": "New York Couples 5",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-10-23T14:00:00",
  "investEndDateTime": "2020-10-23T18:38:13",
  "saleYieldPercent": 22.92,
  "artistNameForKorean": "줄리안 오피",
  "artistNameForEnglish": "Julian Opie",
  "titleForKorean": "",
  "titleForEnglish": "New York Couples 5",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/62/20201105115255cda53ca3-3da0-42b6-9896-3eec7be51444.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 62,
  "artwork": {
    "id": 60,
    "artist": {
      "id": 3,
      "artistName": "줄리안 오피",
      "artistNameForEnglish": "Julian Opie",
      "artistNameForKorean": "줄리안 오피",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "New York Couples 5",
    "material": "Screenprint with inkjet and collage on conservation board with frame",
    "size1": 112,
    "size2": 78,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.43/55(plus 5 artist’s proofs)",
    "productionYear": "2019",
    "signatureInfo": "signed, printed title, date and number on the galley label affixed to the reverse",
    "provenance": "2020.10 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/202010211728303c2b53ac-a1ed-4177-89ad-75438e5ac79d.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "New York Couples 5",
  "quantity": 2107,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 29000000,
  "investBeginDateTime": "2020-10-23T14:00:00",
  "investEndDateTime": "2020-10-23T18:38:13",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 22.92,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/62/20201105115255cda53ca3-3da0-42b6-9896-3eec7be51444.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 2107,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-10"></a>

### 10페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=10) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>91. 백남준 : 화동의 꽃은 무궁화처럼 질기다 — 모집종료 / goodsId 63</summary>

- 식별자 : `goodsId` 63 / `goodsCoPurchaseId` 201
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/63) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=63) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=63)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 201,
  "goodsId": 63,
  "goodsName": "화동의 꽃은 무궁화처럼 질기다",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-10-23T14:00:00",
  "investEndDateTime": "2020-10-23T14:01:54",
  "saleYieldPercent": 0,
  "artistNameForKorean": "백남준",
  "artistNameForEnglish": "NamJune Paik",
  "titleForKorean": "화동의 꽃은 무궁화처럼 질기다",
  "titleForEnglish": "Hwadong's flowers are as strong as a rose of sharon",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/63/20201022145432228a198c-fb8e-46d8-a46c-10badee99072.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 63,
  "artwork": {
    "id": 59,
    "artist": {
      "id": 39,
      "artistName": "백남준",
      "artistNameForEnglish": "NamJune Paik",
      "artistNameForKorean": "백남준",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "화동의 꽃은 무궁화처럼 질기다(Hwadong's flowers are as strong as a rose of sharon)",
    "material": "실크스크린, 석판화(silkscreen, lithograph)",
    "size1": 33.5,
    "size2": 54.5,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "H.C",
    "productionYear": "",
    "signatureInfo": "signed and numbered on the recto",
    "provenance": "2020.10월 서울옥션 온라인 경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/59/202011101753067811ee8d-4392-4ab0-8ecc-7476ba044f10.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "화동의 꽃은 무궁화처럼 질기다",
  "quantity": 408,
  "pieceAmount": 10000,
  "estimateMinAmount": 3500000,
  "estimateMaxAmount": 5500000,
  "investBeginDateTime": "2020-10-23T14:00:00",
  "investEndDateTime": "2020-10-23T14:01:54",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/63/20201022145432228a198c-fb8e-46d8-a46c-10badee99072.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/63/20201022145407bb5c3c89-121a-4e9e-91fe-e877f635a683.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/63/20201022145406a2aa85a7-fae3-4093-9a8b-5b0526e602c5.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 408,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>92. 데이비드 호크니 : Pictured Gathering with Mirror — 매각완료 / goodsId 61</summary>

- 식별자 : `goodsId` 61 / `goodsCoPurchaseId` 199
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/61) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=61) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=61)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 42.73

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 199,
  "goodsId": 61,
  "goodsName": "Pictured Gathering with Mirror",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-10-14T14:00:00",
  "investEndDateTime": "2020-10-22T00:56:38",
  "saleYieldPercent": 42.73,
  "artistNameForKorean": "데이비드 호크니",
  "artistNameForEnglish": "David Hockney",
  "titleForKorean": null,
  "titleForEnglish": "Pictured Gathering with Mirror",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/61/20201012125313f8eab674-8ec0-45e4-b27d-00f6de4f3525.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 61,
  "artwork": {
    "id": 58,
    "artist": {
      "id": 38,
      "artistName": "데이비드 호크니",
      "artistNameForEnglish": "David Hockney",
      "artistNameForKorean": "데이비드 호크니",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pictured Gathering with Mirror",
    "material": "Photographic drawing printed on paper, mounted on Dibond",
    "size1": 60,
    "size2": 162,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "Edition of 25",
    "productionYear": "2018",
    "signatureInfo": null,
    "provenance": "서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/58/20201110175319cd3dc3eb-cadf-405a-9764-aaec9a26bff1.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pictured Gathering with Mirror",
  "quantity": 8000,
  "pieceAmount": 10000,
  "estimateMinAmount": 76000000,
  "estimateMaxAmount": 112000000,
  "investBeginDateTime": "2020-10-14T14:00:00",
  "investEndDateTime": "2020-10-22T00:56:38",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 42.73,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/61/20201012125313f8eab674-8ec0-45e4-b27d-00f6de4f3525.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/61/2020101212503182c9fbcb-de10-4d16-adaa-2f9cb96a6f13.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/61/20201012125030de4bb645-b132-4ad0-9ba9-b46a41654c47.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/61/202010121250315f4d65eb-f4b7-456f-802d-29c4d7205c1e.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 8000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>93. 야요이 쿠사마 : Sea — 매각완료 / goodsId 59</summary>

- 식별자 : `goodsId` 59 / `goodsCoPurchaseId` 197
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/59) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=59) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=59)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 41.61

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 197,
  "goodsId": 59,
  "goodsName": "Sea",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-09-28T14:00:00",
  "investEndDateTime": "2020-10-14T15:01:43",
  "saleYieldPercent": 41.61,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "Sea",
  "titleForEnglish": "Sea",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/59/20200924154624e73d9b81-9853-435b-a62e-0bb5ddcec32b.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 59,
  "artwork": {
    "id": 56,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Sea(Sea)",
    "material": "enamel on paperboard",
    "size1": 27.1,
    "size2": 24,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "1980",
    "signatureInfo": "signed, titled ' 海 ' and dated on the reverse",
    "provenance": "2020.9 157th 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/56/2020111018092180a9bde8-091d-4045-80e2-5fc566a5a614.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Sea",
  "quantity": 2678,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 40000000,
  "investBeginDateTime": "2020-09-28T14:00:00",
  "investEndDateTime": "2020-10-14T15:01:43",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 41.61,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/59/20200924154624e73d9b81-9853-435b-a62e-0bb5ddcec32b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/59/202009241546118c911fe8-9022-4248-95ff-7fdfcd579ebc.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 2678
}</code></pre>

</details>

<details>
<summary>94. 박수근 : 고양이 — 모집종료 / goodsId 60</summary>

- 식별자 : `goodsId` 60 / `goodsCoPurchaseId` 198
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/60) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=60) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=60)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 198,
  "goodsId": 60,
  "goodsName": "고양이",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-09-28T14:00:00",
  "investEndDateTime": "2020-09-28T14:18:04",
  "saleYieldPercent": 0,
  "artistNameForKorean": "박수근",
  "artistNameForEnglish": "Sookeun Park",
  "titleForKorean": "고양이",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/60/2020092417510616218f73-bdb3-4266-b865-96b732d2ae9b.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 60,
  "artwork": {
    "id": 57,
    "artist": {
      "id": 37,
      "artistName": "박수근",
      "artistNameForEnglish": "Sookeun Park",
      "artistNameForKorean": "박수근",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "고양이",
    "material": "종이에 색연필(colored pencil on paper)",
    "size1": 16.8,
    "size2": 21.2,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "1957",
    "signatureInfo": "signed and dated on the lower right",
    "provenance": "2020.9 157th 서울옥션 미술품경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/57/20201110180940f216661c-30d7-4aef-9a13-35f9a1ef6a92.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "고양이",
  "quantity": 1841,
  "pieceAmount": 10000,
  "estimateMinAmount": 17000000,
  "estimateMaxAmount": 25000000,
  "investBeginDateTime": "2020-09-28T14:00:00",
  "investEndDateTime": "2020-09-28T14:18:04",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/60/2020092417510616218f73-bdb3-4266-b865-96b732d2ae9b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/60/202009241751061ec640a2-ba05-4dc8-9b0f-e5af6d23d0b3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/60/2020092417510636bcd52c-eb2e-4e91-a7e5-0fc530a5afa8.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1841,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>95. 박서보 : Écriture No.2-06 — 매각완료 / goodsId 57</summary>

- 식별자 : `goodsId` 57 / `goodsCoPurchaseId` 195
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/57) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=57) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=57)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 138.41

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 195,
  "goodsId": 57,
  "goodsName": "Écriture No.2-06",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-09-21T14:00:00",
  "investEndDateTime": "2020-09-21T14:00:45",
  "saleYieldPercent": 138.41,
  "artistNameForKorean": "박서보",
  "artistNameForEnglish": "Seobo Park",
  "titleForKorean": null,
  "titleForEnglish": "Écriture No.2-06",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/57/20200904143916fc40139f-f900-4d0e-8f69-fbb961e52c4e.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 57,
  "artwork": {
    "id": 54,
    "artist": {
      "id": 35,
      "artistName": "박서보",
      "artistNameForEnglish": "Seobo Park",
      "artistNameForKorean": "박서보",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Écriture No.2-06",
    "material": "texture print",
    "size1": 76,
    "size2": 55.5,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": "ed.25/99",
    "productionYear": "2006",
    "signatureInfo": "signed, titled, dated and numbered on the recto",
    "provenance": "2020.09 아트시 X 서울옥션 : Splah! Splah!",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/54/202010071620280618ebe8-1a24-4c3d-9553-25add26d2da3.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Écriture No.2-06",
  "quantity": 813,
  "pieceAmount": 10000,
  "estimateMinAmount": 6000000,
  "estimateMaxAmount": 9000000,
  "investBeginDateTime": "2020-09-21T14:00:00",
  "investEndDateTime": "2020-09-21T14:00:45",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 138.41,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/57/20200904143916fc40139f-f900-4d0e-8f69-fbb961e52c4e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/57/2020090414390464958184-c14b-44e9-b6bb-0bb656a8af6a.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/57/20200904143904d97a1aa7-5acd-49ad-adc5-c2030908441e.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 813,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>96. 호안 미로 : The Seers Ⅲ — 매각완료 / goodsId 58</summary>

- 식별자 : `goodsId` 58 / `goodsCoPurchaseId` 196
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/58) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=58) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=58)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 35.1

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 196,
  "goodsId": 58,
  "goodsName": "The Seers Ⅲ",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-09-16T14:00:00",
  "investEndDateTime": "2020-09-16T14:00:03",
  "saleYieldPercent": 35.1,
  "artistNameForKorean": "호안 미로",
  "artistNameForEnglish": "JOAN MIRÓ",
  "titleForKorean": "",
  "titleForEnglish": "The Seers Ⅲ",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/58/20200904145511bd7f6a20-8baf-47a9-8cd3-ba17ab729d23.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 58,
  "artwork": {
    "id": 55,
    "artist": {
      "id": 36,
      "artistName": "호안 미로",
      "artistNameForEnglish": "JOAN MIRÓ",
      "artistNameForKorean": "호안 미로",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "The Seers Ⅲ",
    "material": "석판화(lithograph)",
    "size1": 66,
    "size2": 51,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "E.A",
    "productionYear": "1970",
    "signatureInfo": "signed and numbered on the recto",
    "provenance": "2020.09 아트시 X 서울옥션 : Splah! Splah!",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/55/20201007162048d6296887-d0dc-4b76-8261-1969f414cb06.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "The Seers Ⅲ",
  "quantity": 681,
  "pieceAmount": 10000,
  "estimateMinAmount": 6400000,
  "estimateMaxAmount": 9500000,
  "investBeginDateTime": "2020-09-16T14:00:00",
  "investEndDateTime": "2020-09-16T14:00:03",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 35.1,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/58/20200904145511bd7f6a20-8baf-47a9-8cd3-ba17ab729d23.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/58/2020090414551185c728c6-e12f-4aa6-b543-07c898b100eb.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 681,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>97. 데이비드 걸스타인 : Spirit of Freedom — 모집종료 / goodsId 56</summary>

- 식별자 : `goodsId` 56 / `goodsCoPurchaseId` 194
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/56) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=56) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=56)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 194,
  "goodsId": 56,
  "goodsName": "Spirit of Freedom",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-09-11T14:00:00",
  "investEndDateTime": "2020-09-11T14:02:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데이비드 걸스타인",
  "artistNameForEnglish": "David Gerstein",
  "titleForKorean": "",
  "titleForEnglish": "Spirit of Freedom",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/56/20200904112856818f7ce7-3c9e-469f-8900-846ea5506d38.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 56,
  "artwork": {
    "id": 53,
    "artist": {
      "id": 34,
      "artistName": "데이비드 걸스타인",
      "artistNameForEnglish": "David Gerstein",
      "artistNameForKorean": "데이비드 걸스타인",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Spirit of Freedom",
    "material": "hand painted on cutout steel, 3 layers",
    "size1": 100,
    "size2": 100,
    "size3": 10.5,
    "size3Type": "",
    "setComposition": false,
    "edition": "75/150",
    "productionYear": "2007",
    "signatureInfo": "signed and numbered on the low",
    "provenance": "2020.09 아트시 X 서울옥션 : Splah! Splah!",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/53/2020100716211194b3d700-6e90-4d92-860d-70e551077ef6.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Spirit of Freedom",
  "quantity": 817,
  "pieceAmount": 10000,
  "estimateMinAmount": 7500000,
  "estimateMaxAmount": 11000000,
  "investBeginDateTime": "2020-09-11T14:00:00",
  "investEndDateTime": "2020-09-11T14:02:34",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/56/20200904112856818f7ce7-3c9e-469f-8900-846ea5506d38.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 817
}</code></pre>

</details>

<details>
<summary>98. 다카시 무라카미 : Doraemon's Daily Life — 매각완료 / goodsId 55</summary>

- 식별자 : `goodsId` 55 / `goodsCoPurchaseId` 193
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/55) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=55) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=55)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 15

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 193,
  "goodsId": 55,
  "goodsName": "Doraemon's Daily Life",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-09-08T14:00:00",
  "investEndDateTime": "2020-09-08T14:02:48",
  "saleYieldPercent": 15,
  "artistNameForKorean": "다카시 무라카미",
  "artistNameForEnglish": "Takashi Murakami",
  "titleForKorean": "",
  "titleForEnglish": "Doraemon's Daily Life",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/55/2020090318102410dc2e9a-360f-4048-8f16-ff3e6e28971f.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 55,
  "artwork": {
    "id": 52,
    "artist": {
      "id": 15,
      "artistName": "다카시 무라카미",
      "artistNameForEnglish": "Takashi Murakami",
      "artistNameForKorean": "다카시 무라카미",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Doraemon's Daily Life",
    "material": "오프셋 프린트",
    "size1": 54,
    "size2": 42.3,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.376/1000",
    "productionYear": "2018",
    "signatureInfo": "우측 하단",
    "provenance": "2020.09 아트시 X 서울옥션 : Splah! Splah!",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/52/20201007162122b6269122-8306-47ad-a1fa-8bc71f96778d.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Doraemon's Daily Life",
  "quantity": 215,
  "pieceAmount": 10000,
  "estimateMinAmount": 2000000,
  "estimateMaxAmount": 3000000,
  "investBeginDateTime": "2020-09-08T14:00:00",
  "investEndDateTime": "2020-09-08T14:02:48",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 15,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/55/2020090318102410dc2e9a-360f-4048-8f16-ff3e6e28971f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/55/202009031810243a288b2c-ecdd-4ebf-a95d-c830615c023c.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/55/20200903181024da8335c3-e774-427a-a7c0-043ce331a1a7.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 215,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>99. 데미안 허스트 : Benzyloxyurea, from 40 Woodcut Spots — 매각완료 / goodsId 54</summary>

- 식별자 : `goodsId` 54 / `goodsCoPurchaseId` 192
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/54) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=54) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=54)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 21.5

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 192,
  "goodsId": 54,
  "goodsName": "Benzyloxyurea, from 40 Woodcut Spots",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-09-07T14:00:00",
  "investEndDateTime": "2020-09-07T14:02:43",
  "saleYieldPercent": 21.5,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": "",
  "titleForEnglish": "Benzyloxyurea, from 40 Woodcut Spots",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/54/202009031719482122254c-4951-4d50-9aec-d14b1afe2084.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 54,
  "artwork": {
    "id": 51,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Benzyloxyurea, from 40 Woodcut Spots",
    "material": "woodcut in colors",
    "size1": 56.6,
    "size2": 46.1,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.39/55 (plus 10 artist’s proofs)",
    "productionYear": "2011",
    "signatureInfo": "signed on the recto numbered on the verso",
    "provenance": "2020.09 아트시 X 서울옥션 : Splah! Splah!",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/51/2020100716213901c67b4c-1f00-4400-a201-66bcf975f71e.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Benzyloxyurea, from 40 Woodcut Spots",
  "quantity": 907,
  "pieceAmount": 10000,
  "estimateMinAmount": 8500000,
  "estimateMaxAmount": 12000000,
  "investBeginDateTime": "2020-09-07T14:00:00",
  "investEndDateTime": "2020-09-07T14:02:43",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 21.5,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/54/202009031719482122254c-4951-4d50-9aec-d14b1afe2084.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/54/20200903171948d37053a0-4946-4ed5-bfc6-81aae3dbcb4e.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 907,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>100. 매드사키 : Dora Mear au chat2-p — 모집종료 / goodsId 52</summary>

- 식별자 : `goodsId` 52 / `goodsCoPurchaseId` 190
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/52) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=10&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=52) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=52)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 190,
  "goodsId": 52,
  "goodsName": "Dora Mear au chat2-p",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-08-24T14:00:00",
  "investEndDateTime": "2020-08-24T14:00:57",
  "saleYieldPercent": 0,
  "artistNameForKorean": "매드사키",
  "artistNameForEnglish": "Madsaki",
  "titleForKorean": "",
  "titleForEnglish": "Dora Mear au chat2-p",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/52/20200819171834377794b2-838c-4609-99ee-2cf195565204.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 52,
  "artwork": {
    "id": 49,
    "artist": {
      "id": 33,
      "artistName": "매드사키",
      "artistNameForEnglish": "Madsaki",
      "artistNameForKorean": "매드사키",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Dora Mear au chat2-p",
    "material": "screenprint",
    "size1": 82,
    "size2": 61.6,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.97/300",
    "productionYear": "2020",
    "signatureInfo": "우측 하단",
    "provenance": "2020.08 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/49/20201007161952b0a59da8-b441-44a4-9c09-3e34ffc9d04c.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Dora Mear au chat2-p",
  "quantity": 250,
  "pieceAmount": 10000,
  "estimateMinAmount": 2000000,
  "estimateMaxAmount": 3500000,
  "investBeginDateTime": "2020-08-24T14:00:00",
  "investEndDateTime": "2020-08-24T14:00:57",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/52/20200819171834377794b2-838c-4609-99ee-2cf195565204.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 250,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-11"></a>

### 11페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=11) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>101. 매드사키 : Portrait of an artist (pool with two figures) II — 모집종료 / goodsId 53</summary>

- 식별자 : `goodsId` 53 / `goodsCoPurchaseId` 191
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/53) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=53) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=53)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 191,
  "goodsId": 53,
  "goodsName": "Portrait of an artist (pool with two figures) II",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-08-24T14:00:00",
  "investEndDateTime": "2020-08-24T14:01:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "매드사키",
  "artistNameForEnglish": "Madsaki",
  "titleForKorean": "",
  "titleForEnglish": "Portrait of an artist (pool with two figures) II",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/53/20200819173209e5b10bcc-6a71-4965-852e-37c798f77d50.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 53,
  "artwork": {
    "id": 50,
    "artist": {
      "id": 33,
      "artistName": "매드사키",
      "artistNameForEnglish": "Madsaki",
      "artistNameForKorean": "매드사키",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Portrait of an artist (pool with two figures) II",
    "material": "screenprint",
    "size1": 56,
    "size2": 80,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.65/300",
    "productionYear": "2020",
    "signatureInfo": "우측 하단",
    "provenance": "2020.08 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/50/20201007162004a89c0bd4-1900-4cf0-9f52-02b04bd3d8e3.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Portrait of an artist (pool with two figures) II",
  "quantity": 400,
  "pieceAmount": 10000,
  "estimateMinAmount": 3500000,
  "estimateMaxAmount": 5500000,
  "investBeginDateTime": "2020-08-24T14:00:00",
  "investEndDateTime": "2020-08-24T14:01:34",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/53/20200819173209e5b10bcc-6a71-4965-852e-37c798f77d50.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 400
}</code></pre>

</details>

<details>
<summary>102. 줄리안 오피 : Ika(1) — 모집종료 / goodsId 51</summary>

- 식별자 : `goodsId` 51 / `goodsCoPurchaseId` 189
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/51) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=51) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=51)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 189,
  "goodsId": 51,
  "goodsName": "Ika(1)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-08-10T14:00:00",
  "investEndDateTime": "2020-08-10T21:29:02",
  "saleYieldPercent": 0,
  "artistNameForKorean": "줄리안 오피",
  "artistNameForEnglish": "Julian Opie",
  "titleForKorean": "",
  "titleForEnglish": "Ika(1)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/51/20200803151816201aeeeb-81cd-4ee9-a228-28e1301e19c6.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 51,
  "artwork": {
    "id": 48,
    "artist": {
      "id": 3,
      "artistName": "줄리안 오피",
      "artistNameForEnglish": "Julian Opie",
      "artistNameForKorean": "줄리안 오피",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Ika(1)",
    "material": "Inkjet on paper in wooden frame",
    "size1": 105,
    "size2": 68,
    "size3": 6.5,
    "size3Type": "",
    "setComposition": false,
    "edition": "Edition of 40 + 7 Artist Proofs",
    "productionYear": "2011",
    "signatureInfo": "",
    "provenance": "2020.07 서울옥션 프라이빗 세일",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/48/20201006151923d4efa691-0ddc-4ff2-ab7f-78dd56a868fb.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Ika(1)",
  "quantity": 3200,
  "pieceAmount": 10000,
  "estimateMinAmount": 30000000,
  "estimateMaxAmount": 44000000,
  "investBeginDateTime": "2020-08-10T14:00:00",
  "investEndDateTime": "2020-08-10T21:29:02",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/51/20200803151816201aeeeb-81cd-4ee9-a228-28e1301e19c6.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/51/202008031518167260e585-086e-494b-8289-8e1478875946.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 3200,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>103. 카우스 : Blame Game(complete set of 10 prints) — 모집종료 / goodsId 50</summary>

- 식별자 : `goodsId` 50 / `goodsCoPurchaseId` 188
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/50) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=50) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=50)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 188,
  "goodsId": 50,
  "goodsName": "Blame game(complete set of 10 prints)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-07-28T14:00:00",
  "investEndDateTime": "2020-08-20T11:47:36",
  "saleYieldPercent": 0,
  "artistNameForKorean": "카우스",
  "artistNameForEnglish": "KAWS",
  "titleForKorean": "",
  "titleForEnglish": "Blame Game(complete set of 10 prints)",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/20200724174252e9c96e83-3672-495c-abd0-88897ea60a76.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 50,
  "artwork": {
    "id": 47,
    "artist": {
      "id": 23,
      "artistName": "카우스",
      "artistNameForEnglish": "KAWS",
      "artistNameForKorean": "카우스",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Blame Game(complete set of 10 prints)",
    "material": "Screenprint in color on Saunders waterfold paper",
    "size1": 89,
    "size2": 58.4,
    "size3": 0,
    "size3Type": "",
    "setComposition": true,
    "edition": "85/100",
    "productionYear": "2014",
    "signatureInfo": "each signed, dated and numbered on the recto, published by Pace Editions, Inc., New York, this work is accompanied with the original portfolio case",
    "provenance": "2020.07 서울옥션 32nd HONG KONG SALE",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/47/20201007162401a20e4a04-ccf3-4a25-b84b-f029d0b2d225.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Blame game(complete set of 10 prints)",
  "quantity": 15702,
  "pieceAmount": 10000,
  "estimateMinAmount": 150000000,
  "estimateMaxAmount": 219000000,
  "investBeginDateTime": "2020-07-28T14:00:00",
  "investEndDateTime": "2020-08-20T11:47:36",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/20200724174252e9c96e83-3672-495c-abd0-88897ea60a76.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/202007241744027c437fe6-c75d-4db7-b882-367b3344ab33.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/20200724174401bda266e4-3ede-46aa-beaa-aa9c5c9e5b88.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/202007241744011a3ef318-3999-4874-865c-163f2a057323.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/20200724174305ddcc8a9c-ed9a-4452-86d3-d8c4f2e77e53.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/50/202007241742520a5ec2eb-4c37-49ea-b149-e4e356511523.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 15702,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>104. 마리킴 : Butterfly Effect — 매각완료 / goodsId 49</summary>

- 식별자 : `goodsId` 49 / `goodsCoPurchaseId` 187
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/49) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=49) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=49)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 15.27

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 187,
  "goodsId": 49,
  "goodsName": "Butterfly Effect",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-07-24T14:00:00",
  "investEndDateTime": "2020-07-24T14:01:23",
  "saleYieldPercent": 15.27,
  "artistNameForKorean": "마리킴",
  "artistNameForEnglish": "Mari Kim",
  "titleForKorean": null,
  "titleForEnglish": "Butterfly Effect",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/49/2020072316384260659d45-666d-416d-9e68-05f3e6df1aad.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 49,
  "artwork": {
    "id": 46,
    "artist": {
      "id": 1,
      "artistName": "마리킴",
      "artistNameForEnglish": "Mari Kim",
      "artistNameForKorean": "마리킴",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Butterfly Effect",
    "material": "캔버스에 울트라크롬잉크(Ultra chrome ink printed on canvas)",
    "size1": 113,
    "size2": 91,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2009",
    "signatureInfo": "왼쪽 하단, 뒷면 사인( signed, titled and dated on the left side/signed, titled and dated on the reverse of frame)",
    "provenance": "2020.07 서울옥션 32nd HONG KONG SALE",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/46/20201007162202439d93a5-a1b4-417e-a10e-b512a9004362.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Butterfly Effect",
  "quantity": 1041,
  "pieceAmount": 10000,
  "estimateMinAmount": 9000000,
  "estimateMaxAmount": 19000000,
  "investBeginDateTime": "2020-07-24T14:00:00",
  "investEndDateTime": "2020-07-24T14:01:23",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 15.27,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/49/2020072316384260659d45-666d-416d-9e68-05f3e6df1aad.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 1041,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>105. 만 레이 : 아름다운 나날들 — 모집종료 / goodsId 48</summary>

- 식별자 : `goodsId` 48 / `goodsCoPurchaseId` 186
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/48) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=48) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=48)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 186,
  "goodsId": 48,
  "goodsName": "Le Beau Temps",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-07-16T14:00:00",
  "investEndDateTime": "2020-07-16T14:01:15",
  "saleYieldPercent": 0,
  "artistNameForKorean": "만 레이",
  "artistNameForEnglish": "Man Ray",
  "titleForKorean": "아름다운 나날들",
  "titleForEnglish": "Le Beau Temps",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/48/2020071514452311cc576a-2a44-4ddb-a383-ca2d25a3edf7.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 48,
  "artwork": {
    "id": 45,
    "artist": {
      "id": 32,
      "artistName": "만 레이",
      "artistNameForEnglish": "Man Ray",
      "artistNameForKorean": "만 레이",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "아름다운 나날들(Le Beau Temps)",
    "material": "석판화(lithograph)",
    "size1": 68,
    "size2": 65,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.71/110",
    "productionYear": "1973",
    "signatureInfo": "우측 하단, signed and numbered on the recto",
    "provenance": "2020.06 아트시 X 서울옥션 온라인 경매: Summer Breeze",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/45/202010071622299296d19f-b447-4d94-85fd-a7c5d496e64a.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Le Beau Temps",
  "quantity": 479,
  "pieceAmount": 10000,
  "estimateMinAmount": 4000000,
  "estimateMaxAmount": 6000000,
  "investBeginDateTime": "2020-07-16T14:00:00",
  "investEndDateTime": "2020-07-16T14:01:15",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/48/2020071514452311cc576a-2a44-4ddb-a383-ca2d25a3edf7.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/48/20200715144523c0724082-90fd-4db4-b3b2-91c2e82e6b68.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 479
}</code></pre>

</details>

<details>
<summary>106. 톰 웨슬만 : Still Life with Blonde — 매각완료 / goodsId 47</summary>

- 식별자 : `goodsId` 47 / `goodsCoPurchaseId` 185
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/47) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=47) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=47)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 16.96

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 185,
  "goodsId": 47,
  "goodsName": "Still Life with Blonde",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-07-10T14:00:00",
  "investEndDateTime": "2020-07-10T14:07:00",
  "saleYieldPercent": 16.96,
  "artistNameForKorean": "톰 웨슬만",
  "artistNameForEnglish": "Tom Wesselmann",
  "titleForKorean": "",
  "titleForEnglish": "Still Life with Blonde",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/47/202007091939257a9df3ef-c6a6-4ed2-a9e4-06978f7111e6.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 47,
  "artwork": {
    "id": 44,
    "artist": {
      "id": 31,
      "artistName": "톰 웨슬만",
      "artistNameForEnglish": "Tom Wesselmann",
      "artistNameForKorean": "톰 웨슬만",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Still Life with Blonde",
    "material": "screenprint in colors on museum board",
    "size1": 53,
    "size2": 70.5,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.29/100",
    "productionYear": "1999",
    "signatureInfo": "signed, numbered and blined stamped ‘SCREENED IMAGES’ on the recto,  published by Cooper Square Prints, New York",
    "provenance": "2020.06 아트시 X 서울옥션 온라인 경매: Summer Breeze",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/44/20201006151939fbaec783-6068-4539-8212-01e773c9ac31.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Still Life with Blonde",
  "quantity": 684,
  "pieceAmount": 10000,
  "estimateMinAmount": 6000000,
  "estimateMaxAmount": 9500000,
  "investBeginDateTime": "2020-07-10T14:00:00",
  "investEndDateTime": "2020-07-10T14:07:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 16.96,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/47/202007091939257a9df3ef-c6a6-4ed2-a9e4-06978f7111e6.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/47/202007091939305f29e096-6667-4693-a9c1-7a893821eee8.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 684,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>107. 야요이 쿠사마 : Pumpkin(White T) — 매각완료 / goodsId 46</summary>

- 식별자 : `goodsId` 46 / `goodsCoPurchaseId` 184
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/46) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=46) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=46)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 20.43

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 184,
  "goodsId": 46,
  "goodsName": "Pumpkin(White T)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-07-07T14:00:00",
  "investEndDateTime": "2020-07-07T19:31:31",
  "saleYieldPercent": 20.43,
  "artistNameForKorean": "야요이 쿠사마",
  "artistNameForEnglish": "Yayoi Kusama",
  "titleForKorean": "Pumpkin(White T)",
  "titleForEnglish": "Pumpkin(White T)",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/46/202007031831286824da43-a0ea-4d12-afe0-3709160edc01.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 46,
  "artwork": {
    "id": 43,
    "artist": {
      "id": 30,
      "artistName": "야요이 쿠사마",
      "artistNameForEnglish": "Yayoi Kusama",
      "artistNameForKorean": "야요이 쿠사마",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Pumpkin(White T)(Pumpkin(White T))",
    "material": "스크린프린트(screenprint)",
    "size1": 72.4,
    "size2": 60.3,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": "ed.25/120 (plus 12 artist's proofs)",
    "productionYear": "1992",
    "signatureInfo": "signed, titled 'かぼちゃ(白)', dated and numbered on the recto",
    "provenance": "2020.06 아트시 X 서울옥션 온라인 경매: Summer Breeze",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/43/2020070318271316888948-3999-4163-a27d-f736ef65545e.jpg\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Pumpkin(White T)",
  "quantity": 4650,
  "pieceAmount": 10000,
  "estimateMinAmount": 36438000,
  "estimateMaxAmount": 48584000,
  "investBeginDateTime": "2020-07-07T14:00:00",
  "investEndDateTime": "2020-07-07T19:31:31",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 20.43,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/46/202007031831286824da43-a0ea-4d12-afe0-3709160edc01.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/46/20200703183123a47fcebf-9dd4-41d4-b23f-cd4c754d5a89.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 4650,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>108. 두민 : Real to virtual transition — 매각완료 / goodsId 45</summary>

- 식별자 : `goodsId` 45 / `goodsCoPurchaseId` 183
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/45) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=45) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=45)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 21

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 183,
  "goodsId": 45,
  "goodsName": "Real to virtual transition",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-06-25T14:00:00",
  "investEndDateTime": "2020-07-06T14:00:00",
  "saleYieldPercent": 21,
  "artistNameForKorean": "두민",
  "artistNameForEnglish": "Do Min",
  "titleForKorean": "",
  "titleForEnglish": "Real to virtual transition",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/45/20200623195321b3148052-5a04-486e-82a6-4a8ecaf46404.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 45,
  "artwork": {
    "id": 42,
    "artist": {
      "id": 16,
      "artistName": "두민",
      "artistNameForEnglish": "Do Min",
      "artistNameForKorean": "두민",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Real to virtual transition",
    "material": "oil on canvas",
    "size1": 90,
    "size2": 180,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2020",
    "signatureInfo": "뒷면",
    "provenance": "작가위탁",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/42/20200623180936895e856e-b514-4e26-90d9-0042764fc4b9.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Real to virtual transition",
  "quantity": 2000,
  "pieceAmount": 10000,
  "estimateMinAmount": 18000000,
  "estimateMaxAmount": 20000000,
  "investBeginDateTime": "2020-06-25T14:00:00",
  "investEndDateTime": "2020-07-06T14:00:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 21,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/45/20200623195321b3148052-5a04-486e-82a6-4a8ecaf46404.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/45/20200624204305ad98a8e8-df08-490d-8783-01408220f89c.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/45/202006242043092dcd8158-9f3a-47f3-b31e-15c2e2ea0a90.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 2000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>109. 다카시 무라카미 : Flowers From the Village of Ponkotan — 모집종료 / goodsId 44</summary>

- 식별자 : `goodsId` 44 / `goodsCoPurchaseId` 182
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/44) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=44) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=44)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 182,
  "goodsId": 44,
  "goodsName": "Flowers From the Village of Ponkotan",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-06-18T14:00:00",
  "investEndDateTime": "2020-06-18T14:04:00",
  "saleYieldPercent": 0,
  "artistNameForKorean": "다카시 무라카미",
  "artistNameForEnglish": "Takashi Murakami",
  "titleForKorean": "",
  "titleForEnglish": "Flowers From the Village of Ponkotan",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/2020110511540455942684-c97d-4c1f-9ac8-8e8165c83036.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 44,
  "artwork": {
    "id": 41,
    "artist": {
      "id": 15,
      "artistName": "다카시 무라카미",
      "artistNameForEnglish": "Takashi Murakami",
      "artistNameForKorean": "다카시 무라카미",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Flowers From the Village of Ponkotan",
    "material": "컬러 오프셋",
    "size1": 50,
    "size2": 50,
    "size3": 0,
    "size3Type": "height",
    "setComposition": false,
    "edition": "ed.81/300",
    "productionYear": "2011",
    "signatureInfo": "우측하단",
    "provenance": "2020.05. 서울옥션블루 84th BLUENOW",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/41/20200616183138c1fc1929-d6b1-4a98-ace0-6c8144352df4.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Flowers From the Village of Ponkotan",
  "quantity": 194,
  "pieceAmount": 10000,
  "estimateMinAmount": 1500000,
  "estimateMaxAmount": 2700000,
  "investBeginDateTime": "2020-06-18T14:00:00",
  "investEndDateTime": "2020-06-18T14:04:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/2020110511540455942684-c97d-4c1f-9ac8-8e8165c83036.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/20200616184746115faa0d-6661-491a-9599-863e4d79e4f7.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/20200616184820ef00e1f7-5150-4536-8dc8-12e645d6aba8.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/2020061618480094aec0e4-0a26-4d48-b4f8-d39d0c0b6361.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/44/2020061618481385cb12ab-440e-4af8-a6a8-18728cfb2802.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 194
}</code></pre>

</details>

<details>
<summary>110. 낸시랭 : Taboo Yogini - Scarlet F1002 — 매각완료 / goodsId 43</summary>

- 식별자 : `goodsId` 43 / `goodsCoPurchaseId` 181
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/43) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=11&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=43) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=43)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 21

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 181,
  "goodsId": 43,
  "goodsName": "Taboo Yogini - Scarlet F1002 ",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-06-05T14:00:00",
  "investEndDateTime": "2020-07-10T23:59:00",
  "saleYieldPercent": 21,
  "artistNameForKorean": "낸시랭",
  "artistNameForEnglish": "Nancy Lang",
  "titleForKorean": "",
  "titleForEnglish": "Taboo Yogini - Scarlet F1002",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/43/202005261853321f0dfe9a-e4a8-446a-bd2a-83ce4042bb52.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 43,
  "artwork": {
    "id": 40,
    "artist": {
      "id": 29,
      "artistName": "낸시랭",
      "artistNameForEnglish": "Nancy Lang",
      "artistNameForKorean": "낸시랭",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Taboo Yogini - Scarlet F1002",
    "material": "캔버스에 유채(Oil on canvas)",
    "size1": 162.2,
    "size2": 130.3,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "뒷면",
    "provenance": "작가위탁",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/40/20200526183250b1c8f98a-2117-4858-8428-d418cd08bcf4.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Taboo Yogini - Scarlet F1002 ",
  "quantity": 2300,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 30000000,
  "investBeginDateTime": "2020-06-05T14:00:00",
  "investEndDateTime": "2020-07-10T23:59:00",
  "availableQuantity": 0,
  "interviewUrl": "https://youtu.be/Hgt0399doJ4",
  "saleYieldPercent": 21,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/43/202005261853321f0dfe9a-e4a8-446a-bd2a-83ce4042bb52.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/43/2020052811522085eacd51-dea1-4730-b3ec-7b3fdafd7aab.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/43/20200528115236fc50602d-8203-43cf-8c6b-1773326b89ce.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 2300,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-12"></a>

### 12페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=12) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>111. 알렉산더 칼더 : Stars and Stripes — 모집종료 / goodsId 42</summary>

- 식별자 : `goodsId` 42 / `goodsCoPurchaseId` 180
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/42) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=42) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=42)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 180,
  "goodsId": 42,
  "goodsName": "Stars and Stripes",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-05-22T11:00:00",
  "investEndDateTime": "2020-05-22T11:01:20",
  "saleYieldPercent": 0,
  "artistNameForKorean": "알렉산더 칼더",
  "artistNameForEnglish": "Alexander Calder",
  "titleForKorean": "",
  "titleForEnglish": "Stars and Stripes",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/42/20200520110846e7ad85ab-14d1-463e-881d-0b906e26a262.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 42,
  "artwork": {
    "id": 38,
    "artist": {
      "id": 28,
      "artistName": "알렉산더 칼더",
      "artistNameForEnglish": "Alexander Calder",
      "artistNameForKorean": "알렉산더 칼더",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Stars and Stripes",
    "material": "석판화(lithograph)",
    "size1": 63.7,
    "size2": 90.5,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "E.A",
    "productionYear": "",
    "signatureInfo": "signed and numbered on the recto",
    "provenance": "2020.04 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/38/202010071619358ad5b792-140b-4bfc-8536-18cf5335ca8d.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Stars and Stripes",
  "quantity": 335,
  "pieceAmount": 10000,
  "estimateMinAmount": 2800000,
  "estimateMaxAmount": 4000000,
  "investBeginDateTime": "2020-05-22T11:00:00",
  "investEndDateTime": "2020-05-22T11:01:20",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/42/20200520110846e7ad85ab-14d1-463e-881d-0b906e26a262.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 335,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>112. 김창열 : 물방울 — 매각완료 / goodsId 41</summary>

- 식별자 : `goodsId` 41 / `goodsCoPurchaseId` 179
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/41) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=41) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=41)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 43.99

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 179,
  "goodsId": 41,
  "goodsName": "물방울",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-05-15T14:00:00",
  "investEndDateTime": "2020-06-14T00:00:00",
  "saleYieldPercent": 43.99,
  "artistNameForKorean": "김창열",
  "artistNameForEnglish": "Tschangyeul Kim",
  "titleForKorean": "물방울",
  "titleForEnglish": "Waterdrops",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/41/202005121335125ea69795-a751-4435-ac03-88b141d02527.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 41,
  "artwork": {
    "id": 37,
    "artist": {
      "id": 27,
      "artistName": "김창열",
      "artistNameForEnglish": "Tschangyeul Kim",
      "artistNameForKorean": "김창열",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "물방울(Waterdrops)",
    "material": "마대에 유채(Oil on hemp cloth)",
    "size1": 119.9,
    "size2": 29.6,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": ".",
    "productionYear": "2016",
    "signatureInfo": "signed, dated and inscribed ‘SH201701’ on the right side",
    "provenance": "2020.04 서울옥션 부산경매",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/37/202010061524561f1727a5-076e-4c0c-b156-98f900a5f04c.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "물방울",
  "quantity": 5000,
  "pieceAmount": 10000,
  "estimateMinAmount": 50000000,
  "estimateMaxAmount": 100000000,
  "investBeginDateTime": "2020-05-15T14:00:00",
  "investEndDateTime": "2020-06-14T00:00:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 43.99,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/41/202005121335125ea69795-a751-4435-ac03-88b141d02527.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/41/2020051215563262b6156d-f405-4ba0-a5ea-e200ae8c8ac0.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/41/20200514133138dcdd5150-a98d-417a-977e-86c55a64f942.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/41/20200514133145dbf165c6-fbab-455b-9a90-ea3b4d85ec50.jpg"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 5000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>113. 앤디 워홀 : Love 311 — 매각완료 / goodsId 40</summary>

- 식별자 : `goodsId` 40 / `goodsCoPurchaseId` 178
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/40) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=40) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=40)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 42.21

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 178,
  "goodsId": 40,
  "goodsName": "[핀크앱 전용] Love 311",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-05-08T11:00:00",
  "investEndDateTime": "2020-05-08T11:12:00",
  "saleYieldPercent": 42.21,
  "artistNameForKorean": "앤디 워홀",
  "artistNameForEnglish": "Andy Warhol",
  "titleForKorean": null,
  "titleForEnglish": "Love 311",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/40/202005061458590fd71ed5-09a5-415c-9fb3-92b4d779036b.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 40,
  "artwork": {
    "id": 36,
    "artist": {
      "id": 26,
      "artistName": "앤디 워홀",
      "artistNameForEnglish": "Andy Warhol",
      "artistNameForKorean": "앤디 워홀",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Love 311",
    "material": "Screenprints on Rives BFK paper",
    "size1": 50,
    "size2": 66,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": "ed.44/100 (plus 10 artist's proofs)",
    "productionYear": "1983",
    "signatureInfo": "왼쪽 하단",
    "provenance": "2020.04 아트시 X 서울옥션 온라인 경매 : G.O.A.T.",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/36/20201007161914cc0bc397-7dc9-4cb6-9225-8424aa6c2247.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "[핀크앱 전용] Love 311",
  "quantity": 2227,
  "pieceAmount": 10000,
  "estimateMinAmount": 18000000,
  "estimateMaxAmount": 35000000,
  "investBeginDateTime": "2020-05-08T11:00:00",
  "investEndDateTime": "2020-05-08T11:12:00",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 42.21,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/40/202005061458590fd71ed5-09a5-415c-9fb3-92b4d779036b.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 2227
}</code></pre>

</details>

<details>
<summary>114. 프란시스 베이컨 : Untitled — 모집종료 / goodsId 39</summary>

- 식별자 : `goodsId` 39 / `goodsCoPurchaseId` 177
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/39) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=39) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=39)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 177,
  "goodsId": 39,
  "goodsName": "Untitled(middle panel from Triptych August 1972)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-04-24T00:00:00",
  "investEndDateTime": "2020-04-24T14:25:05",
  "saleYieldPercent": 0,
  "artistNameForKorean": "프란시스 베이컨",
  "artistNameForEnglish": "Francis Bacon",
  "titleForKorean": "",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/39/2020042412494224d64fbb-64f1-45c8-b080-035c5c31c859.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 39,
  "artwork": {
    "id": 35,
    "artist": {
      "id": 25,
      "artistName": "프란시스 베이컨",
      "artistNameForEnglish": "Francis Bacon",
      "artistNameForKorean": "프란시스 베이컨",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Untitled",
    "material": "lithograph",
    "size1": 48.5,
    "size2": 64,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.159/180",
    "productionYear": "1979",
    "signatureInfo": "",
    "provenance": "2020.04 아트시 X 서울옥션 온라인 경매 : G.O.A.T.",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/35/202010061524393de83458-9065-4627-91f6-1963a6ea4008.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled(middle panel from Triptych August 1972)",
  "quantity": 974,
  "pieceAmount": 10000,
  "estimateMinAmount": 9000000,
  "estimateMaxAmount": 13000000,
  "investBeginDateTime": "2020-04-24T00:00:00",
  "investEndDateTime": "2020-04-24T14:25:05",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/39/2020042412494224d64fbb-64f1-45c8-b080-035c5c31c859.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/39/2020042412494258e7552d-f446-44e9-b63b-6aa31e290653.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 974,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>115. 카우스 : Blame Game — 모집종료 / goodsId 38</summary>

- 식별자 : `goodsId` 38 / `goodsCoPurchaseId` 176
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/38) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=38) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=38)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 176,
  "goodsId": 38,
  "goodsName": "Blame game",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-04-08T00:00:00",
  "investEndDateTime": "2020-04-09T00:25:22",
  "saleYieldPercent": 0,
  "artistNameForKorean": "카우스",
  "artistNameForEnglish": "KAWS",
  "titleForKorean": "",
  "titleForEnglish": "Blame Game",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/38/202004071644409edc6fde-a087-4d92-835b-bad065e2392f.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 38,
  "artwork": {
    "id": 33,
    "artist": {
      "id": 23,
      "artistName": "카우스",
      "artistNameForEnglish": "KAWS",
      "artistNameForKorean": "카우스",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Blame Game",
    "material": "Screenprint in color on Saunders waterford paper",
    "size1": 88.6,
    "size2": 58.3,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.81/100",
    "productionYear": "2014",
    "signatureInfo": "우측 하단",
    "provenance": "2020.03 제115회 미술품 경매 서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/33/2020100716185727660ee7-7862-478b-8c75-40f275756eb5.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Blame game",
  "quantity": 1674,
  "pieceAmount": 10000,
  "estimateMinAmount": 15000000,
  "estimateMaxAmount": 23000000,
  "investBeginDateTime": "2020-04-08T00:00:00",
  "investEndDateTime": "2020-04-09T00:25:22",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/38/202004071644409edc6fde-a087-4d92-835b-bad065e2392f.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1674,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>116. 월전 장우성 : 산(山) — 모집종료 / goodsId 37</summary>

- 식별자 : `goodsId` 37 / `goodsCoPurchaseId` 175
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/37) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=37) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=37)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 175,
  "goodsId": 37,
  "goodsName": "산(山)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2020-01-20T13:00:00",
  "investEndDateTime": "2020-01-20T14:28:22",
  "saleYieldPercent": 0,
  "artistNameForKorean": "월전 장우성",
  "artistNameForEnglish": "Woosung Chang",
  "titleForKorean": "산(山)",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/37/20200427165630e6f365be-9940-4e1f-bab2-0a8e3ead2308.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 37,
  "artwork": {
    "id": 32,
    "artist": {
      "id": 22,
      "artistName": "월전 장우성",
      "artistNameForEnglish": "Woosung Chang",
      "artistNameForKorean": "월전 장우성",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "산(山)",
    "material": "종이에 수묵담채(Ink and color on paper)",
    "size1": 90.2,
    "size2": 72.4,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": ".",
    "productionYear": "1980",
    "signatureInfo": ".",
    "provenance": ".",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/32/202010071618399f8d6031-2628-44a0-857c-2b72b3a83971.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "산(山)",
  "quantity": 514,
  "pieceAmount": 10000,
  "estimateMinAmount": 4000000,
  "estimateMaxAmount": 7000000,
  "investBeginDateTime": "2020-01-20T13:00:00",
  "investEndDateTime": "2020-01-20T14:28:22",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/37/20200427165630e6f365be-9940-4e1f-bab2-0a8e3ead2308.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/37/20200427165630f8a2fac1-cd81-4531-b281-0dfa627dc22b.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 514,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>117. 에바 알머슨 : Reencontrarme Reconocerme — 매각완료 / goodsId 36</summary>

- 식별자 : `goodsId` 36 / `goodsCoPurchaseId` 174
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/36) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=36) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=36)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 19.05

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 174,
  "goodsId": 36,
  "goodsName": "Reencontrarme Reconocerme",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2020-01-16T13:00:00",
  "investEndDateTime": "2020-01-16T14:08:01",
  "saleYieldPercent": 19.05,
  "artistNameForKorean": "에바 알머슨",
  "artistNameForEnglish": "Eva Armisén",
  "titleForKorean": null,
  "titleForEnglish": "Reencontrarme Reconocerme",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/36/2020042716554372db3799-feca-4021-af1b-7e65826738ae.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 36,
  "artwork": {
    "id": 31,
    "artist": {
      "id": 5,
      "artistName": "에바 알머슨",
      "artistNameForEnglish": "Eva Armisén",
      "artistNameForKorean": "에바 알머슨",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Reencontrarme Reconocerme",
    "material": "Oil on canvas",
    "size1": 116,
    "size2": 73,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2016",
    "signatureInfo": "우측하단",
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/31/202010071618216f68056f-783f-45a9-b72d-14faf32883aa.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Reencontrarme Reconocerme",
  "quantity": 1253,
  "pieceAmount": 10000,
  "estimateMinAmount": 12000000,
  "estimateMaxAmount": 35000000,
  "investBeginDateTime": "2020-01-16T13:00:00",
  "investEndDateTime": "2020-01-16T14:08:01",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 19.05,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/36/2020042716554372db3799-feca-4021-af1b-7e65826738ae.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/36/20200427165543e97558ac-8a8d-4bb4-98a5-16c42fcc09a3.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 1253
}</code></pre>

</details>

<details>
<summary>118. 이우환 : 대화(Dialogue) — 매각완료 / goodsId 34</summary>

- 식별자 : `goodsId` 34 / `goodsCoPurchaseId` 172
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/34) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=34) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=34)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 20.67

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 172,
  "goodsId": 34,
  "goodsName": "Dialogue",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-12-02T13:00:00",
  "investEndDateTime": "2020-01-01T23:59:59",
  "saleYieldPercent": 20.67,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "대화(Dialogue)",
  "titleForEnglish": null,
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/34/202004271653461e8cad27-48cf-43b8-8535-3139acdd3b12.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 34,
  "artwork": {
    "id": 29,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "대화(Dialogue)",
    "material": "Oil and mineral pigment on canvas",
    "size1": 100,
    "size2": 80.5,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2008",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/29/20200924112703d94d5921-9c24-4499-9f32-53e49603ce8a.jpg\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Dialogue",
  "quantity": 26006,
  "pieceAmount": 10000,
  "estimateMinAmount": 250000000,
  "estimateMaxAmount": 500000000,
  "investBeginDateTime": "2019-12-02T13:00:00",
  "investEndDateTime": "2020-01-01T23:59:59",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 20.67,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/34/202004271653461e8cad27-48cf-43b8-8535-3139acdd3b12.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/34/202004271653466d693c28-e4b2-47d2-940c-767104b04457.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 26006,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>119. 이우환 : 점으로부터(From Point) — 매각완료 / goodsId 35</summary>

- 식별자 : `goodsId` 35 / `goodsCoPurchaseId` 173
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/35) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=35) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=35)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 15.26

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 173,
  "goodsId": 35,
  "goodsName": "From Point",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-12-02T13:00:00",
  "investEndDateTime": "2020-01-01T23:59:59",
  "saleYieldPercent": 15.26,
  "artistNameForKorean": "이우환",
  "artistNameForEnglish": "UFan Lee",
  "titleForKorean": "점으로부터(From Point)",
  "titleForEnglish": null,
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/35/202004271654574d8f21bc-f21e-4a73-abcb-6a8f68fb332f.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 35,
  "artwork": {
    "id": 30,
    "artist": {
      "id": 21,
      "artistName": "이우환",
      "artistNameForEnglish": "UFan Lee",
      "artistNameForKorean": "이우환",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "점으로부터(From Point)",
    "material": "Oil and mineral pigment on canvas",
    "size1": 91.3,
    "size2": 73,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "1983",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/30/202011111427387df713d6-6e5c-4ade-b3fc-aa379e93cff1.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "From Point",
  "quantity": 31234,
  "pieceAmount": 10000,
  "estimateMinAmount": 280000000,
  "estimateMaxAmount": 500000000,
  "investBeginDateTime": "2019-12-02T13:00:00",
  "investEndDateTime": "2020-01-01T23:59:59",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 15.26,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/35/202004271654574d8f21bc-f21e-4a73-abcb-6a8f68fb332f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/35/2020042716544959c19af8-baac-42c5-a3a6-9e0bd8467aac.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/35/20200427165449bf4cb1d6-4107-4c3f-81ca-7536abc77937.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/35/20200427165457e44c07be-8953-4b6c-b683-ce971cd996f0.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 31234,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>120. 두민 x 이메진 AI : Commune with... — 모집종료 / goodsId 33</summary>

- 식별자 : `goodsId` 33 / `goodsCoPurchaseId` 171
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/33) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=12&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=33) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=33)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 171,
  "goodsId": 33,
  "goodsName": "Commune with...",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-10-25T13:00:00",
  "investEndDateTime": "2019-11-01T23:35:20",
  "saleYieldPercent": 0,
  "artistNameForKorean": "두민 x 이메진 AI",
  "artistNameForEnglish": "Do  Min x Imagine AI",
  "titleForKorean": "",
  "titleForEnglish": "Commune with...",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/33/20200427165258bf0a4b85-3ee7-4968-8083-0250b067c2ba.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 33,
  "artwork": {
    "id": 28,
    "artist": {
      "id": 20,
      "artistName": "두민 x 이메진 AI",
      "artistNameForEnglish": "Do  Min x Imagine AI",
      "artistNameForKorean": "두민 x 이메진 AI",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Commune with...",
    "material": "한지에 펜화",
    "size1": 60,
    "size2": 120,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "뒷면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/28/20201007161803a309c104-92e8-4ac4-9462-5aaf00775a14.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Commune with...",
  "quantity": 1000,
  "pieceAmount": 10000,
  "estimateMinAmount": 9000000,
  "estimateMaxAmount": 14000000,
  "investBeginDateTime": "2019-10-25T13:00:00",
  "investEndDateTime": "2019-11-01T23:35:20",
  "availableQuantity": 0,
  "interviewUrl": "/qeOqkzlr-nY",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/33/20200427165258bf0a4b85-3ee7-4968-8083-0250b067c2ba.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/33/20200427165258797dcd3c-2973-4f0f-84a6-71996c8c9a3e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/33/202004271652583014bb56-7bfb-4add-9a9b-87185c2e9451.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/33/20200427165303b001e387-2630-4160-8582-5944d51b343d.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1000,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-13"></a>

### 13페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=13) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>121. 두민 x 이메진 AI : Commune with... — 모집종료 / goodsId 32</summary>

- 식별자 : `goodsId` 32 / `goodsCoPurchaseId` 170
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/32) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=32) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=32)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 170,
  "goodsId": 32,
  "goodsName": "Commune with... ",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-09-26T13:00:00",
  "investEndDateTime": "2019-10-14T23:59:59",
  "saleYieldPercent": 0,
  "artistNameForKorean": "두민 x 이메진 AI",
  "artistNameForEnglish": "Do  Min x Imagine AI",
  "titleForKorean": null,
  "titleForEnglish": "Commune with...",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/32/202004271651500436aaef-47c3-4d6d-854f-4e3f21f20774.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 32,
  "artwork": {
    "id": 27,
    "artist": {
      "id": 20,
      "artistName": "두민 x 이메진 AI",
      "artistNameForEnglish": "Do  Min x Imagine AI",
      "artistNameForKorean": "두민 x 이메진 AI",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Commune with...",
    "material": "캔버스에 혼합재료",
    "size1": 60,
    "size2": 120,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2019",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/27/2020100716174428c3e33d-e8ba-4b2f-8563-66fb0aec330e.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Commune with... ",
  "quantity": 5000,
  "pieceAmount": 10000,
  "estimateMinAmount": 47000000,
  "estimateMaxAmount": 70000000,
  "investBeginDateTime": "2019-09-26T13:00:00",
  "investEndDateTime": "2019-10-14T23:59:59",
  "availableQuantity": 0,
  "interviewUrl": "/qeOqkzlr-nY",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/32/202004271651500436aaef-47c3-4d6d-854f-4e3f21f20774.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/32/20200427165151bcc2457e-efa9-4232-aaf9-797081ef440f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/32/202004271651519fc612fa-91c0-4794-b741-08996c9db70b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/32/20200427165151e8d06f6c-65e1-4494-9ee2-b63fc8ae5d8c.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 5000
}</code></pre>

</details>

<details>
<summary>122. 데미안 허스트 : A Dream — 모집종료 / goodsId 31</summary>

- 식별자 : `goodsId` 31 / `goodsCoPurchaseId` 169
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/31) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=31) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=31)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 169,
  "goodsId": 31,
  "goodsName": "A Dream",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-08-29T13:00:00",
  "investEndDateTime": "2019-08-30T15:59:05",
  "saleYieldPercent": 0,
  "artistNameForKorean": "데미안 허스트",
  "artistNameForEnglish": "Damien Hirst",
  "titleForKorean": "",
  "titleForEnglish": "A Dream",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/31/20200427165039e7e5c591-e428-4b75-94c2-81f7072547f4.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 31,
  "artwork": {
    "id": 26,
    "artist": {
      "id": 19,
      "artistName": "데미안 허스트",
      "artistNameForEnglish": "Damien Hirst",
      "artistNameForKorean": "데미안 허스트",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "A Dream",
    "material": "Photogravure etching with lithographic overlay printed in colors",
    "size1": 77,
    "size2": 75,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2014",
    "signatureInfo": "",
    "provenance": "서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/26/20201006152405d33fb357-c4be-48f2-8213-d845b09cc794.png\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "A Dream",
  "quantity": 1317,
  "pieceAmount": 10000,
  "estimateMinAmount": 12000000,
  "estimateMaxAmount": 18000000,
  "investBeginDateTime": "2019-08-29T13:00:00",
  "investEndDateTime": "2019-08-30T15:59:05",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/31/20200427165039e7e5c591-e428-4b75-94c2-81f7072547f4.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/31/2020042716504670577eb1-6ee9-4918-af55-cd7164bcff05.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/31/2020042716505204cb5f15-a282-4d45-ada1-96880e3385f3.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/31/20200427165057ce61074c-40d3-44b1-9765-815133c47354.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1317,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>123. 마리킴 : Red Hat — 매각완료 / goodsId 30</summary>

- 식별자 : `goodsId` 30 / `goodsCoPurchaseId` 168
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/30) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=30) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=30)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 38.56

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 168,
  "goodsId": 30,
  "goodsName": "Red Hat",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-08-15T13:00:00",
  "investEndDateTime": "2019-08-15T14:00:04",
  "saleYieldPercent": 38.56,
  "artistNameForKorean": "마리킴",
  "artistNameForEnglish": "Mari Kim",
  "titleForKorean": null,
  "titleForEnglish": "Red Hat",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/30/202004271649320c54a727-ced1-46d1-95d8-8e547b8b9771.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 30,
  "artwork": {
    "id": 25,
    "artist": {
      "id": 1,
      "artistName": "마리킴",
      "artistNameForEnglish": "Mari Kim",
      "artistNameForKorean": "마리킴",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Red Hat",
    "material": "lambda print, face mount",
    "size1": 98,
    "size2": 74,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2010",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/25/2020122118403042d411c5-2ed1-47e2-9868-196ebd02b1a0.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Red Hat",
  "quantity": 599,
  "pieceAmount": 10000,
  "estimateMinAmount": 4000000,
  "estimateMaxAmount": 7000000,
  "investBeginDateTime": "2019-08-15T13:00:00",
  "investEndDateTime": "2019-08-15T14:00:04",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 38.56,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/30/202004271649320c54a727-ced1-46d1-95d8-8e547b8b9771.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/30/202004271649321c70755c-6c37-415b-b35e-35265a865f91.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/30/202004271649380c84a589-318b-4836-8f56-6d42f705eb98.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 599,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>124. 홍성준 : Untitled — 모집종료 / goodsId 29</summary>

- 식별자 : `goodsId` 29 / `goodsCoPurchaseId` 167
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/29) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=29) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=29)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 167,
  "goodsId": 29,
  "goodsName": "Untitled",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-08-05T13:00:00",
  "investEndDateTime": "2019-09-09T11:35:35",
  "saleYieldPercent": 0,
  "artistNameForKorean": "홍성준",
  "artistNameForEnglish": "Seongjoon Hong",
  "titleForKorean": "",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/202004271648139f23466f-02e0-46d6-8f46-cb86f820ae68.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 29,
  "artwork": {
    "id": 24,
    "artist": {
      "id": 18,
      "artistName": "홍성준",
      "artistNameForEnglish": "Seongjoon Hong",
      "artistNameForKorean": "홍성준",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Untitled",
    "material": "Oil &amp; Acrylic on canvas",
    "size1": 163,
    "size2": 163,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2011",
    "signatureInfo": "",
    "provenance": "작가 위탁",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/24/20201007161653cd14dde6-1d6a-4b05-897f-f8ce3a23c4d9.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled",
  "quantity": 1000,
  "pieceAmount": 10000,
  "estimateMinAmount": 9000000,
  "estimateMaxAmount": 13000000,
  "investBeginDateTime": "2019-08-05T13:00:00",
  "investEndDateTime": "2019-09-09T11:35:35",
  "availableQuantity": 0,
  "interviewUrl": "/ZiXNHRy4P-M",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/202004271648139f23466f-02e0-46d6-8f46-cb86f820ae68.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164824c0d380f8-4249-4159-9f72-01b8e6527cde.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164813e51d4c15-a8c0-4387-b18d-ff670d4a70cb.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164824e10f693f-7a35-4e94-b7cf-6fa60be63a54.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164824e8423fe3-d4a9-4223-96be-8b26fd7a8cc3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164835684c47b4-82c6-45e6-b3aa-de7ae7a00c9f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/29/20200427164835003d7d52-095d-4cf3-9524-d735ea5a5175.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>125. 홍성준 : JUST ANOTHER CROCODILE BIRD — 모집종료 / goodsId 28</summary>

- 식별자 : `goodsId` 28 / `goodsCoPurchaseId` 166
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/28) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=28) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=28)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 166,
  "goodsId": 28,
  "goodsName": "JUST ANOTHER CROCODILE BIRD",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-07-15T13:00:00",
  "investEndDateTime": "2019-07-15T16:19:58",
  "saleYieldPercent": 0,
  "artistNameForKorean": "홍성준",
  "artistNameForEnglish": "Seongjoon Hong",
  "titleForKorean": "",
  "titleForEnglish": "JUST ANOTHER CROCODILE BIRD",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/202004271645488c687efc-2421-4b94-8cce-f8f6105efb3f.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 28,
  "artwork": {
    "id": 23,
    "artist": {
      "id": 18,
      "artistName": "홍성준",
      "artistNameForEnglish": "Seongjoon Hong",
      "artistNameForKorean": "홍성준",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "JUST ANOTHER CROCODILE BIRD",
    "material": "acrylic &amp; oil on canvas",
    "size1": 162,
    "size2": 96.8,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2017",
    "signatureInfo": "뒷면",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/23/202010071617068abe6d45-d84d-4f12-b98b-0b0bc2055923.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "JUST ANOTHER CROCODILE BIRD",
  "quantity": 700,
  "pieceAmount": 10000,
  "estimateMinAmount": 6000000,
  "estimateMaxAmount": 9000000,
  "investBeginDateTime": "2019-07-15T13:00:00",
  "investEndDateTime": "2019-07-15T16:19:58",
  "availableQuantity": 0,
  "interviewUrl": null,
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/202004271645488c687efc-2421-4b94-8cce-f8f6105efb3f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/20200427164556e6f53649-4316-4278-ab21-a2aab466308c.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/202004271646022bdc7b78-ae10-411d-9ab2-d44c9a95181b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/202004271646086b294a6a-7fe1-4643-8373-1de0ad2559de.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/20200427164613393cfd50-98bd-4770-b06b-d5082119b088.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/28/2020042716461824812e21-3d9c-49d1-b94c-9315a94a4709.jpg"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 700
}</code></pre>

</details>

<details>
<summary>126. 이배 : Quadriptyque 4-4 — 매각완료 / goodsId 27</summary>

- 식별자 : `goodsId` 27 / `goodsCoPurchaseId` 165
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/27) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=27) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=27)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 40

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 165,
  "goodsId": 27,
  "goodsName": "Quadriptyque 4-4",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-06-24T13:00:00",
  "investEndDateTime": "2019-08-04T13:31:57",
  "saleYieldPercent": 40,
  "artistNameForKorean": "이배",
  "artistNameForEnglish": "Bae Lee",
  "titleForKorean": null,
  "titleForEnglish": "Quadriptyque 4-4",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/2020042716433760ac00a0-bb5b-40e6-bd6f-22a7832a75ad.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 27,
  "artwork": {
    "id": 22,
    "artist": {
      "id": 17,
      "artistName": "이배",
      "artistNameForEnglish": "Bae Lee",
      "artistNameForKorean": "이배",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Quadriptyque 4-4",
    "material": "캔버스에 혼합재료",
    "size1": 72.5,
    "size2": 165,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2007",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/22/202010071616308d1c0e3e-d802-4b47-9eec-c499bd75d690.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Quadriptyque 4-4",
  "quantity": 3000,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 50000000,
  "investBeginDateTime": "2019-06-24T13:00:00",
  "investEndDateTime": "2019-08-04T13:31:57",
  "availableQuantity": 0,
  "interviewUrl": "/-lRhg5-ysIk",
  "saleYieldPercent": 40,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/2020042716433760ac00a0-bb5b-40e6-bd6f-22a7832a75ad.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/20200427164350b579834b-09f3-4b7e-94f3-e6dcbb7155d3.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/2020042716435523f493c9-9353-423b-ae53-55947465ec89.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/20200427164414ff985296-ea54-4a44-8472-6b9b014bdafd.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/27/202004271644142e6a9873-9d12-4cef-8548-fc67e195afe9.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 3000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>127. 이배 : Quadriptyque 4-3 — 매각완료 / goodsId 26</summary>

- 식별자 : `goodsId` 26 / `goodsCoPurchaseId` 164
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/26) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=26) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=26)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 50.51

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 164,
  "goodsId": 26,
  "goodsName": "Quadriptyque 4-3",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-06-10T00:00:00",
  "investEndDateTime": "2019-07-09T00:00:00",
  "saleYieldPercent": 50.51,
  "artistNameForKorean": "이배",
  "artistNameForEnglish": "Bae Lee",
  "titleForKorean": null,
  "titleForEnglish": "Quadriptyque 4-3",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/202004271641376fe60e7b-9307-4dad-bd2d-86149c97c3de.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 26,
  "artwork": {
    "id": 21,
    "artist": {
      "id": 17,
      "artistName": "이배",
      "artistNameForEnglish": "Bae Lee",
      "artistNameForKorean": "이배",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Quadriptyque 4-3",
    "material": "캔버스에 혼합재료",
    "size1": 165,
    "size2": 72.5,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2007",
    "signatureInfo": null,
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/21/2020100716161558c7fffc-c2a9-407a-8ec0-a5dc883cca8d.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Quadriptyque 4-3",
  "quantity": 3000,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 50000000,
  "investBeginDateTime": "2019-06-10T00:00:00",
  "investEndDateTime": "2019-07-09T00:00:00",
  "availableQuantity": 0,
  "interviewUrl": "/mGtTuSX00rc",
  "saleYieldPercent": 50.51,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/202004271641376fe60e7b-9307-4dad-bd2d-86149c97c3de.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/2020042716420903ae3a07-962e-434e-a54d-c1e9fe6e6ebe.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/20200427164144c9b77173-1b8d-4eb4-893b-272c7e3eb66f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/2020042716420935488ff6-4412-4d6b-ac4c-c385d0cc9894.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/26/20200427164137e687a949-70ae-444b-9f19-fc4099904d6d.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 3000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>128. 두민 : The boundary of Fantasy — 모집종료 / goodsId 25</summary>

- 식별자 : `goodsId` 25 / `goodsCoPurchaseId` 163
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/25) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=25) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=25)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 163,
  "goodsId": 25,
  "goodsName": "The Boundary of Fantasy",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-05-20T13:00:00",
  "investEndDateTime": "2019-05-21T01:08:54",
  "saleYieldPercent": 0,
  "artistNameForKorean": "두민",
  "artistNameForEnglish": "Do Min",
  "titleForKorean": "",
  "titleForEnglish": "The boundary of Fantasy",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/2020042716253617490d3d-12e4-4b6c-b78a-5f9c4e67a960.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 25,
  "artwork": {
    "id": 20,
    "artist": {
      "id": 16,
      "artistName": "두민",
      "artistNameForEnglish": "Do Min",
      "artistNameForKorean": "두민",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "The boundary of Fantasy",
    "material": "Oil on canvas",
    "size1": 100,
    "size2": 100,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "",
    "provenance": "작가 위탁",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/20/20201007162316fc3f5809-754a-4b7e-9c59-e0066c595d41.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "The Boundary of Fantasy",
  "quantity": 1000,
  "pieceAmount": 10000,
  "estimateMinAmount": 9000000,
  "estimateMaxAmount": 14000000,
  "investBeginDateTime": "2019-05-20T13:00:00",
  "investEndDateTime": "2019-05-21T01:08:54",
  "availableQuantity": 0,
  "interviewUrl": "/Zd9AO7Cud2I",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/2020042716253617490d3d-12e4-4b6c-b78a-5f9c4e67a960.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/202004271625367096a3d4-c831-459d-b556-e829e93b09c2.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/2020042716255692330c1b-bfb1-47a4-b441-1dcffa76bbac.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/2020042716253624731b96-c527-4b5b-aae4-124e1ab97b55.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/202004271625364c5878e1-4599-4edf-a012-7b41889d2902.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/25/202004271625572c4b6649-2e3b-4f2c-b312-a5dbe80fe50e.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>129. 줄리안 오피 : Sara Dancing 1 — 모집종료 / goodsId 3</summary>

- 식별자 : `goodsId` 3 / `goodsCoPurchaseId` 146
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/3) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=3) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=3)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 146,
  "goodsId": 3,
  "goodsName": "Sara Dancing 1",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-05-03T13:00:00",
  "investEndDateTime": "2019-05-09T03:52:50",
  "saleYieldPercent": 0,
  "artistNameForKorean": "줄리안 오피",
  "artistNameForEnglish": "Julian Opie",
  "titleForKorean": "",
  "titleForEnglish": "Sara Dancing 1",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/3/202004271450458e50091b-5206-42b1-94fa-03f025805314.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 3,
  "artwork": {
    "id": 3,
    "artist": {
      "id": 3,
      "artistName": "줄리안 오피",
      "artistNameForEnglish": "Julian Opie",
      "artistNameForKorean": "줄리안 오피",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Sara Dancing 1",
    "material": "Vinyl on wooden stretcher",
    "size1": 240.9,
    "size2": 116.3,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2004",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/3/202010071615573a7b5e5f-d653-4fbc-8e9e-c951c1e931ba.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Sara Dancing 1",
  "quantity": 9781,
  "pieceAmount": 10000,
  "estimateMinAmount": 92000000,
  "estimateMaxAmount": 130000000,
  "investBeginDateTime": "2019-05-03T13:00:00",
  "investEndDateTime": "2019-05-09T03:52:50",
  "availableQuantity": 0,
  "interviewUrl": "_kcifeF13fY",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/3/202004271450458e50091b-5206-42b1-94fa-03f025805314.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/3/20200427145045d6de8652-94d3-4104-a5f5-19784e1f2de6.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/3/20200427145045dc4dbd29-ada7-477d-98d7-bc934dc4bd4f.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/3/20200427145045069c7ed8-0b50-4026-8c44-c61222ba4e89.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 9781
}</code></pre>

</details>

<details>
<summary>130. 다카시 무라카미 : An Homage to monopink 1960 A — 매각완료 / goodsId 24</summary>

- 식별자 : `goodsId` 24 / `goodsCoPurchaseId` 162
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/24) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=13&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=24) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=24)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 88.24

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 162,
  "goodsId": 24,
  "goodsName": "An Homage to monopink 1960 A",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-04-22T13:00:00",
  "investEndDateTime": "2019-04-22T13:25:55",
  "saleYieldPercent": 88.24,
  "artistNameForKorean": "다카시 무라카미",
  "artistNameForEnglish": "Takashi Murakami",
  "titleForKorean": null,
  "titleForEnglish": "An Homage to monopink 1960 A",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/20201119175819e6bb6631-3eaa-4f70-a06b-56a305727658.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 24,
  "artwork": {
    "id": 19,
    "artist": {
      "id": 15,
      "artistName": "다카시 무라카미",
      "artistNameForEnglish": "Takashi Murakami",
      "artistNameForKorean": "다카시 무라카미",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "An Homage to monopink 1960 A",
    "material": "Offset lithograph",
    "size1": 72.7,
    "size2": 52.5,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": "ed.94/300",
    "productionYear": "2012",
    "signatureInfo": "우측 하단",
    "provenance": null,
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/19/20201221174215aa64677a-fcbe-4c3d-b926-81d890a8ebf4.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "An Homage to monopink 1960 A",
  "quantity": 170,
  "pieceAmount": 10000,
  "estimateMinAmount": 1200000,
  "estimateMaxAmount": 1700000,
  "investBeginDateTime": "2019-04-22T13:00:00",
  "investEndDateTime": "2019-04-22T13:25:55",
  "availableQuantity": 0,
  "interviewUrl": "/uQ3nvuZNTTw",
  "saleYieldPercent": 88.24,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/20201119175819e6bb6631-3eaa-4f70-a06b-56a305727658.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/202004271620505bf9af39-932a-42c8-a5eb-bfe504ab9ed5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/20200427162051af1a6411-e16c-4fde-aec5-5c79b63251ed.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/202004271620515e77f71d-5738-4b5f-88d6-8c3203cc083e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/20200427162051d4d4cb57-3a7e-4b4a-884c-d5926699f76d.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/24/20200427162051e98eaf9e-faa9-49ed-956b-158ce2aebdd8.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 170,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-14"></a>

### 14페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 10건
- [화면](https://weshareart.com/goods?type=ALL&page=14) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>131. 다카시 무라카미 : Flower — 매각완료 / goodsId 23</summary>

- 식별자 : `goodsId` 23 / `goodsCoPurchaseId` 161
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/23) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=23) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=23)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 50

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 161,
  "goodsId": 23,
  "goodsName": "Flower(set of 2)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-04-08T13:00:00",
  "investEndDateTime": "2019-04-08T16:23:12",
  "saleYieldPercent": 50,
  "artistNameForKorean": "다카시 무라카미",
  "artistNameForEnglish": "Takashi Murakami",
  "titleForKorean": null,
  "titleForEnglish": "Flower",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/2020042716135645f6a2ed-cde8-4e3b-835f-8249458df7e3.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 23,
  "artwork": {
    "id": 18,
    "artist": {
      "id": 15,
      "artistName": "다카시 무라카미",
      "artistNameForEnglish": "Takashi Murakami",
      "artistNameForKorean": "다카시 무라카미",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Flower",
    "material": "Offset prints",
    "size1": 52,
    "size2": 52.3,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2002",
    "signatureInfo": null,
    "provenance": "서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/18/2020033119353184691305-89c6-4c9f-93fc-e454c450e39f.jpg\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Flower(set of 2)",
  "quantity": 200,
  "pieceAmount": 10000,
  "estimateMinAmount": 1000000,
  "estimateMaxAmount": 3000000,
  "investBeginDateTime": "2019-04-08T13:00:00",
  "investEndDateTime": "2019-04-08T16:23:12",
  "availableQuantity": 0,
  "interviewUrl": "/GMtq9PSUUqU",
  "saleYieldPercent": 50,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/2020042716135645f6a2ed-cde8-4e3b-835f-8249458df7e3.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/20200427161356789b2628-e0a3-4599-b242-09e895cf1240.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/20200427161356a0adeea9-31be-4735-a9c4-b59ae20fe0ea.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/20200427161454caefbdf2-3fce-47a0-aec2-61ad77d89188.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/202004271614542fea131b-f135-4f47-91a1-4065d049a5fe.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/2020042716135625f13712-1cd6-4d16-968e-b7a58416cab8.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/23/202004271615160a6b15db-0d0e-4e68-b0e5-50fc60f61010.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 200,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>132. 지근욱 : Cohesive Sphere - 0026 — 모집종료 / goodsId 22</summary>

- 식별자 : `goodsId` 22 / `goodsCoPurchaseId` 160
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/22) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=22) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=22)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 160,
  "goodsId": 22,
  "goodsName": "Cohesive Sphere - 0026",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-03-25T13:00:00",
  "investEndDateTime": "2019-04-18T16:20:25",
  "saleYieldPercent": 0,
  "artistNameForKorean": "지근욱",
  "artistNameForEnglish": "Keunwook Ji",
  "titleForKorean": "",
  "titleForEnglish": "Cohesive Sphere - 0026",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/202004271606366668d49b-0660-4a60-90a0-2e059e704200.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 22,
  "artwork": {
    "id": 17,
    "artist": {
      "id": 14,
      "artistName": "지근욱",
      "artistNameForEnglish": "Keunwook Ji",
      "artistNameForKorean": "지근욱",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Cohesive Sphere - 0026",
    "material": "acrylic &amp; color pencil on canvas",
    "size1": 90,
    "size2": 90,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2019",
    "signatureInfo": "뒷면",
    "provenance": "작가위탁",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/17/20201007161535c55f72c9-2a21-4a22-b8cb-819d422e3475.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Cohesive Sphere - 0026",
  "quantity": 500,
  "pieceAmount": 10000,
  "estimateMinAmount": 4000000,
  "estimateMaxAmount": 7000000,
  "investBeginDateTime": "2019-03-25T13:00:00",
  "investEndDateTime": "2019-04-18T16:20:25",
  "availableQuantity": 0,
  "interviewUrl": "/-sl8N7osxwI",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/202004271606366668d49b-0660-4a60-90a0-2e059e704200.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/20200427160652791cef68-18d4-425e-bd4e-5d10e907cb43.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/202004271606367439a65b-1fde-48c8-ab74-dc9d4746bd22.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/202004271606522ddc6e25-aa0a-4f51-99d1-8ca3f6375aac.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/22/202004271606522576a273-1a6e-4792-a42e-78e6988e750f.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 500,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>133. 미스터 브레인워시 : Untitled — 모집종료 / goodsId 21</summary>

- 식별자 : `goodsId` 21 / `goodsCoPurchaseId` 159
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/21) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=21) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=21)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 159,
  "goodsId": 21,
  "goodsName": "Untitled",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-03-04T13:00:00",
  "investEndDateTime": "2019-04-01T13:47:02",
  "saleYieldPercent": 0,
  "artistNameForKorean": "미스터 브레인워시",
  "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
  "titleForKorean": "",
  "titleForEnglish": "Untitled",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/20201119180101dc3adb65-adb0-49c6-89d4-7ce98e5cb343.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 21,
  "artwork": {
    "id": 16,
    "artist": {
      "id": 4,
      "artistName": "미스터 브레인워시",
      "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
      "artistNameForKorean": "미스터 브레인워시",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Untitled",
    "material": "Works on paper, mixed media on paper with stencil, spray paint, acrylic, and collage",
    "size1": 68,
    "size2": 126,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "",
    "provenance": "2018.3.29_서울옥션 홍콩",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/16/20200331193614ae98784d-e565-4845-9b74-70eb5218b02b.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Untitled",
  "quantity": 2118,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 29000000,
  "investBeginDateTime": "2019-03-04T13:00:00",
  "investEndDateTime": "2019-04-01T13:47:02",
  "availableQuantity": 0,
  "interviewUrl": "/A2EKzCY5h40",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/20201119180101dc3adb65-adb0-49c6-89d4-7ce98e5cb343.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/20200427160456b57f0c03-46bf-4752-bda5-9f11325fd1e6.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/202004271604562a9e70e8-75a5-4f39-a633-e81ea89ce1ad.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/2020042716045699f54570-e127-4ef7-82c7-1c8be80282c9.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/21/202004271605033094edd1-e869-49b0-b99a-af5efe081a7a.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 2118
}</code></pre>

</details>

<details>
<summary>134. 김남표 : Instant Landscape — 모집종료 / goodsId 19</summary>

- 식별자 : `goodsId` 19 / `goodsCoPurchaseId` 157
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/19) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=19) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=19)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 157,
  "goodsId": 19,
  "goodsName": "Instant Landscape",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-02-01T13:00:00",
  "investEndDateTime": "2019-02-22T11:21:11",
  "saleYieldPercent": 0,
  "artistNameForKorean": "김남표",
  "artistNameForEnglish": "Nampyo Kim",
  "titleForKorean": "",
  "titleForEnglish": "Instant Landscape",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/20201119180156986348e4-970d-408b-b590-768f930eea7c.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 19,
  "artwork": {
    "id": 13,
    "artist": {
      "id": 11,
      "artistName": "김남표",
      "artistNameForEnglish": "Nampyo Kim",
      "artistNameForKorean": "김남표",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Instant Landscape",
    "material": "Artificial fur and charcoal on canvas",
    "size1": 130,
    "size2": 162,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2008",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/13/202003311938211925268d-5791-4dc6-aabb-9b663ce037f0.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Instant Landscape",
  "quantity": 1300,
  "pieceAmount": 10000,
  "estimateMinAmount": 20000000,
  "estimateMaxAmount": 29000000,
  "investBeginDateTime": "2019-02-01T13:00:00",
  "investEndDateTime": "2019-02-22T11:21:11",
  "availableQuantity": 0,
  "interviewUrl": "K-YLqnXWjuw",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/20201119180156986348e4-970d-408b-b590-768f930eea7c.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/20200924113501f7c70959-1daf-4e26-9f6c-29ae9588ce83.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/202009241135070d2c6b51-7d42-4fbe-b98e-9a3f1dc250a5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/2020092411351199c20bec-ed97-40fd-9fbf-114fd698c665.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/19/202009241135179181cedf-874a-4562-b85a-05a4558c345a.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1300,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>135. 추사 김정희 : 시고(詩稿) — 매각완료 / goodsId 13</summary>

- 식별자 : `goodsId` 13 / `goodsCoPurchaseId` 151
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/13) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=13) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=13)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 28.76

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 151,
  "goodsId": 13,
  "goodsName": "시고(詩稿)",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2019-01-14T13:00:00",
  "investEndDateTime": "2019-02-12T11:28:38",
  "saleYieldPercent": 28.76,
  "artistNameForKorean": "추사 김정희",
  "artistNameForEnglish": "Junghee Kim",
  "titleForKorean": "시고(詩稿)",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/13/202004271520149862c5c7-9f57-4a49-b2e1-2ed6af5caa6b.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 13,
  "artwork": {
    "id": 8,
    "artist": {
      "id": 6,
      "artistName": "추사 김정희",
      "artistNameForEnglish": "Junghee Kim",
      "artistNameForKorean": "추사 김정희",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "시고(詩稿)",
    "material": "종이에 먹",
    "size1": 27.2,
    "size2": 22.2,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "1800",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/8/20200331194210eca89461-061a-4bd9-8732-1dc5e0ca6d07.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "시고(詩稿)",
  "quantity": 2097,
  "pieceAmount": 10000,
  "estimateMinAmount": 19000000,
  "estimateMaxAmount": 29000000,
  "investBeginDateTime": "2019-01-14T13:00:00",
  "investEndDateTime": "2019-02-12T11:28:38",
  "availableQuantity": 0,
  "interviewUrl": "8JbdEdtKud4",
  "saleYieldPercent": 28.76,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/13/202004271520149862c5c7-9f57-4a49-b2e1-2ed6af5caa6b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/13/20200427152015a3318ec0-19d5-4a89-b61c-6d0c474a9cb7.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/13/2020042715201578505638-3877-43c0-b08d-09c34f935dd3.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 2097,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>136. 강익중 : 해피월드 — 모집종료 / goodsId 20</summary>

- 식별자 : `goodsId` 20 / `goodsCoPurchaseId` 158
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/20) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=20) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=20)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 158,
  "goodsId": 20,
  "goodsName": "해피월드",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2019-01-01T13:00:00",
  "investEndDateTime": "2019-01-30T14:56:26",
  "saleYieldPercent": 0,
  "artistNameForKorean": "강익중",
  "artistNameForEnglish": "Ikjoong Kang",
  "titleForKorean": "해피월드",
  "titleForEnglish": "Happy World",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/20/2020042716022609c8c2bf-ff8c-452f-a04c-7dc8d3638d3e.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 20,
  "artwork": {
    "id": 14,
    "artist": {
      "id": 12,
      "artistName": "강익중",
      "artistNameForEnglish": "Ikjoong Kang",
      "artistNameForKorean": "강익중",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "해피월드(Happy World)",
    "material": "Carved and color on wooden board",
    "size1": 58.6,
    "size2": 78.1,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "1996",
    "signatureInfo": "",
    "provenance": "2010.12.14_서울옥",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/14/202003311937359c0a918a-8b0e-40f1-b7a6-dd135992d2ed.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "해피월드",
  "quantity": 1800,
  "pieceAmount": 10000,
  "estimateMinAmount": 17000000,
  "estimateMaxAmount": 25000000,
  "investBeginDateTime": "2019-01-01T13:00:00",
  "investEndDateTime": "2019-01-30T14:56:26",
  "availableQuantity": 0,
  "interviewUrl": "JdaN_TquH0Q",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/20/2020042716022609c8c2bf-ff8c-452f-a04c-7dc8d3638d3e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/20/20200427160226f8e7336d-e34a-4b65-bf53-46298f6f9566.jpeg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/20/20200427160226da310bbe-ba2e-4d12-bd1f-efb23c708dcf.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/20/2020042716022792456d74-8929-48f3-8b23-5bbdd0469375.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1800,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>137. 마리킴 : Cinderella — 매각완료 / goodsId 1</summary>

- 식별자 : `goodsId` 1 / `goodsCoPurchaseId` 145
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/1) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=1) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=1)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 161.19

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 145,
  "goodsId": 1,
  "goodsName": "신데렐라",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2018-12-25T00:00:00",
  "investEndDateTime": "2019-01-11T14:23:32",
  "saleYieldPercent": 161.19,
  "artistNameForKorean": "마리킴",
  "artistNameForEnglish": "Mari Kim",
  "titleForKorean": null,
  "titleForEnglish": "Cinderella",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1/20200427142838c992a43e-e76b-4fc0-b90b-8345b94195f9.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 1,
  "artwork": {
    "id": 1,
    "artist": {
      "id": 1,
      "artistName": "마리킴",
      "artistNameForEnglish": "Mari Kim",
      "artistNameForKorean": "마리킴",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Cinderella",
    "material": "Ultrachrome ink printed on white velvet",
    "size1": 73,
    "size2": 93,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2010",
    "signatureInfo": null,
    "provenance": "Seoul Auction",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/1/20200924113236bd0c4adf-42eb-4adc-8121-790d4ba9918b.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "신데렐라",
  "quantity": 268,
  "pieceAmount": 10000,
  "estimateMinAmount": 2000000,
  "estimateMaxAmount": 3000000,
  "investBeginDateTime": "2018-12-25T00:00:00",
  "investEndDateTime": "2019-01-11T14:23:32",
  "availableQuantity": 0,
  "interviewUrl": "KQYjPnGOwk8",
  "saleYieldPercent": 161.19,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1/20200427142838c992a43e-e76b-4fc0-b90b-8345b94195f9.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1/20200427142839d83b06c7-ead3-40a6-916f-5d16c19877fe.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1/202004271428391fffb125-fd19-49f7-a2f9-f514c4bf376b.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/1/202004271429209b948a66-61b2-4307-8978-08d2e3270118.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 268
}</code></pre>

</details>

<details>
<summary>138. 에바 알머슨 : Happy — 매각완료 / goodsId 12</summary>

- 식별자 : `goodsId` 12 / `goodsCoPurchaseId` 150
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/12) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=12) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=12)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 94.74

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 150,
  "goodsId": 12,
  "goodsName": "Happy",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2018-12-17T13:00:00",
  "investEndDateTime": "2019-01-01T23:17:48",
  "saleYieldPercent": 94.74,
  "artistNameForKorean": "에바 알머슨",
  "artistNameForEnglish": "Eva Armisén",
  "titleForKorean": "",
  "titleForEnglish": "Happy",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/12/20200427151638683ce9b3-5fa7-45ba-84b7-5d8c53b79b22.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 12,
  "artwork": {
    "id": 7,
    "artist": {
      "id": 5,
      "artistName": "에바 알머슨",
      "artistNameForEnglish": "Eva Armisén",
      "artistNameForKorean": "에바 알머슨",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Happy",
    "material": "Oil on canvas",
    "size1": 129,
    "size2": 81,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/7/2020100615252825656827-022a-4c81-970d-2017492bb604.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Happy",
  "quantity": 1398,
  "pieceAmount": 10000,
  "estimateMinAmount": 13000000,
  "estimateMaxAmount": 19000000,
  "investBeginDateTime": "2018-12-17T13:00:00",
  "investEndDateTime": "2019-01-01T23:17:48",
  "availableQuantity": 0,
  "interviewUrl": "E_UaB8DYTjE",
  "saleYieldPercent": 94.74,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/12/20200427151638683ce9b3-5fa7-45ba-84b7-5d8c53b79b22.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/12/202004271516382bb046bc-fbfc-4338-a9b9-55a38700fa5e.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/12/2020042715163824d44a7b-165e-454d-b3b1-c15667767272.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/12/202004271517055aae82ca-be2c-4793-b7d7-fe0833be9471.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedQuantity": 1398,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>139. 소치 허련 : 묵란도(墨蘭圖) — 모집종료 / goodsId 14</summary>

- 식별자 : `goodsId` 14 / `goodsCoPurchaseId` 152
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/14) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=14) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=14)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 152,
  "goodsId": 14,
  "goodsName": "묵란도(墨蘭圖)",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-12-10T13:00:00",
  "investEndDateTime": "2018-12-25T14:26:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "소치 허련",
  "artistNameForEnglish": "Ryun Huh",
  "titleForKorean": "묵란도(墨蘭圖)",
  "titleForEnglish": "",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/14/20200427152539ca3219f6-f96d-4b8b-84a5-d2eb86b82ac5.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 14,
  "artwork": {
    "id": 9,
    "artist": {
      "id": 7,
      "artistName": "소치 허련",
      "artistNameForEnglish": "Ryun Huh",
      "artistNameForKorean": "소치 허련",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "묵란도(墨蘭圖)",
    "material": "종이에 먹",
    "size1": 23.8,
    "size2": 44.9,
    "size3": null,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "",
    "signatureInfo": "",
    "provenance": "서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/9/202003311941442b154ad4-5dca-4bf7-86d6-8813840b7a83.jpg\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "묵란도(墨蘭圖)",
  "quantity": 501,
  "pieceAmount": 10000,
  "estimateMinAmount": 4700000,
  "estimateMaxAmount": 7000000,
  "investBeginDateTime": "2018-12-10T13:00:00",
  "investEndDateTime": "2018-12-25T14:26:34",
  "availableQuantity": 0,
  "interviewUrl": "W8iz6FSud2E",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/14/20200427152539ca3219f6-f96d-4b8b-84a5-d2eb86b82ac5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/14/2020042715254050a8cec0-9ede-490d-aede-10d1db553546.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/14/202004271525403206ca38-0e51-4609-8df9-7aa26eb7fc6c.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 501,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>140. 강세경 : Seen 201212 — 모집종료 / goodsId 18</summary>

- 식별자 : `goodsId` 18 / `goodsCoPurchaseId` 156
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/18) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=14&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=18) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=18)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 156,
  "goodsId": 18,
  "goodsName": "Seen 201212",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-12-03T13:00:00",
  "investEndDateTime": "2018-12-09T20:07:34",
  "saleYieldPercent": 0,
  "artistNameForKorean": "강세경",
  "artistNameForEnglish": "Sekyung Kang",
  "titleForKorean": "",
  "titleForEnglish": "Seen 201212",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/18/202004271600273bbb9294-da20-49dc-8876-f4f858adf253.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 18,
  "artwork": {
    "id": 12,
    "artist": {
      "id": 10,
      "artistName": "강세경",
      "artistNameForEnglish": "Sekyung Kang",
      "artistNameForKorean": "강세경",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Seen 201212",
    "material": "Oil on canvas",
    "size1": 130,
    "size2": 162,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2012",
    "signatureInfo": "",
    "provenance": "서울옥션 홍콩",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/12/2020033119384943def3b5-b0af-49d3-954a-ad7e77740504.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Seen 201212",
  "quantity": 800,
  "pieceAmount": 10000,
  "estimateMinAmount": 7600000,
  "estimateMaxAmount": 11000000,
  "investBeginDateTime": "2018-12-03T13:00:00",
  "investEndDateTime": "2018-12-09T20:07:34",
  "availableQuantity": 0,
  "interviewUrl": "dSChvY9zQnw",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/18/202004271600273bbb9294-da20-49dc-8876-f4f858adf253.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/18/20200427160045b13afd50-f888-467a-9e12-a2a4c182efde.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/18/20200427160036a3cab038-8366-4bad-876a-b73235cb3e12.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/18/20200427160045e77d2c67-c358-402c-81d5-06e9fe480633.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 800,
  "purchasedPercent": 1
}</code></pre>

</details>

<a id="page-15"></a>

### 15페이지

- [팩트] 2026-08-10 21 : 42~21 : 46 KST 기준 건수 : 5건
- [화면](https://weshareart.com/goods?type=ALL&page=15) / [페이지별 API 원문](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL)

<details>
<summary>141. 하태임 : Un Passage — 매각완료 / goodsId 17</summary>

- 식별자 : `goodsId` 17 / `goodsCoPurchaseId` 155
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/17) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=17) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=17)
- 상태·수익률 원값 : `DISTRIBUTED / DISTRIBUTED` / `saleYieldPercent` 110

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 155,
  "goodsId": 17,
  "goodsName": "Un Passage",
  "coPurchaseStatusCategory": "DISTRIBUTED",
  "coPurchaseStatus": "DISTRIBUTED",
  "investBeginDateTime": "2018-11-26T13:00:00",
  "investEndDateTime": "2018-11-26T17:31:44",
  "saleYieldPercent": 110,
  "artistNameForKorean": "하태임",
  "artistNameForEnglish": "Taeim Ha",
  "titleForKorean": null,
  "titleForEnglish": "Un Passage",
  "goodsDetail": false,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/2020111918040109e8e605-ee0a-4b1f-a3ef-c036db259e82.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 17,
  "artwork": {
    "id": 11,
    "artist": {
      "id": 9,
      "artistName": "하태임",
      "artistNameForEnglish": "Taeim Ha",
      "artistNameForKorean": "하태임",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Un Passage",
    "material": "Acrylic on canvas",
    "size1": 45.5,
    "size2": 45.5,
    "size3": 0,
    "size3Type": null,
    "setComposition": false,
    "edition": null,
    "productionYear": "2008",
    "signatureInfo": null,
    "provenance": "서울옥션",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/11/202010061522190c0fef78-ddd5-493d-81ac-df219f739895.png\r\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Un Passage",
  "quantity": 150,
  "pieceAmount": 10000,
  "estimateMinAmount": 1000000,
  "estimateMaxAmount": 1700000,
  "investBeginDateTime": "2018-11-26T13:00:00",
  "investEndDateTime": "2018-11-26T17:31:44",
  "availableQuantity": 0,
  "interviewUrl": "/v-H2YKsk1ws",
  "saleYieldPercent": 110,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/2020111918040109e8e605-ee0a-4b1f-a3ef-c036db259e82.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/20200427153653ad356469-faa1-442c-9486-0ad466b65e09.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/202004271536540d8cb6e5-e8db-44de-a44e-ab30c4884af5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/20200427153654810f08da-5e29-4dcb-a8c8-7a8a4088aad5.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/17/20200427153712383729bf-b6c6-434a-a530-d45912a1fd36.png"
    ]
  },
  "statusCategoryCode": "DISTRIBUTED",
  "status": "DISTRIBUTED",
  "purchasedPercent": 1,
  "purchasedQuantity": 150
}</code></pre>

</details>

<details>
<summary>142. 미스터 브레인워시 : Follow Your Dreams — 모집종료 / goodsId 10</summary>

- 식별자 : `goodsId` 10 / `goodsCoPurchaseId` 148
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/10) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=10) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=10)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 148,
  "goodsId": 10,
  "goodsName": "Follow Your Dreams",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-11-19T13:00:00",
  "investEndDateTime": "2018-11-23T16:37:32",
  "saleYieldPercent": 0,
  "artistNameForKorean": "미스터 브레인워시",
  "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
  "titleForKorean": "",
  "titleForEnglish": "Follow Your Dreams",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/20201119180449f6dac1eb-bdfe-44d4-bfdd-676f96d95859.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 10,
  "artwork": {
    "id": 5,
    "artist": {
      "id": 4,
      "artistName": "미스터 브레인워시",
      "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
      "artistNameForKorean": "미스터 브레인워시",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Follow Your Dreams",
    "material": "Stencil, spray paint, acrylic, and collage mixed media on paper",
    "size1": 126,
    "size2": 96,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "뒷면, 우측 하단",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/5/2020092411311487464a4b-2502-40c8-830b-e407e07f64f7.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Follow Your Dreams",
  "quantity": 1500,
  "pieceAmount": 10000,
  "estimateMinAmount": 14000000,
  "estimateMaxAmount": 21000000,
  "investBeginDateTime": "2018-11-19T13:00:00",
  "investEndDateTime": "2018-11-23T16:37:32",
  "availableQuantity": 0,
  "interviewUrl": "HOCaml3zgrA",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/20201119180449f6dac1eb-bdfe-44d4-bfdd-676f96d95859.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/20200924113952fcd24fe1-4532-4e51-a3f4-dd76ceb56848.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/20200924113956f269befd-9ee4-4f5d-9b5f-6e19ac90b1ae.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/20200924114000fac3319a-616d-4e9d-9dce-c574b48f2073.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/2020092411400587a8f5a5-78f6-438b-9ef9-b48e0120d05a.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/10/2020092411401067274ebd-9942-4570-9b3a-5d0884217f56.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1500,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>143. 고영훈 : Stone Book — 모집종료 / goodsId 16</summary>

- 식별자 : `goodsId` 16 / `goodsCoPurchaseId` 154
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/16) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=16) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=16)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 154,
  "goodsId": 16,
  "goodsName": "Stone Book",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-11-12T13:00:00",
  "investEndDateTime": "2018-11-16T15:56:09",
  "saleYieldPercent": 0,
  "artistNameForKorean": "고영훈",
  "artistNameForEnglish": "Younghoon Ko",
  "titleForKorean": "",
  "titleForEnglish": "Stone Book",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532288e7407f2-bcc0-48e4-8981-74e15f900176.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 16,
  "artwork": {
    "id": 10,
    "artist": {
      "id": 8,
      "artistName": "고영훈",
      "artistNameForEnglish": "Younghoon Ko",
      "artistNameForKorean": "고영훈",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Stone Book",
    "material": "Acrylic on cloth and paper",
    "size1": 87.2,
    "size2": 118,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "1989",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/10/2020033119411148b2b727-a180-4271-97ba-73c1c407ffdb.jpg\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Stone Book",
  "quantity": 5000,
  "pieceAmount": 10000,
  "estimateMinAmount": 47000000,
  "estimateMaxAmount": 70000000,
  "investBeginDateTime": "2018-11-12T13:00:00",
  "investEndDateTime": "2018-11-16T15:56:09",
  "availableQuantity": 0,
  "interviewUrl": "-I_PWuAuayo",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532288e7407f2-bcc0-48e4-8981-74e15f900176.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532282fc0dd47-08c8-442c-ba0c-bc1d670817ec.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532281217f452-e5c9-4967-81c0-fb03b8958404.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532289823bd19-1f8b-4fab-96a8-d03117f36585.jpeg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/16/202004271532361ccece8f-4f57-404a-b0f6-81ae60b2c954.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 5000,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>144. 미스터 브레인워시 : Love Is The Answer — 모집종료 / goodsId 9</summary>

- 식별자 : `goodsId` 9 / `goodsCoPurchaseId` 147
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/9) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=9) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=9)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 147,
  "goodsId": 9,
  "goodsName": "Love Is The Answer",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-11-05T13:00:00",
  "investEndDateTime": "2018-11-06T18:57:52",
  "saleYieldPercent": 0,
  "artistNameForKorean": "미스터 브레인워시",
  "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
  "titleForKorean": "",
  "titleForEnglish": "Love Is The Answer",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/2020111918054657acd3bc-8660-470f-8ecc-6bebf8d1656d.png",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 9,
  "artwork": {
    "id": 4,
    "artist": {
      "id": 4,
      "artistName": "미스터 브레인워시",
      "artistNameForEnglish": "Mr.Brainwash(Thierry Guetta)",
      "artistNameForKorean": "미스터 브레인워시",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Love Is The Answer",
    "material": "Works on paper, mixed media on paper with stencil, spray paint, acrylic, and collage",
    "size1": 126,
    "size2": 96,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "",
    "productionYear": "2016",
    "signatureInfo": "",
    "provenance": "",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/4/202009241131428140cd46-0198-45be-8707-00d2214d8bc2.png\n",
    "copyrightText": null,
    "zoomable": null
  },
  "type": "CO_PURCHASE",
  "name": "Love Is The Answer",
  "quantity": 1500,
  "pieceAmount": 10000,
  "estimateMinAmount": 14000000,
  "estimateMaxAmount": 21000000,
  "investBeginDateTime": "2018-11-05T13:00:00",
  "investEndDateTime": "2018-11-06T18:57:52",
  "availableQuantity": 0,
  "interviewUrl": "Y6nPbUFd7Po",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/2020111918054657acd3bc-8660-470f-8ecc-6bebf8d1656d.png",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/202004271455249a91abd2-0748-4a68-9ec4-714e0db5fcdb.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/202004271456118bbc6788-dd31-46c6-ac44-f46eb2fb5420.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/20200427145558b058ea91-9f2d-4468-8d75-c3d6e3408413.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/2020042714561246356fda-0d14-4a26-a1e4-28aba54673dc.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/9/2020042716590668e851c8-ed03-4940-822d-32a595f1f21b.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedQuantity": 1500,
  "purchasedPercent": 1
}</code></pre>

</details>

<details>
<summary>145. 파블로 피카소 : Halte de Comediens ambulants avec Hibou, from series 347 — 모집종료 / goodsId 15</summary>

- 식별자 : `goodsId` 15 / `goodsCoPurchaseId` 153
- 원문 : [상품 화면](https://weshareart.com/goodsDetail/15) / [목록 API](https://weshareart.com/api/public/goods/co-purchase/page?page=15&size=10&coPurchaseStatusCategory=ALL) / [공개 상세 API](https://weshareart.com/api/public/goods?id=15) / [장문 상세 콘텐츠 API](https://weshareart.com/api/public/goods/detail/list-by-goods-id?goodsId=15)
- 상태·수익률 원값 : `RECRUITED / BOUGHT` / `saleYieldPercent` 0

목록 API 18개 필드 원값

<pre><code class="language-json">{
  "goodsCoPurchaseId": 153,
  "goodsId": 15,
  "goodsName": "Halte de Comediens ambulants avec Hibou, from series 347",
  "coPurchaseStatusCategory": "RECRUITED",
  "coPurchaseStatus": "BOUGHT",
  "investBeginDateTime": "2018-11-01T13:00:00",
  "investEndDateTime": "2018-11-01T13:48:47",
  "saleYieldPercent": 0,
  "artistNameForKorean": "파블로 피카소",
  "artistNameForEnglish": "Pablo Picasso",
  "titleForKorean": "",
  "titleForEnglish": "Halte de Comediens ambulants avec Hibou, from series 347",
  "goodsDetail": true,
  "representativeGoodsImageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/goods/15/202004271527403d91bc29-100e-4168-906d-f929395467b8.jpg",
  "showKakaopayList": false,
  "opened": false,
  "dday": "",
  "dDay": ""
}</code></pre>

공개 상세 API 원값 — 작가 프로필 개인정보 제거본

<pre><code class="language-json">{
  "id": 15,
  "artwork": {
    "id": 2,
    "artist": {
      "id": 2,
      "artistName": "파블로 피카소",
      "artistNameForEnglish": "Pablo Picasso",
      "artistNameForKorean": "파블로 피카소",
      "_redactedFields": [
        "activityHistory",
        "awardsHistory",
        "displayHistory",
        "imageUrl",
        "information",
        "levelOfEducation",
        "nationality",
        "yearOfBirth",
        "yearOfDeath"
      ]
    },
    "title": "Halte de Comediens ambulants avec Hibou, from series 347",
    "material": "Etching and drypoint",
    "size1": 49,
    "size2": 46,
    "size3": 0,
    "size3Type": "",
    "setComposition": false,
    "edition": "ed.30/50",
    "productionYear": "1968",
    "signatureInfo": "",
    "provenance": "오페라갤러리",
    "imageUrl": "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/2/202003311943197e6689b0-d361-41d9-81f1-3c8e63de8ca1.jpg\n",
    "copyrightText": "",
    "zoomable": false
  },
  "type": "CO_PURCHASE",
  "name": "Halte de Comediens ambulants avec Hibou, from series 347",
  "quantity": 2810,
  "pieceAmount": 10000,
  "estimateMinAmount": 26000000,
  "estimateMaxAmount": 39000000,
  "investBeginDateTime": "2018-11-01T13:00:00",
  "investEndDateTime": "2018-11-01T13:48:47",
  "availableQuantity": 0,
  "interviewUrl": "C6b5d_ZONFc",
  "saleYieldPercent": 0,
  "keepingDays": null,
  "imageList": {
    "list": [
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/15/202004271527403d91bc29-100e-4168-906d-f929395467b8.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/15/20200427152806f8fd6bc0-e916-44b8-84c1-8d0e449a13ff.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/15/20200522104913ca5db376-fe84-4a5a-9b89-659385e13e33.jpg",
      "https://dzb2k3770zezk.cloudfront.net/file/img/goods/15/20200427152806eea89396-37bd-4f52-80a0-05963ab407e1.png"
    ]
  },
  "statusCategoryCode": "RECRUITED",
  "status": "BOUGHT",
  "purchasedPercent": 1,
  "purchasedQuantity": 2810
}</code></pre>

</details>
