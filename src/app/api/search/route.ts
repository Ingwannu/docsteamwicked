import { NextResponse } from "next/server";
import { searchDocs } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.slice(0, 200) || "";
  return NextResponse.json({ results: searchDocs(query) });
}
