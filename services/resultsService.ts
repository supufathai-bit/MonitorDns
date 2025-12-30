// Service to fetch results from Workers API
export interface WorkersResult {
  hostname: string;
  isp_name: string;
  status: string;
  ip?: string;
  device_id?: string;
  timestamp: number;
  latency?: number;
}

export interface WorkersResultsResponse {
  success: boolean;
  results: WorkersResult[];
  count: number;
}

// Fetch results from Workers API
export const fetchResultsFromWorkers = async (
  workersUrl?: string
): Promise<WorkersResultsResponse> => {
  try {
    const baseUrl = workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || '';
    
    if (!baseUrl) {
      throw new Error('Workers URL not configured');
    }

    const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/results`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data as WorkersResultsResponse;

  } catch (error) {
    console.error('Error fetching results from Workers:', error);
    return {
      success: false,
      results: [],
      count: 0,
    };
  }
};

// Fetch results for a specific domain
export const fetchDomainResults = async (
  hostname: string,
  workersUrl?: string
): Promise<WorkersResult[]> => {
  try {
    const baseUrl = workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || '';
    
    if (!baseUrl) {
      throw new Error('Workers URL not configured');
    }

    const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/results?hostname=${encodeURIComponent(hostname)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.results) {
      return data.results as WorkersResult[];
    }
    
    return [];

  } catch (error) {
    console.error(`Error fetching results for ${hostname}:`, error);
    return [];
  }
};

