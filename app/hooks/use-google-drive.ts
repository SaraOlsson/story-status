import { useState, useCallback } from 'react';

interface StoryData {
  title: string;
  content: string;
  markings: number[];
  createdAt: string;
  updatedAt: string;
}

interface GoogleDriveTokens {
  accessToken: string;
  refreshToken?: string;
}

export function useGoogleDrive() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<GoogleDriveTokens | null>(null);

  // Initialize authentication
  const authenticate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-drive/auth');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsLoading(false);
    }
  }, []);

  // Handle OAuth callback
  const handleAuthCallback = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/google-drive/callback?code=${code}`);
      
      if (response.ok) {
        setIsAuthenticated(true);
        // Store tokens in localStorage for persistence
        const tokens = await response.json();
        if (tokens.accessToken) {
          setTokens(tokens);
          localStorage.setItem('googleDriveTokens', JSON.stringify(tokens));
        }
      } else {
        throw new Error('Authentication callback failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication callback failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stored tokens on mount
  const loadStoredTokens = useCallback(() => {
    const stored = localStorage.getItem('googleDriveTokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored);
        setTokens(tokens);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('googleDriveTokens');
      }
    }
  }, []);

  // Save story to Google Drive
  const saveStory = useCallback(async (storyData: StoryData, folderName?: string): Promise<boolean> => {
    if (!tokens?.accessToken) {
      setError('Not authenticated with Google Drive');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-drive/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...storyData,
          folderName,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return true;
      } else {
        throw new Error(data.error || 'Failed to save story');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  // Search for existing stories anywhere in Drive
  const searchExistingStories = useCallback(async (): Promise<StoryData[]> => {
    if (!tokens?.accessToken) {
      setError('Not authenticated with Google Drive');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google-drive/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.stories || [];
      } else {
        throw new Error(data.error || 'Failed to search stories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search stories');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  // Load stories from Google Drive
  const loadStories = useCallback(async (): Promise<StoryData[]> => {
    console.log("loadStories called")
    if (!tokens?.accessToken) {
      console.log("No access token available")
      setError('Not authenticated with Google Drive');
      return [];
    }

    console.log("Setting loading state")
    setIsLoading(true);
    setError(null);

    try {
      console.log("Making API call to /api/google-drive/load")
      const response = await fetch('/api/google-drive/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      });

      console.log("API response status:", response.status)
      const data = await response.json();
      console.log("API response data:", data)

      if (data.success) {
        console.log("Successfully loaded stories:", data.stories?.length || 0)
        return data.stories || [];
      } else {
        console.log("API returned error:", data.error)
        throw new Error(data.error || 'Failed to load stories');
      }
    } catch (err) {
      console.log("Exception in loadStories:", err)
      setError(err instanceof Error ? err.message : 'Failed to load stories');
      return [];
    } finally {
      console.log("Setting loading to false")
      setIsLoading(false);
    }
  }, [tokens]);

  // Sign out
  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setTokens(null);
    setError(null);
    localStorage.removeItem('googleDriveTokens');
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    authenticate,
    handleAuthCallback,
    loadStoredTokens,
    saveStory,
    loadStories,
    searchExistingStories,
    signOut,
  };
} 