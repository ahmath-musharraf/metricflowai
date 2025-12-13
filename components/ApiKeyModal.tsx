import React, { useState } from 'react';
import { Key, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';
import { validateApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [key, setKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (key.trim()) {
      setIsValidating(true);
      setError(null);
      
      const isValid = await validateApiKey(key.trim());
      
      setIsValidating(false);
      
      if (isValid) {
        onSave(key.trim());
        onClose();
      } else {
        setError("This API Key is invalid or expired. Please check and try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-white/10 rotate-12">
                <Key size={120} />
            </div>
            <div className="relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Key size={20} />
                    Setup API Key
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                    To use MetricFlowAI, you need a free Google Gemini API key.
                </p>
            </div>
        </div>

        <div className="p-6 space-y-6">
            <div className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                    This application is powered by Google's Gemini models. It requires an API Key to function. 
                    Don't worry, it's <span className="font-bold text-white">free</span> for personal use!
                </p>

                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/50 rounded-xl transition-all group"
                >
                    <span className="text-sm font-medium text-brand-400 group-hover:text-brand-300">Get Free Gemini API Key</span>
                    <ExternalLink size={16} className="text-slate-500 group-hover:text-brand-400" />
                </a>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paste your API Key here</label>
                    <input 
                        type="password"
                        value={key}
                        onChange={(e) => {
                            setKey(e.target.value);
                            setError(null);
                        }}
                        disabled={isValidating}
                        placeholder="AIzaSy..."
                        className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all font-mono text-sm ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-800 focus:ring-brand-500/50 focus:border-brand-500'}`}
                    />
                </div>
                
                {error && (
                    <div className="flex items-start gap-2 text-xs text-red-200 bg-red-900/20 p-3 rounded-lg border border-red-500/30 animate-in slide-in-from-top-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}

                {!error && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-slate-400" />
                        <span>Your key is stored locally in your browser and never sent to our servers.</span>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onClose}
                    disabled={isValidating}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors border border-slate-700 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!key.trim() || isValidating}
                    className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isValidating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            <span>Save API Key</span>
                        </>
                    )}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ApiKeyModal;
