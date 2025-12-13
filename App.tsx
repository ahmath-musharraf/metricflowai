import React, { useState, useEffect } from 'react';
import { Dataset } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(has);
        }
      } catch (e) {
        console.error("Failed to check API key", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleLogin = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        setIsGuest(false);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  const handleGuestAccess = () => {
    setIsGuest(true);
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
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-slate-800/50 border border-slate-700 shadow-xl backdrop-blur-sm">
                        <span className="text-2xl">✨</span>
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
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                            <button 
                                onClick={handleLogin}
                                className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Log in with Google
                            </button>
                            
                            <button 
                                onClick={handleGuestAccess}
                                className="text-slate-400 hover:text-white text-sm font-medium transition-colors hover:underline underline-offset-4"
                            >
                                Continue as Guest
                            </button>

                            <div className="text-center space-y-2 max-w-xs mt-2">
                                <p className="text-slate-500 text-xs">
                                    Guest mode provides local data visualization but excludes AI features.
                                </p>
                                <a 
                                    href="https://ai.google.dev/gemini-api/docs/billing" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-brand-500/80 hover:text-brand-400 transition-colors block"
                                >
                                    View Billing Documentation
                                </a>
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
            <Dashboard dataset={dataset} onReset={() => setDataset(null)} isGuest={isGuest && !hasApiKey} />
        )}
      </div>

      {/* Global Footer */}
      <footer className="py-2 text-center text-slate-600 text-[11px] bg-slate-950 border-t border-slate-900 z-50 shrink-0 select-none">
          Created by <a href="https://mushieditz.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-400 transition-colors font-medium">Mushi Editz</a>
      </footer>
    </div>
  );
};

export default App;