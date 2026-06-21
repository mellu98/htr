import { NextResponse } from 'next/server';
import { listManagerArtists } from '@/lib/db/wave-up-queries';

// Never prerender this route — it always queries the live database.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cards = await listManagerArtists();
  return NextResponse.json({ cards });
}
