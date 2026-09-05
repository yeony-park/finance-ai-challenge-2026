# About 팀원 캐릭터

내장 image_gen으로 만든 가상 3D 캐릭터다. 실제 팀원의 외모를 재현한 초상은 아니다.
첨부 레퍼런스는 조형 스타일만 참고했으며 인물과 이미지는 새로 제작했다.

- 현재 파일: `public/team/characters-cutout-v3.png` (1536 × 1024, 투명 PNG). v2의 배경을 내장 image_gen으로 제거했다. v1·v2는 초기 제작·머리 수정 원본이다.
- 배열: 4열 × 2행. 왼쪽부터 박연정·박현석·최원준·신문수.
- 박연정은 어깨까지 내려오는 머리, 최원준은 쉼표머리와 조금 더 샤프한 인상, 신문수는 이마를 덮는 앞머리로 수정했다. 소개·GitHub도 같은 순서를 따른다.
- 첫 행: 기본 자세. 둘째 행: 인사·윙크·블록 소개·브이 포즈.
- CSS 배경 위치로 상태를 전환해 추가 이미지 요청 없이 hover·키보드 포커스·선택에 반응한다.
- 카드·흰 이름 영역·테두리를 제거했다. 하나의 노란 배경에 네 캐릭터를 같은 크기와 발 기준선으로 배치한다. 모바일에서도 네 사람이 한 장면에 함께 보인다.
- ABOUT은 공통 `--ds-heading-h1`을 사용한다. hover 시 버튼 자체는 이동하지 않으며, 스프라이트의 자세별 발 위치 차이를 보정해 제자리에서 포즈만 바뀐다. 첫 행 끝에 섞인 다음 행의 픽셀도 표시하지 않는다.
- 팀원 선택은 버튼으로 조작하고, 아래 소개와 GitHub 프로필을 갱신한다. 이름은 hover·키보드 포커스·선택 시 캐릭터 아래에 표시한다.
- 선택하면 소개가 보이도록 스크롤한다. 키보드 포커스에서도 포즈가 바뀌며, 동작 줄이기 설정에서는 부드러운 스크롤을 생략한다.
- 최원준의 담당은 사용자 확인에 따라 ‘한우 · 인프라’로 표시한다.
- GitHub 주소는 저장소 contributors 응답과 커밋 이력으로 확인했다. 최원준의 커밋명은 viowlet이지만 현재 GitHub 계정은 cwj0666이다.
- 소개는 저장소 기여 내용을 바탕으로 작성한 초안이며 `src/app/about/TeamShowcase.tsx`에서 수정한다.

## 배경 제거 프롬프트 (v3, 내장 image_gen)

Use case: background-extraction. Edit the provided 1536x1024 4-column x 2-row sprite atlas: REMOVE ONLY THE YELLOW BACKGROUND and make it genuinely TRANSPARENT with an alpha channel. Keep all eight full-body characters exactly in their original locations, scale, framing, and poses. Preserve all faces, hairstyles, glasses, clothing, skin, notebook, architectural blocks, laptop, hands and shoes. Do not recolor yellow objects such as the woman's notebook. Preserve edge anti-aliasing. Remove yellow between fingers and limbs. No new shadows, backgrounds, checkerboard pixels, border, or text. Actual transparent PNG. Do not rearrange the 4x2 cells. This is for overlapping individual character cutouts on a common stage on a website.

## 수정 프롬프트 (v2, 내장 image_gen)

Edit target: supplied 1536x1024 4-column by 2-row character sprite atlas. Make ONLY the specified hair/face edits in BOTH rows, preserve everything else and exact sprite alignment, image dimensions, yellow background, 3D toy material, camera, lighting, clothing, accessories, poses, body size, feet placement, margins.
Column1 (woman, yeony-park): lengthen her black bob to collarbone-length hair, clearly extending past the shoulders. Smooth slightly inward-curved ends. Keep her face and clothing identical, preserve waving hand pose on bottom row.
Column2 (man with glasses and lilac sweatshirt, hyonsho): completely UNCHANGED in both rows. Preserve him exactly.
Column3 (man in blue shirt holding architectural blocks, cwj0666): give him a distinct stylish Korean COMMA HAIRSTYLE, side-parted with a curved comma-shaped front lock sweeping down over one side of the forehead and curling inward, other side neat with some forehead visible. Make his facial shape subtly slimmer and sharper, slightly more defined tapered jaw and subtly sharper eyebrows, still friendly and matching existing cute stylized 3D adult toy aesthetic. Preserve his blue outfit and blocks and standing/presenting poses.
Column4 (man in teal jacket with laptop, MunSu2001): give him clear full black bangs/fringe falling across his forehead toward eyebrows, soft rounded straight fringe with a few separated strands, no swept-up or open-forehead style. Preserve face, clothing, laptop and standing/peace-sign poses.
Do not swap character positions. Four columns remain 1 woman, 2 glasses man unchanged, 3 sharper comma-hair man, 4 full-bangs man. Maintain exact eight-cell 4x2 atlas layout and 3:2 image ratio, all full bodies visible. No text or new objects.

## 최초 생성 프롬프트 (v1)

Use case: stylized-concept. Asset type: a production website character sprite atlas, one single asset containing four original fictional team avatars in two states. Reference images are style references only, not edit targets. Render high-quality playful 3D clay/vinyl human characters, like collectible designer toys: oversized round heads, rounded limbs, soft studio light, tasteful clothing folds, lively yet minimal faces. Three men and one woman, all adult Korean-inspired fictional avatars, not portraits of real people.
CRITICAL LAYOUT: a perfectly regular 4-column by 2-row sprite sheet, landscape 1536x1024 or larger with EXACT 3:2 aspect. Each of the eight cells is the same size. Every full-body character fits inside its own cell with generous empty margins; centered horizontally and feet at 90% cell height; no overlap between cells. Same camera and same scale across all eight cells. Entire backdrop flat solid warm yellow HEX #FFE14D, absolutely uniform to edges, no gradient, no floor lines, no panels, no text, no dividers, no cast shadows beyond character vicinity.
COLUMNS left to right:
1. Female, black shoulder-length bob, ivory long sleeve top, cobalt blue wide-leg trousers, white sneakers, small yellow sketchbook. Friendly focused expression standing casually.
2. Male, black wavy hair, round dark glasses, soft lilac sweatshirt, dark navy trousers, ivory sneakers, holding small closed notebook.
3. Male, short black hair with a small swoop, cobalt blue overshirt over ivory tee, light gray trousers, blue-white sneakers, small stack of toy architectural blocks.
4. Male, short black hair, teal casual jacket over cream tee, dark trousers, ivory sneakers, silver laptop tucked under one arm.
TOP ROW is relaxed default standing poses. BOTTOM ROW is EXACT SAME corresponding characters, hair, clothing, sizes, identity and camera, with expressive hover poses: column1 smiling broadly and waving high; column2 winking with confident thumbs-up; column3 grinning and presenting an architectural block in one hand; column4 smiling excitedly with one hand raised in peace sign. FULL BODY in every cell, hands must stay in own cell, no cropping. Polished rounded 3D sculpted style, not photorealistic, not flat vector. No labels, letters, logos, watermark or extra objects.
