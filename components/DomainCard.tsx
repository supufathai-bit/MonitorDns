'use client';

import React, { useState } from 'react';
import { Domain, ISP, Status, ISPResult } from '../types';
import { generateDigCommand } from '../services/dnsService';
import { RefreshCw, Trash2, Globe, ShieldAlert, CheckCircle, Terminal, ChevronRight, Settings, Save, X } from 'lucide-react';

interface DomainCardProps {
  domain: Domain;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Domain>) => void;
}

export const DomainCard: React.FC<DomainCardProps> = ({ domain, onDelete, onRefresh, onUpdate }) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customChatId, setCustomChatId] = useState(domain.telegramChatId || '');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh(domain.id);
    setIsRefreshing(false);
  };

  const saveSettings = () => {
    onUpdate(domain.id, { telegramChatId: customChatId.trim() || undefined });
    setShowSettings(false);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.ACTIVE: return 'text-neon-green';
      case Status.BLOCKED: return 'text-neon-red';
      case Status.ERROR: return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const renderISPBadge = (result: ISPResult) => {
    const isBlocked = result.status === Status.BLOCKED;
    const isPending = result.status === Status.PENDING;
    const isError = result.status === Status.ERROR;

    let borderColor = 'border-gray-700';
    if (isBlocked) borderColor = 'border-neon-red/50 bg-neon-red/10';
    else if (!isPending && !isError) borderColor = 'border-neon-green/30 bg-neon-green/5';

    return (
      <div key={result.isp} className={`flex flex-col items-center justify-center p-3 rounded-lg border ${borderColor} transition-all duration-300`}>
        <span className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">{result.isp}</span>
        
        {isPending ? (
           <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
        ) : (
           <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            {isBlocked ? (
                <ShieldAlert className="w-8 h-8 text-neon-red mb-1 drop-shadow-[0_0_8px_rgba(255,0,85,0.5)]" />
            ) : isError ? (
                <div className="w-8 h-8 rounded-full border-2 border-yellow-500 flex items-center justify-center mb-1 text-yellow-500 font-bold">!</div>
            ) : (
                <CheckCircle className="w-8 h-8 text-neon-green mb-1 drop-shadow-[0_0_8px_rgba(0,255,157,0.3)]" />
            )}
            
            <span className={`text-[10px] font-bold ${getStatusColor(result.status)}`}>
                {result.status}
            </span>
            
            {result.ip && (
                <span className="text-[9px] font-mono text-gray-500 mt-1 bg-black/30 px-1 rounded truncate max-w-full">
                    {result.ip}
                </span>
            )}
            
            {result.details && result.details.includes('HTTP accessible') && (
                <span className="text-[8px] text-yellow-400 mt-1 italic text-center px-1">
                    ⚠️ May not reflect actual ISP blocking
                </span>
            )}
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 hover:border-neon-blue/30 transition-all duration-300 group relative overflow-hidden">
      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-20 bg-gray-900/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="w-full max-w-md space-y-4">
                <h4 className="text-white font-bold flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-neon-blue" />
                    Notification Settings
                </h4>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Custom Telegram Chat ID (Optional)</label>
                    <input 
                        type="text" 
                        value={customChatId}
                        onChange={(e) => setCustomChatId(e.target.value)}
                        placeholder="e.g. -100123456789"
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm focus:border-neon-blue focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty to use global default.</p>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button 
                        onClick={() => setShowSettings(false)}
                        className="px-3 py-1.5 rounded text-xs font-bold text-gray-400 hover:text-white border border-transparent hover:border-gray-600"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveSettings}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30 flex items-center"
                    >
                        <Save className="w-3 h-3 mr-1" /> Save
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600">
                <Globe className="w-5 h-5 text-neon-blue" />
            </div>
            <div>
                <div className="flex items-center">
                    <h3 className="text-lg font-bold text-white tracking-wide mr-2">{domain.hostname}</h3>
                    {domain.telegramChatId && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/50 border border-blue-800 text-[9px] text-blue-300 font-mono">
                            Custom Alert
                        </span>
                    )}
                </div>
                <a 
                    href={domain.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-gray-500 hover:text-neon-blue transition-colors flex items-center"
                >
                    {domain.url} <ChevronRight className="w-3 h-3 ml-0.5" />
                </a>
            </div>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 text-gray-400 hover:text-white transition-all border border-transparent hover:border-gray-500"
                title="Settings"
            >
                <Settings className="w-4 h-4" />
            </button>
            <button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className={`p-2 rounded-lg bg-gray-700/50 hover:bg-neon-blue/20 hover:text-neon-blue transition-all border border-transparent hover:border-neon-blue/30 ${isRefreshing ? 'animate-spin text-neon-blue' : 'text-gray-400'}`}
                title="Scan Now"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
            <button 
                onClick={() => onDelete(domain.id)}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-neon-red/20 hover:text-neon-red transition-all border border-transparent hover:border-neon-red/30 text-gray-400"
                title="Remove Domain"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Grid Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
        {Object.values(domain.results).map(renderISPBadge)}
      </div>

      {/* Technical Details / Dig Command Helper */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <details className="group/details">
            <summary className="list-none text-[10px] text-gray-500 cursor-pointer hover:text-neon-blue flex items-center transition-colors select-none">
                <Terminal className="w-3 h-3 mr-1.5" />
                <span>Show Debug Commands (DIG)</span>
                <ChevronRight className="w-3 h-3 ml-auto transition-transform group-open/details:rotate-90" />
            </summary>
            <div className="mt-3 bg-black/80 rounded-lg p-3 border border-gray-800 font-mono text-[10px] text-green-400 overflow-x-auto shadow-inner">
                <div className="flex items-center text-gray-500 mb-2 border-b border-gray-800 pb-1">
                    <span className="mr-2">user@sentinel:~$</span>
                    <span className="text-gray-600 italic"># Run these on a VPS to verify blocks</span>
                </div>
                {Object.keys(domain.results).map((ispKey) => (
                    <div key={ispKey} className="py-0.5 whitespace-nowrap hover:bg-white/5 px-1 rounded cursor-text">
                        <span className="text-neon-blue/70 mr-2">$</span>
                        {generateDigCommand(domain.hostname, ispKey as ISP)}
                    </div>
                ))}
            </div>
        </details>
      </div>
    </div>
  );
};