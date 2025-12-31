export enum ISP {
  GLOBAL = 'Global (Google)',
  AIS = 'AIS',
  TRUE = 'True/DTAC',  // True and DTAC use the same network (True Corporation)
  DTAC = 'True/DTAC',  // Map DTAC to True/DTAC (same network)
  NT = 'NT',
}

export enum Status {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR',
}

export interface ISPResult {
  isp: ISP;
  status: Status;
  ip?: string;
  latency?: number;
  details?: string;
  manualOverride?: boolean; // True if user manually set this status
  source?: 'server' | 'mobile-app' | 'vps'; // Source of the check
  deviceId?: string; // Device ID if from mobile app
  timestamp?: number; // When the check was performed
}

export interface Domain {
  id: string;
  url: string;
  hostname: string;
  lastCheck: number | null;
  results: Record<ISP, ISPResult>;
  isMonitoring: boolean;
  telegramChatId?: string; // Optional: Override global chat ID
}

export interface AppSettings {
  telegramBotToken: string;
  telegramChatId: string;
  checkInterval: number; // in minutes
  backendUrl: string;
  workersUrl?: string; // Workers API URL for mobile app sync
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'alert';
}
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'alert';
}
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'alert';
}