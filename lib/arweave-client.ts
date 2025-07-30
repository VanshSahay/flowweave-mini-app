const API_BASE_URL = 'https://api-flowweave.vesala.xyz/api';

export interface TelegramFile {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedBy: string;
  createdAt: string;
  arweaveId?: string;
  arweaveUrl?: string;
  arweaveUploadStatus: 'pending' | 'success';
}

export interface CostEstimate {
  winc: string;
  ar: string;
  sufficient: boolean;
}

export interface FileCostResponse {
  success: boolean;
  file_id: string;
  file_name: string;
  file_size: number;
  cost_estimate: CostEstimate;
}

export interface ArweaveUploadResponse {
  success: boolean;
  message: string;
  file_id: string;
  arweave_id: string;
  arweave_url: string;
  arweave_owner: string;
  data_caches: string[];
  fast_finality_indexes: string[];
}

export interface RecentFilesResponse {
  success: boolean;
  files: TelegramFile[];
  count: number;
  timestamp: string;
}

export interface SendMessageRequest {
  chatId: string;
  message: string;
}

let lastCheckedTimestamp: string | null = null;

async function initialize(): Promise<void> {
  try {
    // Initialize the telegram bot
    await fetch(`${API_BASE_URL}/telegram/initialize`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Start the bot
    await fetch(`${API_BASE_URL}/telegram/start`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    throw error;
  }
}

async function checkForNewFiles(): Promise<TelegramFile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/telegram/files/recent`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const data = await response.json() as RecentFilesResponse;

    if (!data.success) {
      throw new Error('Failed to fetch recent files');
    }

    // Update the last checked timestamp
    const newFiles = lastCheckedTimestamp
      ? data.files.filter(file => 
          new Date(file.createdAt) > new Date(lastCheckedTimestamp!)
          && file.arweaveUploadStatus === 'pending'
          && !file.arweaveUrl // Only process files that haven't been uploaded yet
        )
      : data.files.filter(file => 
          file.arweaveUploadStatus === 'pending'
          && !file.arweaveUrl
        );

    lastCheckedTimestamp = data.timestamp;
    return newFiles;
  } catch (error) {
    console.error('Failed to check for new files:', error);
    throw error;
  }
}

async function getUploadCost(fileId: string): Promise<FileCostResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/telegram/ardrive/files/${fileId}/cost`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    const data = await response.json() as FileCostResponse;

    if (!data.success) {
      throw new Error('Failed to get upload cost');
    }

    return data;
  } catch (error) {
    console.error('Failed to get upload cost:', error);
    throw error;
  }
}

async function uploadToArweave(fileId: string): Promise<ArweaveUploadResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/telegram/ardrive/files/${fileId}/upload`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    const data = await response.json() as ArweaveUploadResponse;

    if (!data.success) {
      throw new Error('Failed to upload to Arweave');
    }

    return data;
  } catch (error) {
    console.error('Failed to upload to Arweave:', error);
    throw error;
  }
}

async function processNewFile(file: TelegramFile): Promise<string> {
  try {
    // 1. Get upload cost
          await getUploadCost(file.id); // Check cost but don't store response

    // 2. Upload to Arweave
    const uploadResponse = await uploadToArweave(file.id);

    // Return the Arweave URL
    if (!uploadResponse.arweave_url) {
      throw new Error('Arweave URL not received in response');
    }

    return uploadResponse.arweave_url;
  } catch (error) {
    console.error(`Failed to process file ${file.id}:`, error);
    throw error;
  }
}

let isPolling = false;
let onArweaveUrlReceived: ((url: string) => void) | null = null;

async function startPolling(intervalMs: number = 5000): Promise<() => void> {
  if (isPolling) {
    return () => {}; // Already polling, return no-op cleanup
  }

  try {
    // Initialize the bot first
    await initialize();
    
    isPolling = true;

    // Start polling loop
    const pollInterval = setInterval(async () => {
      try {
        const newFiles = await checkForNewFiles();
        
        // Process each new file
        for (const file of newFiles) {
          try {
            const arweaveUrl = await processNewFile(file);
            // Notify the UI when we get an Arweave URL
            if (onArweaveUrlReceived) {
              onArweaveUrlReceived(arweaveUrl);
            }
          } catch (error) {
            console.error(`Failed to process file ${file.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error in polling loop:', error);
        // Continue polling even if there's an error
      }
    }, intervalMs);

    // Add cleanup function
    return () => {
      isPolling = false;
      clearInterval(pollInterval);
    };
  } catch (error) {
    isPolling = false;
    console.error('Failed to start polling:', error);
    throw error;
  }
}

export async function startUploadProcess(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Set up the callback to receive the Arweave URL
      onArweaveUrlReceived = (url: string) => {
        resolve(url);
        onArweaveUrlReceived = null; // Clear the callback
        // Stop polling after receiving the URL
        isPolling = false;
      };

      // Start polling
      startPolling().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}