import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-page">
      <div>
        <span>404</span>
        <h1>문서를 찾을 수 없습니다.</h1>
        <p>주소가 바뀌었거나 아직 공개되지 않은 문서일 수 있습니다.</p>
        <Link href="/"><ArrowLeft aria-hidden="true" /> 문서 홈으로</Link>
      </div>
    </main>
  );
}
