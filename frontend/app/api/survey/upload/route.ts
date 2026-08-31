import { NextRequest, NextResponse } from 'next/server';
import { uploadSurvey } from '@/services/api';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    if (!file) {
      return NextResponse.json({ error: 'No acoustic file provided' }, { status: 400 });
    }

    const res = await uploadSurvey(file, metadata);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}
