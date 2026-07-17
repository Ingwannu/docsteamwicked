import { redirect } from "next/navigation";
import { getLandingDoc } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const doc = getLandingDoc();
  redirect(doc ? `/doc/${encodeURIComponent(doc.slug)}` : "/admin");
}
