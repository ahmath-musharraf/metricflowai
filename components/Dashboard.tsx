import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dataset, AnalysisStatus, ChatMessage, ChartConfig } from '../types';
import DataPreview from './DataPreview';
import ChartSection from './ChartSection';
import ForecastSection from './ForecastSection';
import { analyzeDataset, queryDataset } from '../services/geminiService';
import { convertDatasetToCSV, convertDatasetToJSON, generateKeyMetrics, prepareChartData } from '../utils/dataUtils';
import { 
    LayoutDashboard, 
    MessageSquare, 
    Sparkles, 
    Database, 
    Send, 
    X,
    Download,
    ShieldCheck,
    AlertCircle,
    FileJson,
    TrendingUp,
    BarChart3,
    Activity,
    Layers,
    Menu,
    Calendar,
    Clock,
    Lightbulb,
    FileText,
    ArrowRight,
    Info,
    Cpu,
    ChevronDown,
    Lock
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
    LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, Label
} from 'recharts';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  dataset: Dataset;
  onReset: () => void;
  isGuest: boolean;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#64748b'];

// Placeholder Logo
const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/9724/9724484.png";

// Available Models - Generic Naming
const AI_MODELS = [
    { id: 'gemini-2.5-flash', name: 'AI Model Fast' },
    { id: 'gemini-3-pro-preview', name: 'AI Model Pro' },
    { id: 'gemini-flash-lite-latest', name: 'AI Model Lite' },
];

