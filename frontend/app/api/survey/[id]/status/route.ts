import { NextRequest, NextResponse } from 'next/server';
import { getSurveyStatus } from '@/services/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await getSurveyStatus(id);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Status lookup failed' }, { status: 500 });
  }
}
