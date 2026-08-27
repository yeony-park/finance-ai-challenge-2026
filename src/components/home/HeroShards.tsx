import Image from "next/image";
import Link from "next/link";

import {
  CATEGORY_REGISTRY,
  categoryDisplayLabel,
} from "@/lib/content/categories";

import s from "./HeroShards.module.css";

export function HeroShards() {
  return (
    <div className={s.cluster} role="group" aria-label="카테고리 바로가기">
      {CATEGORY_REGISTRY.map((entry, index) => {
        return (
          <Link
            key={entry.id}
            href={entry.href}
            className={s.shard}
          >
            <span className={s.shardPhoto} aria-hidden="true">
              <Image
                src={`/category-${entry.id}.jpg`}
                alt=""
                fill
                priority
                sizes="(max-width: 1088px) 45vw, 180px"
                className={s.shardPhotoImg}
              />
            </span>
            <span className={s.shardIn}>
              <span className={s.shardIndex}>0{index + 1}</span>
              <b className={s.shardLabel}>{categoryDisplayLabel(entry)}</b>
              <span className={s.shardArrow} aria-hidden="true">↗</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
