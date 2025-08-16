import { NextResponse } from "next/server"

const BASE = "http://sonicpanel.oficialserver.com:8342"

// Tenta alguns endpoints compatíveis com Shoutcast/Icecast e retorna o primeiro JSON válido
async function fetchShoutcastJson() {
  const urls = [
    `${BASE}/stats?sid=1&json=1`,
    `${BASE}/stats?json=1`,
    `${BASE}/statistics?json=1`,
    `${BASE}/status-json.xsl`, // fallback para Icecast
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "RadioHabblive-Player/1.0" }, cache: "no-store" })
      if (res.ok) {
        const ct = res.headers.get("content-type") || ""
        if (ct.includes("json")) return { data: await res.json(), url }
        const text = await res.text()
        try { return { data: JSON.parse(text), url } } catch {}
      }
    } catch {}
  }
  throw new Error("No Shoutcast JSON endpoint responded")
}

function pick<T = any>(obj: any, keys: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of Object.keys(obj)) {
    if (keys.some(kk => kk.toLowerCase() === k.toLowerCase())) return obj[k] as T
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = pick<T>(v, keys)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function toInt(value: any, fallback = 0) {
  const n = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET() {
  try {
    const { data } = await fetchShoutcastJson()

    let stream: any =
      (Array.isArray((data as any)?.streams) && (data as any).streams.find((s: any) => s?.sid === 1)) ||
      (Array.isArray((data as any)?.streams) && (data as any).streams[0]) ||
      pick<any>(data, ["stream"]) ||
      data

    const songTitle =
      pick<string>(stream, ["songtitle", "title", "currentsong"]) ??
      pick<string>(data, ["songtitle", "title", "currentsong"]) ??
      "Tocando as Melhores"

    const unique =
      toInt(pick<number>(stream, ["uniquelisteners", "unique_listeners", "uniques"])) ||
      toInt(pick<number>(data, ["uniquelisteners", "unique_listeners", "uniques"]))

    const current =
      toInt(pick<number>(stream, ["currentlisteners", "listeners"])) ||
      toInt(pick<number>(data, ["currentlisteners", "listeners"]))

    const serverOrDj =
      pick<string>(stream, ["servertitle", "streamtitle", "dj", "djname"]) ??
      pick<string>(data, ["servertitle", "streamtitle", "dj", "djname"]) ?? ""

    let locutor = "Radio Habblive"
    if (typeof serverOrDj === "string" && serverOrDj.trim().length > 0) {
      locutor = serverOrDj.replace(/SonicPanel|AutoDJ|SHOUTcast/gi, "").replace(/[\-–|]+/g, " ").trim() || "Radio Habblive"
    }

    const unicos = unique > 0 ? unique : current

    return NextResponse.json(
      { locutor, programa: songTitle, unicos },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching Shoutcast status:", error)
    return NextResponse.json(
      { locutor: "Radio Habblive", programa: "Tocando as Melhores", unicos: 0 },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
