import { NextRequest, NextResponse } from 'next/server';
import GoogleDriveService, { StoryData } from '@/lib/google-drive';

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
    console.log("Save API route called")
    const body = await request.json();
    const { title, content, markings, accessToken, refreshToken, folderName } = body;

    console.log("Received data:", {
      title,
      contentLength: content?.length,
      markingsLength: markings?.length,
      hasAccessToken: !!accessToken,
      folderName
    });

    if (!title || !content || !markings || !accessToken) {
      console.log("Missing required fields")
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Prepare story data
    const storyData: StoryData = {
      title,
      content,
      markings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Google Drive (with optional folder)
    const targetFolderName = body.folderName || 'Story Status Editor';
    const fileId = await driveService.saveStoryToFolder(storyData, targetFolderName);

    if (fileId) {
      return NextResponse.json({ 
        success: true, 
        fileId,
        message: 'Story saved successfully to Google Drive'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to save story to Google Drive' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to save story:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 