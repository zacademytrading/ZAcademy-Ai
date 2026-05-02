import { NextResponse } from 'next/server';
import { getErrorLogs, clearLogs } from '@/lib/error-service';

export async function GET() {
  const logs = getErrorLogs();
  return NextResponse.json(logs);
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ success: true });
}
