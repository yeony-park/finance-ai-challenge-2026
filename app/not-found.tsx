import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found shell">
      <p>404</p>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <span>자산 워크스페이스가 이동했거나 아직 준비되지 않았습니다.</span>
      <Link className="primary-button" href="/">Overview로 돌아가기</Link>
    </main>
  );
}
