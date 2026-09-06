import Link from "next/link";

import s from "./catalog-pagination.module.css";

type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

const paginationItems = (page: number, pageCount: number): PaginationItem[] => {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  if (page <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", pageCount];
  if (page >= pageCount - 3) {
    return [
      1,
      "start-ellipsis",
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ];
  }
  return [
    1,
    "start-ellipsis",
    page - 1,
    page,
    page + 1,
    "end-ellipsis",
    pageCount,
  ];
};

export function CatalogPagination({
  hrefForPage,
  page,
  pageCount,
  label,
}: {
  readonly hrefForPage: (page: number) => string;
  readonly page: number;
  readonly pageCount: number;
  readonly label: string;
}) {
  return (
    <nav className={s.pageNumberNav} aria-label={label}>
      {page > 1 ? (
        <Link
          className={s.pageNumberButton}
          href={hrefForPage(page - 1)}
          aria-label="이전 페이지"
        >
          &lt;
        </Link>
      ) : (
        <span className={s.pageNumberButtonDisabled} aria-hidden="true">
          &lt;
        </span>
      )}
      {paginationItems(page, pageCount).map((item) =>
        typeof item === "number" ? (
          item === page ? (
            <span
              className={`${s.pageNumberButton} ${s.pageNumberButtonCurrent}`}
              aria-current="page"
              aria-label={`${item}페이지, 현재 페이지`}
              key={item}
            >
              {item}
            </span>
          ) : (
            <Link
              className={s.pageNumberButton}
              href={hrefForPage(item)}
              aria-label={`${item}페이지`}
              key={item}
            >
              {item}
            </Link>
          )
        ) : (
          <span className={s.pageNumberEllipsis} aria-hidden="true" key={item}>
            …
          </span>
        ),
      )}
      {page < pageCount ? (
        <Link
          className={s.pageNumberButton}
          href={hrefForPage(page + 1)}
          aria-label="다음 페이지"
        >
          &gt;
        </Link>
      ) : (
        <span className={s.pageNumberButtonDisabled} aria-hidden="true">
          &gt;
        </span>
      )}
    </nav>
  );
}
