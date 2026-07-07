import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Backed by Openverse (openverse.org): openly-licensed images only, no
// scraping of arbitrary sites, and mature/sensitive content is excluded by
// default (we never pass mature=true, and filter defensively below too).
const OPENVERSE_URL = "https://api.openverse.org/v1/images/";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const url = new URL(OPENVERSE_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("page_size", "16");

  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "Saathi-chat-app" } });
  } catch {
    return NextResponse.json({ error: "Image search is unavailable right now" }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Image search failed" }, { status: 502 });
  }

  const data = await res.json();
  type OpenverseResult = {
    id: string;
    url: string;
    thumbnail: string;
    title?: string;
    mature?: boolean;
    creator?: string;
    license?: string;
  };
  const results = ((data.results ?? []) as OpenverseResult[])
    .filter((r) => !r.mature)
    .map((r) => ({
      id: r.id,
      url: r.url,
      thumbnail: r.thumbnail,
      title: r.title ?? "image",
      creator: r.creator,
      license: r.license,
    }));

  return NextResponse.json({ results });
}
