import { NextResponse } from 'next/server';
import { getAllEvidenceMeta } from '@/utils';

export async function GET() {
  try {
    const evidence = await getAllEvidenceMeta();
    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}