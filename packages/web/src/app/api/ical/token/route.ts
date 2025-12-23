import { NextRequest } from "next/server";

const API_URL = process.env.API_URL;
if (!API_URL) {
  throw new Error("API_URL is not set");
}

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("Cookie");

  const url = new URL("/api/ical/token", API_URL);
  const response = await fetch(url.toString(), {
    headers: {
      ...(cookie && { Cookie: cookie }),
    },
  });

  if (!response.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await response.json();
  return Response.json(data);
}
