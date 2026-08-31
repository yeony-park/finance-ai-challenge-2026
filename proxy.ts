import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ARTIST_PAGE_PREFIX = "/artists/";
const ARTIST_API_PREFIX = "/api/artists/";

function hasMalformedPercentEncoding(pathname: string) {
  try {
    decodeURIComponent(pathname);
    return false;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isArtistPage = pathname.startsWith(ARTIST_PAGE_PREFIX);
  const isArtistApi = pathname.startsWith(ARTIST_API_PREFIX);

  if (!isArtistPage && !isArtistApi) return NextResponse.next();
  if (!hasMalformedPercentEncoding(pathname)) return NextResponse.next();

  if (isArtistApi) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return new NextResponse("Bad Request", {
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/artists/:path*", "/api/artists/:path*"],
};
