# Google Drive Integration Setup

This guide will help you set up Google Drive integration for the Story Status Editor.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Set the following:
   - **Name**: Story Status Editor
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/google-drive/callback` (for development)
     - `https://yourdomain.com/api/google-drive/callback` (for production)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/google-drive/callback
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   ```

## Step 4: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the editor at `http://localhost:3001/editor`

3. Click "Connect Drive" to authenticate with Google

4. After authentication, you can:
   - Save stories to Google Drive (they'll be stored in a "Story Status Editor" folder)
   - Load existing stories from Google Drive
   - Disconnect from Google Drive

## How It Works

- **Authentication**: Uses OAuth 2.0 to securely access the user's Google Drive
- **Storage**: Creates a dedicated folder called "Story Status Editor" in the user's Drive
- **File Format**: Stories are saved as JSON files with the following structure:
  ```json
  {
    "title": "Story Title",
    "content": "The story text...",
    "markings": [0, 1, 1, 2, 0, ...],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:45:00Z"
  }
  ```
- **Security**: Only accesses files in the app's dedicated folder, respecting user privacy

## Troubleshooting

### "Invalid redirect URI" error
- Make sure the redirect URI in your Google Cloud Console matches exactly what's in your `.env.local`
- For development: `http://localhost:3001/api/google-drive/callback`

### "Access denied" error
- Check that the Google Drive API is enabled in your Google Cloud Console
- Verify your Client ID and Client Secret are correct

### Stories not loading/saving
- Check the browser console for error messages
- Verify your environment variables are loaded correctly
- Make sure you're authenticated (try disconnecting and reconnecting)

## Production Deployment

For production deployment:

1. Update the redirect URIs in Google Cloud Console to use your production domain
2. Update the environment variables:
   ```env
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google-drive/callback
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
3. Deploy your application
4. Test the Google Drive integration on your production domain 