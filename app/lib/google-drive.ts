import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Google Drive API configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DEFAULT_FOLDER_NAME = 'Story Status Editor';

export interface StoryData {
  title: string;
  content: string;
  markings: number[];
  createdAt: string;
  updatedAt: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleDriveService {
  private oauth2Client: OAuth2Client | null = null;
  private drive: any = null;
  private folderId: string | null = null;

  constructor(private config: GoogleDriveConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  // Initialize the service and get or create the app folder
  async initialize(): Promise<boolean> {
    try {
      if (!this.oauth2Client) return false;
      
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Find or create the app folder
      this.folderId = await this.findOrCreateFolder();
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      return false;
    }
  }

  // Get authorization URL for OAuth flow
  getAuthUrl(): string {
    if (!this.oauth2Client) throw new Error('OAuth client not initialized');
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  // Handle OAuth callback and get tokens
  async handleAuthCallback(code: string): Promise<boolean> {
    try {
      if (!this.oauth2Client) return false;
      
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      return await this.initialize();
    } catch (error) {
      console.error('Failed to handle auth callback:', error);
      return false;
    }
  }

  // Set tokens (for when user is already authenticated)
  setTokens(accessToken: string, refreshToken?: string): void {
    if (!this.oauth2Client) return;
    
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  // Get tokens (for passing back to client)
  getTokens(): { accessToken: string; refreshToken?: string } | null {
    if (!this.oauth2Client) return null;
    
    const credentials = this.oauth2Client.credentials;
    return {
      accessToken: credentials.access_token || '',
      refreshToken: credentials.refresh_token || undefined
    };
  }

  // Find or create the app folder in user's Drive
  private async findOrCreateFolder(): Promise<string> {
    if (!this.drive) throw new Error('Drive not initialized');

    // Search for existing folder
    const response = await this.drive.files.list({
      q: `name='${DEFAULT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: DEFAULT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await this.drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  }

  // Load all stories from Google Drive
  async loadStories(): Promise<StoryData[]> {
    try {
      if (!this.drive || !this.folderId) return [];

      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and mimeType='application/json' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc'
      });

      const stories: StoryData[] = [];

      for (const file of response.data.files || []) {
        try {
          const fileResponse = await this.drive.files.get({
            fileId: file.id,
            alt: 'media'
          });

          let fileContent = fileResponse.data;
          // Convert Buffer to string if needed
          if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileContent)) {
            fileContent = fileContent.toString('utf-8');
          } else if (typeof fileContent !== 'string') {
            fileContent = JSON.stringify(fileContent);
          }

          if (!fileContent || fileContent.length === 0) {
            throw new Error('File is empty or invalid');
          }

          const storyData = JSON.parse(fileContent);
          stories.push(storyData);
        } catch (error) {
          // Ignore invalid or empty files
        }
      }

      return stories;
    } catch (error) {
      return [];
    }
  }

  // Search for existing stories in the app folder only
  async searchExistingStories(): Promise<StoryData[]> {
    try {
      if (!this.drive || !this.folderId) return [];

      // Only search within the app's dedicated folder
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and mimeType='application/json' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc'
      });

      const stories: StoryData[] = [];

      for (const file of response.data.files || []) { 
        try {
          console.log(`Loading file: ${file.name} (ID: ${file.id})`);
          const fileResponse = await this.drive.files.get({
            fileId: file.id,
            alt: 'media'
          });

          console.log(`File response data type:`, typeof fileResponse.data);
          console.log(`File response data length:`, fileResponse.data?.length || 0);
          console.log(`File response data preview:`, fileResponse.data?.substring(0, 100));

          const storyData = JSON.parse(fileResponse.data);
          
          // Check if this looks like our story format
          if (storyData.content && Array.isArray(storyData.markings)) {
            console.log(`Valid story found: ${storyData.title}`);
            stories.push(storyData);
          } else {
            console.log(`File ${file.name} doesn't match story format`);
          }
        } catch (error) {
          console.error(`Failed to load story ${file.name}:`, error);
          console.error(`Error details:`, error instanceof Error ? error.message : String(error));
        }
      }

      return stories;
    } catch (error) {
      console.error('Failed to search for existing stories:', error);
      return [];
    }
  }

  // Save story to a specific folder (or create one)
  async saveStoryToFolder(storyData: StoryData, folderName?: string): Promise<string | null> {
    try {
      console.log("saveStoryToFolder called with:", { title: storyData.title, folderName });
      
      if (!this.drive) {
        console.log("Drive not initialized");
        return null;
      }

      let targetFolderId = this.folderId;
      console.log("Initial folder ID:", targetFolderId);

      // If a specific folder is requested, find or create it
      if (folderName && folderName !== DEFAULT_FOLDER_NAME) {
        console.log("Finding/creating folder:", folderName);
        targetFolderId = await this.findOrCreateFolderByName(folderName);
      }

      if (!targetFolderId) {
        console.log("No target folder ID found");
        return null;
      }

      const fileName = `${storyData.title}.json`;
      const fileContent = JSON.stringify(storyData, null, 2);
      
      console.log("File name:", fileName);
      console.log("File content length:", fileContent.length);
      console.log("Target folder ID:", targetFolderId);

      // Check if file already exists
      const existingFiles = await this.drive.files.list({
        q: `name='${fileName}' and '${targetFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      console.log("Existing files found:", existingFiles.data.files?.length || 0);

      let fileId: string;

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // Update existing file
        fileId = existingFiles.data.files[0].id;
        console.log("Updating existing file with ID:", fileId);
        await this.drive.files.update({
          fileId,
          requestBody: {
            name: fileName,
            parents: [targetFolderId]
          },
          media: {
            mimeType: 'application/json',
            body: fileContent
          }
        });
      } else {
        // Create new file
        console.log("Creating new file");
        const file = await this.drive.files.create({
          requestBody: {
            name: fileName,
            parents: [targetFolderId]
          },
          media: {
            mimeType: 'application/json',
            body: fileContent
          },
          fields: 'id'
        });
        fileId = file.data.id;
        console.log("New file created with ID:", fileId);
      }

      console.log("Save operation completed successfully");
      return fileId;
    } catch (error) {
      console.error('Failed to save story:', error);
      return null;
    }
  }

  // Find or create a folder by name
  private async findOrCreateFolderByName(folderName: string): Promise<string> {
    if (!this.drive) throw new Error('Drive not initialized');

    // Search for existing folder
    const response = await this.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await this.drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  }
}

export default GoogleDriveService; 