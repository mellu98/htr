import { NextResponse } from 'next/server';
import { listManagerArtists } from '@/lib/db/wave-up-queries';

export async function GET() {
  const cards = await listManagerArtists();
  return NextResponse.json({ cards });
}
