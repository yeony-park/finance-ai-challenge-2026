import Image from "next/image";
import Link from "next/link";

import {
  CATEGORY_REGISTRY,
  categoryDisplayLabel,
  type CategoryId,
} from "@/lib/content/categories";
import { SHARD_STATUS_LIVE, SHARD_STATUS_PREVIEW } from "@/lib/content/home";

import s from "./home.module.css";

interface ShardLayout {
  readonly x: string;
  readonly y: string;
  readonly w: string;
  readonly compact: boolean;
}

const SHARD_LAYOUT: Readonly<Record<CategoryId, ShardLayout>> = {
  cattle: { x: "22.2%", y: "3.8%", w: "31.5%", compact: false },
  pig: { x: "61.1%", y: "23.1%", w: "25.9%", compact: true },
  art: { x: "11.1%", y: "46.2%", w: "25.9%", compact: true },
  "real-estate": { x: "46.3%", y: "63.5%", w: "28.7%", compact: false },
};

const shardVars = (
  layout: ShardLayout,
  index: number,
): React.CSSProperties =>
  ({
    "--sx": layout.x,
    "--sy": layout.y,
    "--sw": layout.w,
    "--si": index,
  }) as React.CSSProperties;

export function HeroShards() {
  return (
    <div className={s.cluster} role="group" aria-label="카테고리 바로가기">
      <span
        className={`${s.shard} ${s.shardDeco}`}
        style={shardVars({ x: "7.4%", y: "17.3%", w: "3.9%", compact: true }, 5)}
        aria-hidden="true"
      />
      <span
        className={`${s.shard} ${s.shardGhost}`}
        style={shardVars({ x: "86%", y: "9.5%", w: "8.1%", compact: true }, 6)}
        aria-hidden="true"
      />
      {CATEGORY_REGISTRY.map((entry, index) => {
        const layout = SHARD_LAYOUT[entry.id];
        const isPreview = entry.preview !== null;
        const classNames = [
          s.shard,
          layout.compact ? s.shardCompact : "",
          isPreview ? s.shardPreview : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Link
            key={entry.id}
            href={entry.href}
            className={classNames}
            style={shardVars(layout, index)}
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
              <b className={s.shardLabel}>{categoryDisplayLabel(entry)}</b>
              <span className={s.shardStatus}>
                {isPreview ? SHARD_STATUS_PREVIEW : SHARD_STATUS_LIVE}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
