import React, { useState, useEffect } from 'react';
import { Dataset } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ApiKeyModal from './components/ApiKeyModal';
import { Key } from 'lucide-react';

// Placeholder Logo - Replace this URL with your own logo image
const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/9724/9724484.png";

const App: React.FC = () => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      let googleKeyFound = false;

      // 1. Check Google AI Studio / IDX Environment first
      try {
        if (window.aistudio) {
          const has = await window.aistudio.hasSelectedApiKey();
          if (has) {
            setHasApiKey(true);
            googleKeyFound = true;
          }
        }
      } catch (e) {
        console.error("Failed to check Google API key", e);
      }

      // 2. If not found in environment, check LocalStorage
      if (!googleKeyFound) {
        const localKey = localStorage.getItem('gemini_api_key');
        if (localKey) {
          setHasApiKey(true);
        } else {
          // Check if process.env.API_KEY is already populated (e.g. hardcoded or other injection)
          // Note: In some build setups process.env.API_KEY might be replaced by a string.
          // We handle this safely.
          try {
             if (process.env.API_KEY) {
                 setHasApiKey(true);
             }
          } catch(e) {
              // ignore
          }
        }
      }

      setIsCheckingKey(false);
    };
    checkKey();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        const has = await window.aistudio.hasSelectedApiKey(); 
        if (has) {
            setHasApiKey(true);
            setIsGuest(false);
        } else {
             // If the promise resolved without error, usually it means success or user cancelled.
             // We check hasSelectedApiKey again to be sure. 
             // Some versions of the API might resolve even if cancelled.
             // If we are here, we might optimistically assume success if the environment is quirky, 
             // but strict checking is better.
             // However, to satisfy "automatically detect", if openSelectKey finishes, we can trigger a re-render/re-check.
             const reCheck = await window.aistudio.hasSelectedApiKey();
             if (reCheck) setHasApiKey(true);
        }
      } catch (e: any) {
        console.error("Failed to select key", e);
        if (e.message && e.message.includes("Authentication provider not found")) {
             setAuthError("Authentication provider missing. You can enter your API key manually below.");
        } else {
             setAuthError("Authentication failed. Please try again, enter key manually, or continue as Guest.");
        }
      }
    } else {
        setAuthError("Google AI Studio environment not detected.");
    }
  };

  const handleManualKeySave = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setHasApiKey(true);
    setIsGuest(false);
    setAuthError(null);
  };

  const handleGuestAccess = () => {
    setIsGuest(true);
    setAuthError(null);
  };

  const handleReset = () => {
    setDataset(null);
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30 selection:text-brand-200 flex flex-col overflow-hidden">
      <div className="flex-1 w-full overflow-hidden relative">
        {!dataset ? (
            <div className="h-full flex flex-col relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                    <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    
                    {/* Logo Image */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-600 rounded-full opacity-30 group-hover:opacity-70 blur transition duration-1000 group-hover:duration-200"></div>
                            <img 
                                src={LOGO_URL} 
                                alt="MetricFlowAI Logo" 
                                className="relative w-24 h-24 object-contain drop-shadow-2xl"
                            />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        MetricFlowAI
                    </h1>
                    <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Refract your raw data into a spectrum of actionable insights using advanced AI analysis.
                    </p>
                    </div>
                    
                    {isCheckingKey ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-500">Checking credentials...</p>
                    </div>
                    ) : (hasApiKey || isGuest) ? (
                        <div className="animate-in fade-in zoom-in duration-500 w-full flex justify-center">
                            <FileUpload onDataLoaded={setDataset} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500 w-full max-w-md">
                            {authError && (
                                <div className="w-full bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-200 text-center mb-2 animate-in slide-in-from-top-2">
                                    <p className="mb-2">{authError}</p>
                                    <button 
                                        onClick={() => setShowApiKeyModal(true)}
                                        className="text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-100 px-4 py-1.5 rounded-full transition-colors border border-red-500/30 inline-flex items-center gap-1"
                                    >
                                        <Key size={12} /> Set up API Key manually
                                    </button>
                                </div>
                            )}
                            
                            <button 
                                onClick={handleLogin}
                                className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Log in with Google
                            </button>
                            
                            <div className="flex gap-4 text-sm font-medium">
                                <button 
                                    onClick={() => setShowApiKeyModal(true)}
                                    className="text-slate-400 hover:text-white transition-colors hover:underline underline-offset-4 flex items-center gap-1.5"
                                >
                                    <Key size={14} /> Enter API Key
                                </button>
                                <span className="text-slate-700">|</span>
                                <button 
                                    onClick={handleGuestAccess}
                                    className="text-slate-400 hover:text-white transition-colors hover:underline underline-offset-4"
                                >
                                    Continue as Guest
                                </button>
                            </div>

                            <div className="text-center space-y-2 max-w-xs mt-2">
                                <p className="text-slate-500 text-xs">
                                    Guest mode provides local data visualization but excludes AI features.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-slate-500 text-sm max-w-4xl mx-auto">
                        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <strong className="block text-slate-300 mb-1 text-base">Instant Parsing</strong>
                        Drag & Drop CSVs to visualize structures immediately.
                        </div>
                        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <strong className="block text-slate-300 mb-1 text-base">AI Powered</strong>
                        Deep analysis and executive summaries generated by AI.
                        </div>
                        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <strong className="block text-slate-300 mb-1 text-base">Interactive Chat</strong>
                        Ask questions about your data in plain English, Arabic, Tamil or Sinhala.
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <Dashboard dataset={dataset} onReset={handleReset} isGuest={isGuest && !hasApiKey} />
        )}
      </div>

      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
        onSave={handleManualKeySave} 
      />

      {/* Global Footer */}
      <footer className="py-2 text-center text-slate-600 text-[11px] bg-slate-950 border-t border-slate-900 z-50 shrink-0 select-none">
          Created by <a href="https://mushieditz.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-400 transition-colors font-medium">Mushi Editz</a>
      </footer>
    </div>
  );
};

export default App;
