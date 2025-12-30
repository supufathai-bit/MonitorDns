'use client';

import React from 'react';
import { AppSettings } from '../types';
import { Save, Server, Clock, RefreshCw } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<AppSettings>(settings);

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

        <button
          type="submit"
          className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 font-bold py-2 px-4 rounded flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </button>
      </form>
    </div>
  );
};