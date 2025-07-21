import { NextRequest, NextResponse } from 'next/server';
import GoogleDriveService from '@/lib/google-drive';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';

const driveService = new GoogleDriveService({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

export async function POST(request: NextRequest) {
  try {
    console.log("Load API route called")
    const body = await request.json();
    const { accessToken, refreshToken } = body;

    console.log("Received load request with access token:", !!accessToken)

    if (!accessToken) {
      console.log("Missing access token")
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Set the user's tokens
    driveService.setTokens(accessToken, refreshToken);

    // Initialize the service
    const initialized = await driveService.initialize();
    if (!initialized) {
      return NextResponse.json(
        { error: 'Failed to initialize Google Drive service' },
        { status: 500 }
      );
    }

    // Load stories from Google Drive
    console.log("Calling driveService.loadStories()")
    const stories = await driveService.loadStories();
    console.log("Stories loaded from Drive:", stories.length)

    return NextResponse.json({ 
      success: true, 
      stories,
      count: stories.length
    });
  } catch (error) {
    console.error('Failed to load stories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 