import { NextRequest, NextResponse } from 'next/server';
import { getSurveyById, generateReportData } from '@/services/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json') as 'json' | 'csv';

    const survey = await getSurveyById(id);
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const data = generateReportData(survey, format);
    if (format === 'csv') {
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="survey_${id}_report.csv"`,
        },
      });
    }

    return NextResponse.json(JSON.parse(data));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Report generation failed' }, { status: 500 });
  }
}
