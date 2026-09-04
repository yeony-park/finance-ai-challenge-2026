import { LazyLivestockDiseaseMap } from "@/components/livestock-disease/LazyLivestockDiseaseMap";
import { PIG_ASF_CURRENT_YEAR } from "@/lib/content/pig-asf";

export function PigAsfMap({
  focusProvince,
  kakaoAppKey,
}: {
  readonly focusProvince: string;
  readonly kakaoAppKey: string;
}) {
  return (
    <LazyLivestockDiseaseMap
      species="pig"
      focusProvinces={[focusProvince]}
      currentYear={PIG_ASF_CURRENT_YEAR}
      ariaLabel="국내 양돈농장 ASF 및 구제역 발생 분포 지도"
      kakaoAppKey={kakaoAppKey}
    />
  );
}
