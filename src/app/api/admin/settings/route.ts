import { NextResponse } from 'next/server'

// No external service settings configured — placeholder for future use
export async function GET() {
  return NextResponse.json({ settings: {} })
}

export async function POST() {
  return NextResponse.json({ ok: true })
}
