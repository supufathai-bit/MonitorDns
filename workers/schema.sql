-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  hostname TEXT UNIQUE NOT NULL,
  url TEXT,
  is_monitoring INTEGER DEFAULT 1,
  telegram_chat_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Results table (latest results per domain+ISP+device)
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  isp_name TEXT NOT NULL,
  status TEXT NOT NULL,
  ip TEXT,
  latency INTEGER,
  device_id TEXT,
  device_info TEXT,  -- JSON string
  timestamp INTEGER NOT NULL,
  source TEXT DEFAULT 'mobile-app',
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostname, isp_name, device_id)
);

-- Device info table (for tracking mobile app devices)
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  device_info TEXT NOT NULL,  -- JSON string
  last_sync INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_hostname ON results(hostname);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_results_device ON results(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_sync ON devices(last_sync DESC);

