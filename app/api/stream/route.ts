import { NextResponse } from "next/server"

// Proxy o HTTP Shoutcast como HTTPS para evitar mixed content
const SOURCE = "http://sonicpanel.oficialserver.com:8342/;"

export async function GET() {
  try {
    const res = await fetch(SOURCE, {
      cache: "no-store",
      headers: {
        "User-Agent": "RadioHabblive-Player/1.0",
        "icy-metadata": "1",
        accept: "*/*",
      },
    })

    if (!res.ok || !res.body) {
      return new NextResponse("Stream unavailable", { status: 502 })
    }

    return new NextResponse(res.body as any, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (e) {
    console.error("Stream proxy error:", e)
    return new NextResponse("Error proxying stream", { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
