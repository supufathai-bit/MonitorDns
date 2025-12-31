'use client';

import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Save, Server, Clock, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<AppSettings>({
    ...settings,
    workersUrl: settings.workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const setDailyInterval = () => {
    setFormData(prev => ({
        ...prev,
        checkInterval: 360 // 6 hours (4 scans per day)
    }));
  };

  const set6HourInterval = () => {
    setFormData(prev => ({
        ...prev,
        checkInterval: 360 // 6 hours (4 scans per day)
    }));
  };

  const testConnection = async () => {
    const urlToTest = formData.workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || formData.backendUrl;
    if (!urlToTest) {
      setConnectionStatus({ success: false, message: 'Please enter Workers URL or Backend URL' });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Test Workers API connection
      const testUrl = urlToTest.replace(/\/$/, '');
      
      // Test 1: Get domains endpoint
      const domainsResponse = await fetch(`${testUrl}/api/mobile-sync/domains`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (domainsResponse.ok) {
        const data = await domainsResponse.json();
        setConnectionStatus({ 
          success: true, 
          message: `✅ Connected! Found ${data.domains?.length || 0} domains` 
        });
      } else {
        const errorText = await domainsResponse.text();
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {}
        
        setConnectionStatus({ 
          success: false, 
          message: `❌ Connection failed: ${domainsResponse.status} ${errorData?.error || domainsResponse.statusText}` 
        });
      }
    } catch (error: any) {
      setConnectionStatus({ 
        success: false, 
        message: `❌ Connection error: ${error.message}` 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-neon-blue flex items-center">
        <span className="mr-2">⚙️</span> Configuration
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Telegram Bot Token</label>
          <input
            type="text"
            name="telegramBotToken"
            value={formData.telegramBotToken}
            onChange={handleChange}
            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">From @BotFather</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Telegram Chat ID</label>
          <input
            type="text"
            name="telegramChatId"
            value={formData.telegramChatId}
            onChange={handleChange}
            placeholder="-100xxxxxxxx"
            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Where alerts will be sent</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
            <Server className="w-4 h-4 mr-2" />
            Workers API URL (สำหรับ Mobile App Sync)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="workersUrl"
              value={formData.workersUrl || ''}
              onChange={handleChange}
              placeholder="https://sentinel-dns-api.snowwhite04-01x.workers.dev"
              className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 rounded flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </button>
          </div>
          {connectionStatus && (
            <div className={`mt-2 p-2 rounded text-xs flex items-center ${
              connectionStatus.success 
                ? 'bg-green-900/20 text-green-400 border border-green-700/50' 
                : 'bg-red-900/20 text-red-400 border border-red-700/50'
            }`}>
              {connectionStatus.success ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {connectionStatus.message}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ <strong>สำคัญ:</strong> ต้องตั้งค่า Workers URL เพื่อให้ Mobile App sync ผลลัพธ์มา
            <br />
            📖 Default: <code className="bg-gray-800 px-1 rounded">https://sentinel-dns-api.snowwhite04-01x.workers.dev</code>
            {process.env.NEXT_PUBLIC_WORKERS_URL && (
              <>
                <br />
                🌐 Environment: <code className="bg-gray-800 px-1 rounded">{process.env.NEXT_PUBLIC_WORKERS_URL}</code>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Check Interval (Min)</span>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={set6HourInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours
                        </button>
                        <button 
                            type="button" 
                            onClick={setDailyInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours (4x/day)
                        </button>
                    </div>
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        name="checkInterval"
                        value={formData.checkInterval}
                        onChange={handleChange}
                        min="1"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {formData.checkInterval} mins = {(formData.checkInterval / 60).toFixed(1)} hours
                </p>
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                <Server className="w-4 h-4 mr-2" />
                DNS Resolver Service URL (สำหรับเช็คแบบแม่นยำ)
            </label>
            <input
                type="text"
                name="backendUrl"
                value={formData.backendUrl}
                onChange={handleChange}
                placeholder="https://your-vps-ip:3001 (VPS ในไทย/สิงคโปร์)"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
                ⚠️ <strong>สำคัญ:</strong> การเช็คจาก external IP (Railway) ไม่แม่นยำ
                <br />
                ✅ <strong>แนะนำ:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                <br />
                📖 ดูคู่มือ: <code className="bg-gray-800 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
            </p>
            </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded text-sm text-yellow-200 flex items-start">
            <Server className="w-5 h-5 mr-2 flex-shrink-0" />
            <div className="space-y-1">
                <p><strong>⚠️ ความแม่นยำของการเช็ค DNS</strong></p>
                <p className="text-xs text-yellow-300/70">
                    <strong>การเช็คจาก External IP (Railway):</strong> ไม่แม่นยำ - ISP DNS servers มักไม่ตอบกลับ external queries
                    <br />
                    <strong>วิธีแก้ไข:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                    <br />
                    📖 ดูคู่มือ: <code className="bg-yellow-900/50 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
                </p>
            </div>
        </div>

        {/* Device Info Section */}
        <div className="bg-gray-900/50 border border-gray-700 rounded p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center">
            <Server className="w-4 h-4 mr-2 text-neon-blue" />
            Current Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Workers URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Backend URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.backendUrl || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Check Interval:</span>
              <span className="text-neon-blue font-mono">
                {formData.checkInterval} mins ({formData.checkInterval > 0 ? `${(formData.checkInterval / 60).toFixed(1)} hours` : 'Paused'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Telegram:</span>
              <span className={formData.telegramBotToken && formData.telegramChatId ? 'text-green-400' : 'text-red-400'}>
                {formData.telegramBotToken && formData.telegramChatId ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testingConnection}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 font-medium py-2 px-4 rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingConnection ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </button>
          <button
            type="submit"
            className="flex-1 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 font-bold py-2 px-4 rounded flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
            <Server className="w-4 h-4 mr-2" />
            Workers API URL (สำหรับ Mobile App Sync)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="workersUrl"
              value={formData.workersUrl || ''}
              onChange={handleChange}
              placeholder="https://sentinel-dns-api.snowwhite04-01x.workers.dev"
              className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 rounded flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </button>
          </div>
          {connectionStatus && (
            <div className={`mt-2 p-2 rounded text-xs flex items-center ${
              connectionStatus.success 
                ? 'bg-green-900/20 text-green-400 border border-green-700/50' 
                : 'bg-red-900/20 text-red-400 border border-red-700/50'
            }`}>
              {connectionStatus.success ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {connectionStatus.message}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ <strong>สำคัญ:</strong> ต้องตั้งค่า Workers URL เพื่อให้ Mobile App sync ผลลัพธ์มา
            <br />
            📖 Default: <code className="bg-gray-800 px-1 rounded">https://sentinel-dns-api.snowwhite04-01x.workers.dev</code>
            {process.env.NEXT_PUBLIC_WORKERS_URL && (
              <>
                <br />
                🌐 Environment: <code className="bg-gray-800 px-1 rounded">{process.env.NEXT_PUBLIC_WORKERS_URL}</code>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Check Interval (Min)</span>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={set6HourInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours
                        </button>
                        <button 
                            type="button" 
                            onClick={setDailyInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours (4x/day)
                        </button>
                    </div>
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        name="checkInterval"
                        value={formData.checkInterval}
                        onChange={handleChange}
                        min="1"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {formData.checkInterval} mins = {(formData.checkInterval / 60).toFixed(1)} hours
                </p>
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                <Server className="w-4 h-4 mr-2" />
                DNS Resolver Service URL (สำหรับเช็คแบบแม่นยำ)
            </label>
            <input
                type="text"
                name="backendUrl"
                value={formData.backendUrl}
                onChange={handleChange}
                placeholder="https://your-vps-ip:3001 (VPS ในไทย/สิงคโปร์)"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
                ⚠️ <strong>สำคัญ:</strong> การเช็คจาก external IP (Railway) ไม่แม่นยำ
                <br />
                ✅ <strong>แนะนำ:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                <br />
                📖 ดูคู่มือ: <code className="bg-gray-800 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
            </p>
            </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded text-sm text-yellow-200 flex items-start">
            <Server className="w-5 h-5 mr-2 flex-shrink-0" />
            <div className="space-y-1">
                <p><strong>⚠️ ความแม่นยำของการเช็ค DNS</strong></p>
                <p className="text-xs text-yellow-300/70">
                    <strong>การเช็คจาก External IP (Railway):</strong> ไม่แม่นยำ - ISP DNS servers มักไม่ตอบกลับ external queries
                    <br />
                    <strong>วิธีแก้ไข:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                    <br />
                    📖 ดูคู่มือ: <code className="bg-yellow-900/50 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
                </p>
            </div>
        </div>

        {/* Device Info Section */}
        <div className="bg-gray-900/50 border border-gray-700 rounded p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center">
            <Server className="w-4 h-4 mr-2 text-neon-blue" />
            Current Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Workers URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Backend URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.backendUrl || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Check Interval:</span>
              <span className="text-neon-blue font-mono">
                {formData.checkInterval} mins ({formData.checkInterval > 0 ? `${(formData.checkInterval / 60).toFixed(1)} hours` : 'Paused'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Telegram:</span>
              <span className={formData.telegramBotToken && formData.telegramChatId ? 'text-green-400' : 'text-red-400'}>
                {formData.telegramBotToken && formData.telegramChatId ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testingConnection}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 font-medium py-2 px-4 rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingConnection ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </button>
          <button
            type="submit"
            className="flex-1 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 font-bold py-2 px-4 rounded flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
            <Server className="w-4 h-4 mr-2" />
            Workers API URL (สำหรับ Mobile App Sync)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="workersUrl"
              value={formData.workersUrl || ''}
              onChange={handleChange}
              placeholder="https://sentinel-dns-api.snowwhite04-01x.workers.dev"
              className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 rounded flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </button>
          </div>
          {connectionStatus && (
            <div className={`mt-2 p-2 rounded text-xs flex items-center ${
              connectionStatus.success 
                ? 'bg-green-900/20 text-green-400 border border-green-700/50' 
                : 'bg-red-900/20 text-red-400 border border-red-700/50'
            }`}>
              {connectionStatus.success ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {connectionStatus.message}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ <strong>สำคัญ:</strong> ต้องตั้งค่า Workers URL เพื่อให้ Mobile App sync ผลลัพธ์มา
            <br />
            📖 Default: <code className="bg-gray-800 px-1 rounded">https://sentinel-dns-api.snowwhite04-01x.workers.dev</code>
            {process.env.NEXT_PUBLIC_WORKERS_URL && (
              <>
                <br />
                🌐 Environment: <code className="bg-gray-800 px-1 rounded">{process.env.NEXT_PUBLIC_WORKERS_URL}</code>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Check Interval (Min)</span>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={set6HourInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours
                        </button>
                        <button 
                            type="button" 
                            onClick={setDailyInterval}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            6 Hours (4x/day)
                        </button>
                    </div>
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        name="checkInterval"
                        value={formData.checkInterval}
                        onChange={handleChange}
                        min="1"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {formData.checkInterval} mins = {(formData.checkInterval / 60).toFixed(1)} hours
                </p>
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center">
                <Server className="w-4 h-4 mr-2" />
                DNS Resolver Service URL (สำหรับเช็คแบบแม่นยำ)
            </label>
            <input
                type="text"
                name="backendUrl"
                value={formData.backendUrl}
                onChange={handleChange}
                placeholder="https://your-vps-ip:3001 (VPS ในไทย/สิงคโปร์)"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
                ⚠️ <strong>สำคัญ:</strong> การเช็คจาก external IP (Railway) ไม่แม่นยำ
                <br />
                ✅ <strong>แนะนำ:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                <br />
                📖 ดูคู่มือ: <code className="bg-gray-800 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
            </p>
            </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded text-sm text-yellow-200 flex items-start">
            <Server className="w-5 h-5 mr-2 flex-shrink-0" />
            <div className="space-y-1">
                <p><strong>⚠️ ความแม่นยำของการเช็ค DNS</strong></p>
                <p className="text-xs text-yellow-300/70">
                    <strong>การเช็คจาก External IP (Railway):</strong> ไม่แม่นยำ - ISP DNS servers มักไม่ตอบกลับ external queries
                    <br />
                    <strong>วิธีแก้ไข:</strong> ใช้ DNS Resolver Service บน VPS ในไทย/สิงคโปร์
                    <br />
                    📖 ดูคู่มือ: <code className="bg-yellow-900/50 px-1 rounded">VPS_DNS_RESOLVER_SETUP.md</code>
                </p>
            </div>
        </div>

        {/* Device Info Section */}
        <div className="bg-gray-900/50 border border-gray-700 rounded p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center">
            <Server className="w-4 h-4 mr-2 text-neon-blue" />
            Current Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Workers URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.workersUrl || process.env.NEXT_PUBLIC_WORKERS_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Backend URL:</span>
              <span className="text-gray-300 font-mono text-[10px]">
                {formData.backendUrl || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Check Interval:</span>
              <span className="text-neon-blue font-mono">
                {formData.checkInterval} mins ({formData.checkInterval > 0 ? `${(formData.checkInterval / 60).toFixed(1)} hours` : 'Paused'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Telegram:</span>
              <span className={formData.telegramBotToken && formData.telegramChatId ? 'text-green-400' : 'text-red-400'}>
                {formData.telegramBotToken && formData.telegramChatId ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testingConnection}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 font-medium py-2 px-4 rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingConnection ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </button>
          <button
            type="submit"
            className="flex-1 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 font-bold py-2 px-4 rounded flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};