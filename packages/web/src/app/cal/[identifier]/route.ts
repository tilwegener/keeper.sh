import { NextRequest } from "next/server";

const API_URL = process.env.API_URL;
if (!API_URL) {
  throw new Error("API_URL is not set");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const { identifier } = await params;

  const url = new URL(`/cal/${identifier}`, API_URL);
  const response = await fetch(url);

  if (!response.ok) {
    return new Response("Not found", { status: 404 });
  }

  const body = await response.text();
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
