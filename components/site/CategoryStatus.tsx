import Image from "next/image";
import Link from "next/link";
import { StatusScreen } from "./StatusScreen";
import s from "./category-status.module.css";

export function CategoryStatus({title, image}: {title: string; image: string}) {
 return <main className={s.page}><div className={s.image}><Image src={image} alt="" fill priority sizes="(max-width: 760px) 100vw, 40vw"/></div><StatusScreen code="CATEGORY · PREPARING" title={`${title} 확인 현황을 준비하고 있습니다.`}><p className={s.body}>현재 공개할 수 있는 검증 대상과 대조 범위를 정리 중입니다. 확인되지 않은 상품 정보나 수치를 대신 표시하지 않습니다.</p><p className={s.detail}>공개 범위가 확정되면 대상 문서, 대조 출처, 확인 시점을 함께 표시합니다.</p><div className={s.actions}><Link href="/products" className={s.primary}>현재 검증 리포트 보기</Link><Link href="/methodology" className={s.ghost}>검증 방법 보기</Link></div></StatusScreen></main>;
}
