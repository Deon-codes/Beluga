import { NextRequest, NextResponse } from 'next/server';
import { triggerAnalysis } from '@/services/api';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await triggerAnalysis(id);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Analysis trigger failed' }, { status: 500 });
  }
}