// Helper for custom date formatting
const formatDate = (dateStr: string | undefined, format: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid';

  if (!format || format.trim() === '') return d.toLocaleDateString();

  const map: Record<string, string> = {
    'YYYY': d.getFullYear().toString(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => map[match]);
};

// Sub-component for Chat Chart
const ChatChart = ({ dataset, config }: { dataset: Dataset, config: ChartConfig }) => {
    const data = useMemo(() => prepareChartData(dataset, config), [dataset, config]);
    
    if (data.length === 0) return <div className="text-xs text-rose-400 italic mt-2">Could not render chart: missing columns.</div>;

    return (
        <div className="mt-4 mb-2 h-64 w-full bg-slate-900/50 rounded-lg border border-slate-700 p-2">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 text-center">{config.title}</h4>
            <ResponsiveContainer width="100%" height="100%">
                {config.type === 'bar' ? (
                     <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey={config.xAxis} stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Bar dataKey={config.yAxis} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                     </BarChart>
                ) : config.type === 'line' ? (
                     <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey={config.xAxis} stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey={config.yAxis} stroke="#8b5cf6" strokeWidth={2} dot={{r: 2}} />
                     </LineChart>
                ) : config.type === 'pie' ? (
                     <PieChart>
                         <Pie
                            data={data}
                            dataKey={config.yAxis}
                            nameKey={config.xAxis}
                            cx="50%" cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                         >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                            ))}
                         </Pie>
                         <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                     </PieChart>
                ) : (
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="category" dataKey={config.xAxis} stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <YAxis type="number" dataKey={config.yAxis} stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} />
                        <RechartsTooltip 
                             cursor={{ strokeDasharray: '3 3' }}
                             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Scatter data={data} fill="#10b981" />
                    </ScatterChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

export default function Dashboard({ dataset, onReset, isGuest }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'chat' | 'quality' | 'forecast'>('overview');
  const [analysis, setAnalysis] = useState<string>("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [customDateFormat, setCustomDateFormat] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derived Metrics
  const keyMetrics = useMemo(() => generateKeyMetrics(dataset), [dataset]);
  const overallQualityScore = useMemo(() => {
    const totalCells = dataset.rows.length * dataset.columns.length;
    if (totalCells === 0) return 0;
    const totalMissing = dataset.profile.reduce((acc, col) => acc + col.missingCount, 0);
    return Math.round(((totalCells - totalMissing) / totalCells) * 100);
  }, [dataset]);

  const qualityScatterData = useMemo(() => {
    return dataset.profile.map(col => ({
        name: col.name,
        missing: col.missingCount,
        unique: col.uniqueCount,
        type: col.type
    }));
  }, [dataset]);

  // Generate Smart Suggestions
  const smartSuggestions = useMemo(() => {
    const nums = dataset.profile.filter(c => c.type === 'number');
    const cats = dataset.profile.filter(c => c.type === 'string');
    const dates = dataset.profile.filter(c => c.type === 'date');
    
    const suggestions = [];

    if (nums.length > 0 && cats.length > 0) {
        suggestions.push(`Show a bar chart of ${nums[0].name} by ${cats[0].name}`);
    }
    if (nums.length > 1) {
        suggestions.push(`Is there a correlation between ${nums[0].name} and ${nums[1].name}?`);
    }
    if (dates.length > 0 && nums.length > 0) {
        suggestions.push(`Plot the trend of ${nums[0].name} over time`);
    }
    if (cats.length > 0) {
        suggestions.push(`What is the distribution of ${cats[0].name}?`);
    }
    if (nums.length > 0) {
        suggestions.push(`Identify any outliers in ${nums[0].name}`);
    }

    // Fill with generics if needed, limit to 4
    if (suggestions.length < 4) {
        suggestions.push("Summarize the key insights from this data");
        suggestions.push("Are there any data quality issues?");
    }

    return suggestions.slice(0, 4);
  }, [dataset]);

  useEffect(() => {
    if (isGuest) {
        setAnalysisStatus(AnalysisStatus.IDLE);
        return;
    }

    // Auto-analyze on load or when model changes
    const runAnalysis = async () => {
      setAnalysisStatus(AnalysisStatus.LOADING);
      try {
        const result = await analyzeDataset(dataset, selectedModel);
        setAnalysis(result);
        setAnalysisStatus(AnalysisStatus.COMPLETE);
      } catch (e) {
        setAnalysisStatus(AnalysisStatus.ERROR);
      }
    };
    runAnalysis();
  }, [dataset, selectedModel, isGuest]);

  useEffect(() => {
    if (activeTab === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
            setIsModelMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (text: string = inputMessage) => {
    if (isGuest) return; // Prevent guest chat

    const msgText = text.trim();
    if (!msgText || isChatLoading) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: msgText,
        timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsChatLoading(true);

    try {
        const historyContext = chatHistory.slice(-4).map(m => ({ role: m.role, content: m.content }));
        const response = await queryDataset(dataset, userMsg.content, historyContext, selectedModel);
        
        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: response.text,
            timestamp: Date.now(),
            chartConfig: response.chartConfig
        };
        setChatHistory(prev => [...prev, modelMsg]);
    } catch (err) {
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: "Sorry, I encountered an error processing your request.",
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, errorMsg]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = convertDatasetToCSV(dataset);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataset.name || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonContent = convertDatasetToJSON(dataset);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(dataset.name || 'export').replace('.csv', '')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportQualityReport = () => {
    const report = {
        datasetName: dataset.name,
        generatedAt: new Date().toISOString(),
        qualityScore: overallQualityScore,
        totalRows: dataset.rows.length,
        columns: dataset.profile
    };
    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(dataset.name || 'export').replace('.csv', '')}_quality_report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAnalysis = () => {
      const blob = new Blob([analysis], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(dataset.name || 'analysis').replace('.csv', '')}_analysis.md`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const dateColumns = useMemo(() => dataset.profile.filter(p => p.type === 'date'), [dataset]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-4 lg:px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <Menu className="w-5 h-5" />
          </button>
          
          <img src={LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" />
          
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">MetricFlowAI</h1>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs border border-slate-700 max-w-[150px] truncate">
             {dataset.name}
          </span>
          {isGuest && (
             <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30 flex items-center gap-1">
                 <Lock size={10} /> Guest
             </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          
          {/* Model Selector */}
          {!isGuest && (
            <div className="relative hidden sm:block" ref={modelMenuRef}>
                <button 
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-md transition-all"
                >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{AI_MODELS.find(m => m.id === selectedModel)?.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
                {isModelMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50">Select AI Model</div>
                        {AI_MODELS.map(model => (
                            <button 
                                key={model.id}
                                onClick={() => { setSelectedModel(model.id); setIsModelMenuOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${selectedModel === model.id ? 'bg-brand-500/10 text-brand-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                {model.name}
                                {selectedModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Export Group */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors" title="Export CSV">
               <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button onClick={handleExportJSON} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors" title="Export JSON">
               <FileJson className="w-3.5 h-3.5" /> JSON
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button onClick={handleExportQualityReport} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-brand-400 hover:bg-slate-700/50 rounded-md transition-colors" title="Export Quality Report">
               <ShieldCheck className="w-3.5 h-3.5" /> Report
            </button>
          </div>
          
          <div className="h-4 w-px bg-slate-800 mx-2 hidden sm:block"></div>

          <button onClick={onReset} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
             <X className="w-4 h-4" /> <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <nav 
            className={`
                absolute lg:relative z-10 h-full w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
        >
            <div className="p-4 flex flex-col gap-2">
                {[
                    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                    { id: 'forecast', icon: TrendingUp, label: 'Prediction' },
                    { id: 'quality', icon: ShieldCheck, label: 'Data Quality' },
                    { id: 'data', icon: Database, label: 'Raw Data' },
                    { id: 'chat', icon: MessageSquare, label: 'AI Analyst' }
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            activeTab === item.id 
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </button>
                ))}
            </div>
            
            <div className="mt-auto p-4 border-t border-slate-800">
                <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
                    <p className="font-semibold text-slate-300 mb-1">Dataset Stats</p>
                    <div className="flex justify-between mb-1">
                        <span>Rows</span>
                        <span className="text-white">{dataset.rows.length.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Columns</span>
                        <span className="text-white">{dataset.columns.length}</span>
                    </div>
                </div>
            </div>
        </nav>
        
        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-0 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* 
                  ========================================
                  OVERVIEW TAB
                  ========================================
                */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        
                        {/* 1. Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                             <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h2>
                                <p className="text-slate-400 mt-1">Real-time analysis and key performance indicators.</p>
                             </div>
                             <div className="text-right hidden md:block">
                                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Last Updated</span>
                                <p className="text-sm text-slate-300 font-mono">{new Date().toLocaleDateString()}</p>
                             </div>
                        </div>

                        {/* 2. Key Metrics Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                             {/* Metric Cards (Dynamic) */}
                             {keyMetrics.map((metric, idx) => (
                                 <div key={metric.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl hover:border-brand-500/30 transition-colors">
                                     <div className="flex items-start justify-between mb-2">
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{metric.label}</span>
                                        <div className={`p-1.5 rounded-lg bg-opacity-20 ${idx === 0 ? 'bg-emerald-500 text-emerald-400' : idx === 1 ? 'bg-blue-500 text-blue-400' : 'bg-purple-500 text-purple-400'}`}>
                                            {idx === 0 ? <TrendingUp size={14} /> : idx === 1 ? <Activity size={14} /> : <BarChart3 size={14} />}
                                        </div>
                                     </div>
                                     <div className="text-2xl font-bold text-white tracking-tight">{metric.value}</div>
                                 </div>
                             ))}
                             
                             {/* Fallback Metrics if fewer columns */}
                             {keyMetrics.length < 4 && (
                                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fields</span>
                                        <Layers size={14} className="text-slate-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight">{dataset.columns.length}</div>
                                </div>
                             )}
                        </div>

                        {/* 3. Bento Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Col: AI Summary (Span 2) */}
                            <div className="lg:col-span-2 flex flex-col">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800/80 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden flex-1 relative group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Sparkles className="w-32 h-32 text-brand-400" />
                                    </div>
                                    
                                    <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-white/5 backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-500/20 rounded-lg ring-1 ring-brand-500/40">
                                                <Sparkles className="w-5 h-5 text-brand-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">AI Executive Summary</h3>
                                                <p className="text-xs text-slate-400">Automated insights powered by {AI_MODELS.find(m => m.id === selectedModel)?.name}</p>
                                            </div>
                                        </div>
                                        {analysisStatus === AnalysisStatus.COMPLETE && !isGuest && (
                                            <button 
                                                onClick={handleExportAnalysis}
                                                className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                title="Download Analysis"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar relative">
                                        {isGuest ? (
                                             <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                                                <div className="p-3 bg-slate-800 rounded-full mb-3">
                                                    <Lock className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <h4 className="text-slate-300 font-medium mb-1">AI Insights Locked</h4>
                                                <p className="text-sm text-slate-500 max-w-sm">
                                                    Executive summaries require cloud processing. Please log in with a valid API key to unlock this feature.
                                                </p>
                                             </div>
                                        ) : analysisStatus === AnalysisStatus.LOADING ? (
                                            <div className="space-y-4 animate-pulse">
                                                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                                                <div className="h-4 bg-slate-700 rounded w-full"></div>
                                                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                                            </div>
                                         ) : analysisStatus === AnalysisStatus.ERROR ? (
                                            <div className="text-red-400 bg-red-900/10 p-4 rounded-lg border border-red-900/30 text-sm">
                                                Unable to generate analysis at this time.
                                            </div>
                                         ) : (
                                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                                                <ReactMarkdown 
                                                    components={{
                                                        h1: ({node, ...props}) => <h3 className="text-lg font-bold text-white mt-4 mb-2" {...props} />,
                                                        h2: ({node, ...props}) => <h4 className="text-base font-bold text-brand-200 mt-4 mb-2" {...props} />,
                                                        strong: ({node, ...props}) => <span className="font-semibold text-brand-100" {...props} />,
                                                        li: ({node, ...props}) => <li className="my-1.5" {...props} />
                                                    }}
                                                >
                                                    {analysis}
                                                </ReactMarkdown>
                                            </div>
                                         )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Health & Structure */}
                            <div className="flex flex-col gap-6">
                                {/* Health Card */}
                                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
                                    <div className="flex justify-between items-start z-10 relative">
                                        <div>
                                            <h3 className="text-base font-semibold text-white">Data Health</h3>
                                            <p className="text-xs text-slate-400 mt-1">Completeness Score</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${overallQualityScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {overallQualityScore >= 90 ? 'EXCELLENT' : 'NEEDS ATTENTION'}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-6 flex items-center justify-center">
                                         <div className="relative w-32 h-32 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                <path 
                                                    className={`${overallQualityScore >= 90 ? "text-emerald-500" : overallQualityScore >= 70 ? "text-amber-500" : "text-rose-500"} transition-all duration-1000 ease-out drop-shadow-lg`}
                                                    strokeDasharray={`${overallQualityScore}, 100`}
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-2xl font-bold text-white">{overallQualityScore}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dataset Shape */}
                                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex-1 flex flex-col justify-center">
                                    <h3 className="text-base font-semibold text-white mb-4">Structure</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-400">Total Rows</span>
                                                <span className="text-white font-mono">{dataset.rows.length.toLocaleString()}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full w-full opacity-70"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-400">Numeric Fields</span>
                                                <span className="text-white font-mono">{dataset.profile.filter(c => c.type === 'number').length}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(dataset.profile.filter(c => c.type === 'number').length / dataset.columns.length) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Visualizations */}
                        <div className="pt-4 space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-brand-400" />
                                    Deep Dive Visualizations
                                </h3>
                                <ChartSection dataset={dataset} />
                            </div>
                        </div>
                    </div>
                )}

                {/* 
                  ========================================
                  FORECAST TAB
                  ========================================
                */}
                {activeTab === 'forecast' && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ForecastSection dataset={dataset} />
                     </div>
                )}

                {/* 
                  ========================================
                  DATA TAB
                  ========================================
                */}
                {activeTab === 'data' && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                        <DataPreview dataset={dataset} />
                     </div>
                )}

                {/* 
                  ========================================
                  CHAT TAB
                  ========================================
                */}
                {activeTab === 'chat' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden relative">
                        {isGuest && (
                             <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                 <div className="p-4 bg-slate-800 rounded-full mb-4 shadow-xl">
                                     <Lock className="w-8 h-8 text-slate-400" />
                                 </div>
                                 <h3 className="text-xl font-bold text-white mb-2">AI Analyst Unavailable</h3>
                                 <p className="text-slate-400 max-w-md mb-6">
                                     Chatting with your data requires active processing by advanced AI models. 
                                     Please log in to unlock this feature.
                                 </p>
                             </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {chatHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <div className="flex flex-col items-center justify-center text-slate-500 opacity-60 mb-8">
                                        <MessageSquare className="w-16 h-16 mb-4" />
                                        <p className="text-lg font-medium">Ask me anything about your data</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                                        {smartSuggestions.map((suggestion, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleSendMessage(suggestion)}
                                                disabled={isGuest}
                                                className="text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className="flex items-center gap-2 mb-1 text-brand-400 font-medium text-xs uppercase tracking-wider">
                                                    <Lightbulb size={12} /> Suggestion
                                                </div>
                                                <div className="text-slate-200 text-sm flex justify-between items-center">
                                                    {suggestion}
                                                    <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                chatHistory.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div 
                                            className={`
                                                max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                                                ${msg.role === 'user' 
                                                    ? 'bg-brand-600 text-white rounded-br-none' 
                                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                                }
                                            `}
                                        >
                                           <ReactMarkdown>{msg.content}</ReactMarkdown>
                                           {msg.chartConfig && (
                                               <ChatChart dataset={dataset} config={msg.chartConfig} />
                                           )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-slate-900 border-t border-slate-800">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={isGuest ? "Chat unavailable in Guest Mode" : "Type your question..."}
                                    disabled={isChatLoading || isGuest}
                                    className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputMessage.trim() || isChatLoading || isGuest}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-400 disabled:opacity-50 disabled:hover:bg-brand-500 transition-colors disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 
                  ========================================
                  QUALITY TAB
                  ========================================
                */}
                {activeTab === 'quality' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-500/20 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-brand-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Data Quality Report</h2>
                        </div>
                        
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                             
                             <div className="relative z-10">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-white">Quality Assessment</h3>
                                </div>
                                <p className="text-slate-400 text-sm mt-1 max-w-lg">
                                    A holistic view of your dataset's integrity, measuring missing values and type consistency.
                                </p>
                            </div>

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="text-right">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Missing Cells</div>
                                    <div className="text-xl font-mono font-bold text-slate-200">
                                        {dataset.profile.reduce((acc, col) => acc + col.missingCount, 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="h-1.5 w-px bg-slate-700"></div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completeness</div>
                                        <div className="group/tooltip relative">
                                            <Info size={14} className="text-slate-400 hover:text-brand-400 transition-colors cursor-help" />
                                            <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-3 text-xs text-slate-300 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 text-left">
                                                <div className="font-semibold text-white mb-1">Score Calculation</div>
                                                <p className="mb-2 leading-relaxed">
                                                    The score reflects the percentage of non-empty cells in the entire dataset.
                                                </p>
                                                <div className="bg-slate-800 rounded p-1.5 font-mono text-[10px] text-brand-300 text-center border border-slate-700/50">
                                                    (1 - (Missing / Total Cells)) × 100
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-xl font-mono font-bold ${overallQualityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {overallQualityScore}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Temporal Analysis Section (New) */}
                        {dateColumns.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-purple-400" />
                                        <h3 className="text-lg font-semibold text-white">Temporal Analysis</h3>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
                                        <label className="text-xs text-slate-400 font-medium px-1">Format:</label>
                                        <input 
                                            type="text" 
                                            placeholder="Default (Locale)" 
                                            value={customDateFormat}
                                            onChange={(e) => setCustomDateFormat(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 w-32"
                                        />
                                        <div className="text-[10px] text-slate-500 px-1 hidden sm:block">
                                            try: YYYY-MM-DD
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {dateColumns.map((col) => (
                                        <div key={col.name} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 relative hover:border-brand-500/30 transition-colors">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                                                    <Calendar size={20} />
                                                </div>
                                                <h3 className="font-semibold text-white truncate" title={col.name}>{col.name}</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">Earliest</span>
                                                    <span className="text-slate-200 font-medium">
                                                        {formatDate(col.minDate, customDateFormat)}
                                                    </span>
                                                </div>
                                                <div className="h-px bg-slate-700/50 w-full"></div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">Latest</span>
                                                    <span className="text-slate-200 font-medium">
                                                        {formatDate(col.maxDate, customDateFormat)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quality Scatter Plot */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Cardinality vs. Missing Data</h3>
                                    <p className="text-xs text-slate-400">Analyze the relationship between uniqueness and data completeness across columns.</p>
                                </div>
                             </div>
                             <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis 
                                            type="number" 
                                            dataKey="missing" 
                                            name="Missing Values" 
                                            stroke="#94a3b8" 
                                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                                            tickLine={false}
                                        >
                                            <Label value="Missing Count" offset={-10} position="insideBottom" fill="#94a3b8" fontSize={12} />
                                        </XAxis>
                                        <YAxis 
                                            type="number" 
                                            dataKey="unique" 
                                            name="Unique Values" 
                                            stroke="#94a3b8" 
                                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                                            tickLine={false}
                                        >
                                             <Label value="Unique Count" angle={-90} position="insideLeft" fill="#94a3b8" fontSize={12} style={{ textAnchor: 'middle' }} />
                                        </YAxis>
                                        <RechartsTooltip 
                                            cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-slate-200">
                                                            <p className="font-semibold mb-1 text-white">{data.name}</p>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                                                     data.type === 'number' 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                        : data.type === 'date'
                                                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                     }`}>
                                                                    {data.type}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                <span className="text-slate-500">Missing:</span>
                                                                <span className="text-rose-400 font-mono text-right">{data.missing}</span>
                                                                <span className="text-slate-500">Unique:</span>
                                                                <span className="text-emerald-400 font-mono text-right">{data.unique}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Columns" data={qualityScatterData} fill="#38bdf8" shape="circle" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dataset.profile.map((col) => {
                                const completeness = Math.round(((dataset.rows.length - col.missingCount) / dataset.rows.length) * 100);
                                const isHealthy = col.missingCount === 0;

                                return (
                                    <div key={col.name} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-brand-500/30 transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="overflow-hidden">
                                                <h3 className="font-semibold text-lg text-white truncate" title={col.name}>{col.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                                                         col.type === 'number' 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : col.type === 'date'
                                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                         }`}>
                                                        {col.type}
                                                     </span>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-full flex-shrink-0 ${isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {isHealthy ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <div className="flex justify-between text-sm text-slate-400 mb-2">
                                                    <span>Completeness</span>
                                                    <span className={isHealthy ? 'text-emerald-400' : 'text-amber-400'}>{completeness}%</span>
                                                </div>
                                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${completeness}%` }}></div>
                                                </div>
                                                {col.missingCount > 0 && (
                                                    <p className="text-xs text-amber-400/80 mt-1.5 font-medium">
                                                        {col.missingCount} missing values
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Unique</span>
                                                    <span className="text-sm font-mono text-slate-200">{col.uniqueCount.toLocaleString()}</span>
                                                </div>
                                                {col.type === 'number' && (
                                                   <div>
                                                       <span className="text-xs text-slate-500 block mb-1">Mean</span>
                                                       <span className="text-sm font-mono text-slate-200">{col.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                   </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
}
