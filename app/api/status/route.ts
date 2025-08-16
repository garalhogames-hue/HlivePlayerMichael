import { NextResponse } from "next/server"

const BASE = "http://sonicpanel.oficialserver.com:8342"

// Tenta endpoints compatíveis e retorna o primeiro válido
async function fetchShoutcastJson() {
  const jsonUrls = [
    `${BASE}/stats?sid=1&json=1`,
    `${BASE}/stats?json=1`,
    `${BASE}/statistics?json=1`,
    `${BASE}/status-json.xsl`,
  ]
  for (const url of jsonUrls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "RadioHabblive-Player/1.0" }, cache: "no-store" })
      if (res.ok) {
        const ct = res.headers.get("content-type") || ""
        if (ct.includes("json")) {
          const data = await res.json()
          return { data, url, format: "json" as const }
        }
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          return { data, url, format: "json-text" as const }
        } catch {}
      }
    } catch {}
  }

  // Shoutcast v1 fallback: /7.html
  for (const url of [`${BASE}/7.html?sid=1`, `${BASE}/7.html`]) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "RadioHabblive-Player/1.0" }, cache: "no-store" })
      if (res.ok) {
        const text = await res.text()
        const parsed = parseShoutcast7Html(text)
        return { data: parsed, url, format: "7html" as const }
      }
    } catch {}
  }
  throw new Error("No Shoutcast status endpoint responded")
}

function parseShoutcast7Html(text: string) {
  // Formato comum: "OK2,<current>,<peak>,<max>,<reported>,<bitrate>,<songtitle>"
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const m = cleaned.match(/OK[0-9]*\s*,\s*([0-9]+)\s*,[^,]*,[^,]*,[^,]*,[^,]*,\s*(.+)$/i)
  if (m) {
    const listeners = parseInt(m[1], 10)
    const song = m[2]?.trim()
    return { listeners: Number.isFinite(listeners) ? listeners : 0, song }
  }
  const num = cleaned.match(/\b([0-9]{1,5})\b/)
  const listeners = num ? parseInt(num[1], 10) : 0
  return { listeners, song: undefined }
}

function pick<T = any>(obj: any, keys: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of Object.keys(obj)) {
    if (keys.some((kk) => kk.toLowerCase() === k.toLowerCase())) return obj[k] as T
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
    const { data } = (await fetchShoutcastJson()) as any

    let stream: any =
      (Array.isArray((data as any)?.streams) && (data as any).streams.find((s: any) => s?.sid === 1)) ||
      (Array.isArray((data as any)?.streams) && (data as any).streams[0]) ||
      pick<any>(data, ["stream"]) ||
      data

    const songTitle =
      pick<string>(stream, ["songtitle", "title", "currentsong"]) ??
      pick<string>(data, ["songtitle", "title", "currentsong"]) ??
      ((data as any)?.song as string | undefined) ??
      "Tocando as Melhores"

    const unique =
      toInt(pick<number>(stream, ["uniquelisteners", "unique_listeners", "uniques"])) ||
      toInt(pick<number>(data, ["uniquelisteners", "unique_listeners", "uniques"]))

    const current =
      toInt(pick<number>(stream, ["currentlisteners", "listeners"])) ||
      toInt(pick<number>(data, ["currentlisteners", "listeners"]))

    const serverOrDj =
      pick<string>(stream, ["servertitle", "streamtitle", "dj", "djname"]) ??
      pick<string>(data, ["servertitle", "streamtitle", "dj", "djname"]) ??
      ""

    let locutor = "Radio Habblive"
    if (typeof serverOrDj === "string" && serverOrDj.trim().length > 0) {
      locutor = serverOrDj.replace(/SonicPanel|AutoDJ|SHOUTcast/gi, "").replace(/[\-–|]+/g, " ").trim() || "Radio Habblive"
    }

    let unicos = unique > 0 ? unique : current
    if ((!unicos || unicos === 0) && typeof (data as any)?.listeners === "number") {
      unicos = (data as any).listeners
    }

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
