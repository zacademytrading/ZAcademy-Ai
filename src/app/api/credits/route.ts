// src/app/api/credits/route.ts
// API endpoint untuk mengambil info kredit user

import { NextRequest, NextResponse } from 'next/server';
import { getUserCredits } from '@/lib/credits';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const credits = await getUserCredits(userId);
    if (!credits) {
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    return NextResponse.json(credits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
