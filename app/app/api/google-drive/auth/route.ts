import { NextRequest, NextResponse } from 'next/server';
import GoogleDriveService from '@/lib/google-drive';

// You'll need to set these environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';

const driveService = new GoogleDriveService({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

export async function GET(request: NextRequest) {
  try {
    const authUrl = driveService.getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
} 