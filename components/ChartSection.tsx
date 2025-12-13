import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Dataset } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Label,
  AreaChart, Area, Brush
} from 'recharts';
import { Download, Share2, Check, Info, ChevronDown, CheckSquare, Square, AlertTriangle, Layers, PieChart as PieIcon, Columns, BoxSelect, Activity } from 'lucide-react';
import { calculateCorrelation } from '../utils/dataUtils';

interface ChartSectionProps {
  dataset: Dataset;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#64748b'];

// Error Boundary Component for Charts
class ChartErrorBoundary extends React.Component<{ children: React.ReactNode, fallbackHeight?: string }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, fallbackHeight?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Chart rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`w-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-700/50 rounded-lg ${this.props.fallbackHeight || 'h-full'}`}>
            <AlertTriangle className="w-8 h-8 mb-2 text-amber-500/50" />
            <p className="text-sm font-medium text-slate-400">Unable to render chart</p>
            <p className="text-xs text-slate-500 mt-1">Data may be incompatible or contain errors</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const EmptyDataMessage = ({ message = "No data available to display" }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700/50 rounded-lg">
        <Info className="w-6 h-6 mb-2 opacity-50" />
        <p className="text-xs">{message}</p>
    </div>
);

const formatTooltipValue = (value: number | string) => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }
  return value;
};

const ShareButton = ({ chartId }: { chartId: string }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    // Create a link with a hash for the specific chart
    const url = `${window.location.origin}${window.location.pathname}#chart-${chartId}`;
    navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy link: ', err);
    });
  };

  return (
    <button 
        onClick={handleShare}
        className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-700 rounded-lg transition-colors"
        title={copied ? "Copied to clipboard!" : "Share Link"}
    >
        {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
    </button>
  );
};

const DownloadMenu = ({ onDownload }: { onDownload: (scale: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'text-white bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        title="Download Chart"
      >
        <Download size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
           <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50">Resolution</div>
           <button onClick={() => { onDownload(1); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-brand-500 hover:text-white transition-colors">
             Standard (1x)
           </button>
           <button onClick={() => { onDownload(2); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-brand-500 hover:text-white transition-colors">
             High Quality (2x)
           </button>
           <button onClick={() => { onDownload(4); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-brand-500 hover:text-white transition-colors">
             Print Ready (4x)
           </button>
        </div>
      )}
    </div>
  );
};

const ChartSelect = ({ value, options, onChange, label, className = "" }: { value: string, options: string[], onChange: (val: string) => void, label?: string, className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-700 text-xs text-white py-1 px-2 rounded border border-slate-600 focus:outline-none focus:border-brand-500 max-w-[150px] truncate"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
);

const MultiChartSelect = ({ selected, options, onChange, label, className = "" }: { selected: string[], options: string[], onChange: (val: string[]) => void, label?: string, className?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`} ref={ref}>
            {label && <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>}
            <div className="relative">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between gap-2 bg-slate-700 text-xs text-white py-1 px-2 rounded border border-slate-600 focus:outline-none focus:border-brand-500 min-w-[140px] max-w-[220px]"
                >
                    <div className="flex gap-1 overflow-hidden">
                        {selected.length === 0 ? (
                            <span className="text-slate-400">Select...</span>
                        ) : selected.length <= 2 ? (
                            selected.map(s => <span key={s} className="bg-slate-600 px-1 rounded truncate max-w-[80px]">{s}</span>)
                        ) : (
                            <>
                                <span className="bg-slate-600 px-1 rounded truncate max-w-[80px]">{selected[0]}</span>
                                <span className="bg-slate-600 px-1 rounded">+{selected.length - 1}</span>
                            </>
                        )}
                    </div>
                    <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
                </button>
                {isOpen && (
                    <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600 rounded shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                         <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                            <div 
                                className="flex items-center gap-2 cursor-pointer text-xs text-brand-400 hover:text-brand-300 font-medium"
                                onClick={handleSelectAll}
                            >
                                {selected.length === options.length && options.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span>{selected.length === options.length ? 'Unselect All' : 'Select All'}</span>
                            </div>
                         </div>
                         {options.length === 0 ? (
                             <div className="p-2 text-xs text-slate-500 italic">No options available</div>
                         ) : (
                             options.map(opt => (
                                 <div 
                                    key={opt} 
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-200"
                                    onClick={() => toggleOption(opt)}
                                 >
                                    {selected.includes(opt) ? <CheckSquare size={14} className="text-brand-400" /> : <Square size={14} className="text-slate-500" />}
                                    <span className="truncate">{opt}</span>
                                 </div>
                             ))
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};


const ChartSection: React.FC<ChartSectionProps> = ({ dataset }) => {
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const radarChartRef = useRef<HTMLDivElement>(null);
  
  const [hoveredCorrelationCell, setHoveredCorrelationCell] = useState<{x: string, y: string, value: number} | null>(null);

  const numericColumns = useMemo(() => 
    dataset.profile.filter(c => c.type === 'number').map(c => c.name),
  [dataset]);

  const categoricalColumns = useMemo(() => 
    dataset.profile.filter(c => c.type === 'string' || c.type === 'boolean').map(c => c.name),
  [dataset]);

  const dateColumns = useMemo(() => 
    dataset.profile.filter(c => c.type === 'date').map(c => c.name),
  [dataset]);

  const allColumns = useMemo(() => dataset.columns, [dataset]);

  // State for selected columns
  // Bar Chart
  const [barCategory, setBarCategory] = useState<string>('');
  const [barMetrics, setBarMetrics] = useState<string[]>([]);
  const [barMode, setBarMode] = useState<'group' | 'stack'>('group');

  // Line Chart
  const [lineCols, setLineCols] = useState<string[]>([]);
  const [lineCategory, setLineCategory] = useState<string>(''); // X-Axis
  const [lineType, setLineType] = useState<'line' | 'area'>('line');
  
  // Scatter Plot
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');
  
  // Pie Chart
  const [pieMode, setPieMode] = useState<'distribution' | 'composition'>('distribution');
  const [pieCategory, setPieCategory] = useState<string>('');
  const [pieValue, setPieValue] = useState<string>('');
  const [pieMetrics, setPieMetrics] = useState<string[]>([]);
  
  // Radar Chart
  const [radarCategory, setRadarCategory] = useState<string>('');
  const [radarMetrics, setRadarMetrics] = useState<string[]>([]);
  const [radarScaling, setRadarScaling] = useState<string>('Raw');

  // Initialize selections with smart defaults
  useEffect(() => {
    // Bar Default (Category Count)
    if (categoricalColumns.length > 0 && !barCategory) {
        setBarCategory(categoricalColumns[0]);
    }
    if (barMetrics.length === 0) {
        setBarMetrics(['Row Count']);
    }

    // Line Default (First Numeric)
    if (numericColumns.length > 0 && lineCols.length === 0) {
        setLineCols([numericColumns[0]]);
    }
    // Line Category Default (Date or Index)
    if (!lineCategory) {
        if (dateColumns.length > 0) {
            setLineCategory(dateColumns[0]);
        } else {
            setLineCategory('Row Index');
        }
    }

    // Scatter Default (Best Correlation)
    if (numericColumns.length >= 2 && !scatterX) {
        let bestCorrelation = 0;
        let bestPair = { x: numericColumns[0], y: numericColumns[1] };
        
        // Check subset for performance
        const checkLimit = Math.min(numericColumns.length, 5); 
        for (let i = 0; i < checkLimit; i++) {
            for (let j = i + 1; j < checkLimit; j++) {
                const rawCorr = calculateCorrelation(dataset.rows, numericColumns[i], numericColumns[j]);
                const absCorr = Math.abs(rawCorr);
                if (absCorr > bestCorrelation) {
                    bestCorrelation = absCorr;
                    bestPair = { x: numericColumns[i], y: numericColumns[j] };
                }
            }
        }
        setScatterX(bestPair.x);
        setScatterY(bestPair.y);
    }

    // Pie Default
    if (categoricalColumns.length > 0 && !pieCategory) {
        // Prefer columns with 2-8 unique values
        const bestPie = categoricalColumns.find(c => {
            const profile = dataset.profile.find(p => p.name === c);
            return profile && profile.uniqueCount > 1 && profile.uniqueCount <= 8;
        }) || categoricalColumns[0];
        setPieCategory(bestPie);
    }
    // Pie Composition Default
    if (numericColumns.length > 0 && pieMetrics.length === 0) {
        setPieMetrics(numericColumns.slice(0, 3));
    }

    // Radar Default
    if (categoricalColumns.length > 0 && !radarCategory) {
        // Prefer columns with 3-6 unique values
        const bestRadar = dataset.profile.find(p => 
            (p.type === 'string' || p.type === 'boolean') && 
            p.uniqueCount >= 3 && p.uniqueCount <= 6
        )?.name || categoricalColumns[0];
        setRadarCategory(bestRadar);
    }
    
    // Radar Metrics Default
    if (numericColumns.length > 0 && radarMetrics.length === 0) {
        setRadarMetrics(numericColumns.slice(0, 5));
    }

  }, [dataset, numericColumns, categoricalColumns, dateColumns]);


  // 1. Bar Chart Data
  const barChartData = useMemo(() => {
    try {
        if (!barCategory) return null;
        if (barMetrics.length === 0) return [];

        const aggregated: Record<string, any> = {};
        
        dataset.rows.forEach(row => {
            const key = String(row[barCategory]);
            if (!aggregated[key]) {
                aggregated[key] = { name: key };
                barMetrics.forEach(m => aggregated[key][m] = 0);
            }
            barMetrics.forEach(m => {
                const val = m === 'Row Count' ? 1 : (Number(row[m]) || 0);
                aggregated[key][m] += val;
            });
        });

        // Sort by first metric desc
        const firstMetric = barMetrics[0];
        return Object.values(aggregated)
            .sort((a: any, b: any) => b[firstMetric] - a[firstMetric])
            .slice(0, 20);

    } catch (e) {
        console.error("Bar data calc error", e);
        return [];
    }
  }, [dataset, barCategory, barMetrics]);

  // 2. Line Chart Data
  const lineChartData = useMemo(() => {
    try {
        if (lineCols.length === 0) return null;
        
        let data = dataset.rows.map((row, idx) => {
            const item: any = { _idx: idx };
            
            // X Axis
            if (lineCategory === 'Row Index' || !lineCategory) {
                item.index = idx;
            } else {
                item.index = row[lineCategory];
            }

            // Y Axis columns
            lineCols.forEach(col => {
                item[col] = Number(row[col]) || 0;
            });
            return item;
        });

        // Sort if using a specific column (likely date or number)
        const xColProfile = dataset.profile.find(p => p.name === lineCategory);
        if (lineCategory && lineCategory !== 'Row Index') {
            data = data.sort((a, b) => {
                const valA = a.index;
                const valB = b.index;
                
                // Check if it's a date column and try to sort by time
                if (xColProfile?.type === 'date') {
                    const timeA = new Date(valA).getTime();
                    const timeB = new Date(valB).getTime();
                    if (!isNaN(timeA) && !isNaN(timeB)) {
                        return timeA - timeB;
                    }
                }

                if (valA < valB) return -1;
                if (valA > valB) return 1;
                return 0;
            });
        }

        return data.slice(0, 200); 
    } catch (e) {
        console.error("Line data calc error", e);
        return [];
    }
  }, [dataset, lineCols, lineCategory]);

  // 3. Scatter Plot Data
  const scatterConfig = useMemo(() => {
    try {
        if (!scatterX || !scatterY || scatterX === scatterY) return null;
        
        const correlation = calculateCorrelation(dataset.rows, scatterX, scatterY);

        const data = dataset.rows
            .map(row => ({
                x: Number(row[scatterX]),
                y: Number(row[scatterY]),
            }))
            .filter(pt => !isNaN(pt.x) && !isNaN(pt.y))
            .slice(0, 300);

        if (data.length === 0) return { x: scatterX, y: scatterY, data: [], correlation: 0 };

        return { x: scatterX, y: scatterY, data, correlation };
    } catch (e) {
        return null;
    }
  }, [dataset, scatterX, scatterY]);

  // 4. Radar Chart Data
  const radarChartData = useMemo(() => {
    try {
        if (!radarCategory || radarMetrics.length === 0) return null;

        const groups: Record<string, { count: number, sums: Record<string, number> }> = {};

        dataset.rows.forEach(row => {
            const groupKey = String(row[radarCategory]);
            if (!groups[groupKey]) {
                groups[groupKey] = { count: 0, sums: {} };
                radarMetrics.forEach(m => groups[groupKey].sums[m] = 0);
            }
            groups[groupKey].count++;
            radarMetrics.forEach(m => {
                const val = Number(row[m]);
                if (!isNaN(val)) groups[groupKey].sums[m] += val;
            });
        });

        // Limit to top 5 groups to prevent overcrowding
        const topGroups = Object.entries(groups)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([key]) => key);

        if (topGroups.length === 0) return { data: [], groups: [] };

        const result = radarMetrics.map(metric => {
            const item: any = { subject: metric };
            topGroups.forEach(groupKey => {
                item[groupKey] = groups[groupKey].sums[metric] / groups[groupKey].count;
            });
            return item;
        });

        // Apply Scaling
        if (radarScaling === 'Min-Max') {
            result.forEach(item => {
                const values = topGroups.map(g => item[g] as number);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                topGroups.forEach(g => {
                    if (range === 0) item[g] = 1; 
                    else item[g] = (item[g] - min) / range;
                });
            });
        } else if (radarScaling === 'Standard') {
            result.forEach(item => {
                const values = topGroups.map(g => item[g] as number);
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                const std = Math.sqrt(variance);
                topGroups.forEach(g => {
                    if (std === 0) item[g] = 0;
                    else item[g] = (item[g] - mean) / std;
                });
            });
        }

        return { data: result, groups: topGroups };
    } catch(e) {
        return { data: [], groups: [] };
    }
  }, [dataset, radarCategory, radarMetrics, radarScaling]);

  // 5. Pie Chart Data
  const pieChartData = useMemo(() => {
    try {
        // Case 1: Composition (Sum of multiple columns)
        if (pieMode === 'composition') {
            if (pieMetrics.length === 0) return { data: [], title: 'No metrics selected' };
            const data = pieMetrics.map(m => {
                const sum = dataset.rows.reduce((acc, row) => acc + (Number(row[m]) || 0), 0);
                return { name: m, value: sum };
            }).sort((a, b) => b.value - a.value);
            return { data, title: 'Total Value Composition' };
        }

        // Case 2: Distribution (Category)
        if (!pieCategory) return null;
        
        let data = [];
        let title = '';

        if (pieValue && pieValue !== 'Row Count') {
            // Sum mode
            const sums: Record<string, number> = {};
            dataset.rows.forEach(row => {
                const key = String(row[pieCategory]);
                const val = Number(row[pieValue]);
                if (!isNaN(val)) {
                    sums[key] = (sums[key] || 0) + val;
                }
            });
            data = Object.entries(sums).map(([name, value]) => ({ name, value }));
            title = `${pieValue} by ${pieCategory}`;
        } else {
            // Count mode
            const counts: Record<string, number> = {};
            dataset.rows.forEach(row => {
                const val = String(row[pieCategory]);
                counts[val] = (counts[val] || 0) + 1;
            });
            data = Object.entries(counts).map(([name, value]) => ({ name, value }));
            title = `Row Count by ${pieCategory}`;
        }

        data.sort((a, b) => b.value - a.value);
        
        // Group small slices
        if (data.length <= 6) {
            return { data, title };
        }

        const top5 = data.slice(0, 5);
        const others = data.slice(5);
        const otherCount = others.reduce((sum, item) => sum + item.value, 0);

        return { 
            data: [...top5, { name: 'Other', value: otherCount }], 
            title
        };
    } catch (e) {
        return { data: [], title: 'Error' };
    }
  }, [dataset, pieMode, pieCategory, pieValue, pieMetrics]);

  // 6. Correlation Matrix Data
  const correlationMatrix = useMemo(() => {
    try {
        if (numericColumns.length < 2) return null;
        const colsToUse = numericColumns.slice(0, 15); // Limit to 15 for fit
        const matrix: { x: string, y: string, value: number }[] = [];
        for (let i = 0; i < colsToUse.length; i++) {
            for (let j = 0; j < colsToUse.length; j++) {
                const val = calculateCorrelation(dataset.rows, colsToUse[i], colsToUse[j]);
                matrix.push({ x: colsToUse[i], y: colsToUse[j], value: val });
            }
        }
        return { matrix, cols: colsToUse };
    } catch(e) {
        return null;
    }
  }, [dataset, numericColumns]);

  const getCorrelationColor = (value: number) => {
    if (value > 0) {
        return `rgba(16, 185, 129, ${0.1 + Math.abs(value) * 0.9})`; 
    } else {
        return `rgba(239, 68, 68, ${0.1 + Math.abs(value) * 0.9})`;
    }
  };


  const downloadChart = (ref: React.RefObject<HTMLDivElement | null>, fileName: string, scale: number = 2) => {
    const chartContainer = ref.current;
    if (!chartContainer) return;

    const svg = chartContainer.querySelector('svg');
    if (!svg) return;

    // Serialize SVG
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    // Ensure namespace
    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Create Blob and URL
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    // Load image and draw to canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        // Fill background (Dark Theme Match)
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        
        // Trigger download
        const a = document.createElement('a');
        a.download = `${fileName}_${scale}x.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const getSafeFilename = (prefix: string) => {
    const cleanName = dataset.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${cleanName}_${prefix}`;
  };

  if (numericColumns.length === 0 && categoricalColumns.length === 0) {
    return <div className="text-slate-500">No visualizable data found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Bar Chart */}
      {barChartData && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700" id="chart-distribution">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                    <h3 className="text-slate-300 font-medium">Bar Analysis</h3>
                    <div className="flex bg-slate-700/50 rounded-lg p-0.5 border border-slate-600">
                        <button 
                            onClick={() => setBarMode('group')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${barMode === 'group' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Grouped"
                        >
                            <Columns size={12} className="inline mr-1" />
                            Group
                        </button>
                        <button 
                            onClick={() => setBarMode('stack')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${barMode === 'stack' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Stacked"
                        >
                            <Layers size={12} className="inline mr-1" />
                            Stack
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ChartSelect 
                        value={barCategory} 
                        options={categoricalColumns} 
                        onChange={setBarCategory}
                        label="Group By"
                    />
                    <MultiChartSelect
                        selected={barMetrics}
                        options={['Row Count', ...numericColumns]}
                        onChange={setBarMetrics}
                        label="Series"
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 self-start">
                <ShareButton chartId="distribution" />
                <DownloadMenu onDownload={(scale) => downloadChart(barChartRef, getSafeFilename('bar_analysis'), scale)} />
            </div>
          </div>
          <div className="h-64" ref={barChartRef}>
            <ChartErrorBoundary>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        cursor={{ fill: '#334155', opacity: 0.4 }}
                        formatter={(value: number) => formatTooltipValue(value)}
                    />
                    {barMetrics.map((metric, idx) => (
                        <Bar 
                            key={metric} 
                            dataKey={metric} 
                            name={metric}
                            fill={COLORS[idx % COLORS.length]} 
                            radius={barMode === 'stack' ? [0,0,0,0] : [4, 4, 0, 0]}
                            stackId={barMode === 'stack' ? 'a' : undefined}
                        />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyDataMessage />
              )}
            </ChartErrorBoundary>
          </div>
        </div>
      )}

      {/* Line Chart */}
      {lineChartData && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700" id="chart-trend">
          <div className="flex justify-between items-start mb-4 gap-4">
             <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                    <h3 className="text-slate-300 font-medium">Trend Analysis</h3>
                    <div className="flex bg-slate-700/50 rounded-lg p-0.5 border border-slate-600">
                        <button 
                            onClick={() => setLineType('line')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${lineType === 'line' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Activity size={12} className="inline mr-1" />
                            Line
                        </button>
                        <button 
                            onClick={() => setLineType('area')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${lineType === 'area' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            <BoxSelect size={12} className="inline mr-1" />
                            Area
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ChartSelect 
                        value={lineCategory} 
                        options={['Row Index', ...dateColumns, ...allColumns.filter(c => !dateColumns.includes(c))]} 
                        onChange={setLineCategory} 
                        label="X Axis"
                    />
                    <MultiChartSelect 
                        selected={lineCols} 
                        options={numericColumns} 
                        onChange={setLineCols} 
                        label="Y Axis"
                    />
                </div>
             </div>
             <div className="flex items-center gap-1 self-start">
                 <ShareButton chartId="trend" />
                 <DownloadMenu onDownload={(scale) => downloadChart(lineChartRef, getSafeFilename('trend_analysis'), scale)} />
             </div>
          </div>
          <div className="h-64" ref={lineChartRef}>
            <ChartErrorBoundary>
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {lineType === 'area' ? (
                     <AreaChart data={lineChartData}>
                        <defs>
                            {COLORS.map((color, idx) => (
                                <linearGradient key={`color-${idx}`} id={`color-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                            dataKey="index" 
                            stroke="#94a3b8" 
                            tick={{fill: '#94a3b8', fontSize: 12}}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            tick={{fill: '#94a3b8', fontSize: 12}}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: number) => formatTooltipValue(value)}
                            labelFormatter={(label) => lineCategory === 'Row Index' ? `Row: ${label}` : `${lineCategory}: ${label}`}
                        />
                        {lineCols.map((col, idx) => (
                            <Area 
                                key={col}
                                type="monotone" 
                                dataKey={col} 
                                stroke={COLORS[idx % COLORS.length]} 
                                fillOpacity={1}
                                fill={`url(#color-${idx % COLORS.length})`}
                                strokeWidth={2}
                            />
                        ))}
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Brush dataKey="index" height={20} stroke="#475569" fill="#1e293b" />
                     </AreaChart>
                  ) : (
                    <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                            dataKey="index" 
                            stroke="#94a3b8" 
                            tick={{fill: '#94a3b8', fontSize: 12}}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            tick={{fill: '#94a3b8', fontSize: 12}}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: number) => formatTooltipValue(value)}
                            labelFormatter={(label) => lineCategory === 'Row Index' ? `Row: ${label}` : `${lineCategory}: ${label}`}
                        />
                        {lineCols.map((col, idx) => (
                            <Line 
                                key={col}
                                type="monotone" 
                                dataKey={col} 
                                stroke={COLORS[idx % COLORS.length]} 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }} 
                            />
                        ))}
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Brush dataKey="index" height={20} stroke="#475569" fill="#1e293b" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <EmptyDataMessage />
              )}
            </ChartErrorBoundary>
          </div>
        </div>
      )}

      {/* Pie Chart */}
      {pieChartData && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700" id="chart-composition">
           <div className="flex justify-between items-start mb-4 gap-4">
             <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-slate-300 font-medium">Composition</h3>
                    <div className="flex bg-slate-700/50 rounded-lg p-0.5 border border-slate-600">
                        <button 
                            onClick={() => setPieMode('distribution')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${pieMode === 'distribution' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Layers size={12} className="inline mr-1" />
                            Distribution
                        </button>
                        <button 
                            onClick={() => setPieMode('composition')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${pieMode === 'composition' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            <PieIcon size={12} className="inline mr-1" />
                            Values
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {pieMode === 'distribution' ? (
                        <>
                            <ChartSelect 
                                value={pieCategory} 
                                options={categoricalColumns} 
                                onChange={setPieCategory}
                                label="Group"
                            />
                            <ChartSelect 
                                value={pieValue || 'Row Count'} 
                                options={['Row Count', ...numericColumns]} 
                                onChange={(val) => setPieValue(val === 'Row Count' ? '' : val)}
                                label="Size"
                            />
                        </>
                    ) : (
                        <MultiChartSelect
                            selected={pieMetrics}
                            options={numericColumns}
                            onChange={setPieMetrics}
                            label="Columns"
                        />
                    )}
                </div>
             </div>
             <div className="flex items-center gap-1 self-start">
                 <ShareButton chartId="composition" />
                 <DownloadMenu onDownload={(scale) => downloadChart(pieChartRef, getSafeFilename('pie_analysis'), scale)} />
             </div>
           </div>
           <div className="h-64" ref={pieChartRef}>
             <ChartErrorBoundary>
               {pieChartData.data.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                        data={pieChartData.data}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {pieChartData.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                     </Pie>
                     <Tooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-slate-200">
                                        <p className="font-semibold mb-1 text-slate-400">{pieChartData.title}</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
                                            <span className="font-medium text-white">{data.name}</span>
                                        </div>
                                        <p>Value: {formatTooltipValue(Number(payload[0].value))}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.7 }} />
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <EmptyDataMessage />
               )}
             </ChartErrorBoundary>
           </div>
        </div>
      )}

      {/* Radar Chart */}
      {radarChartData && (
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700" id="chart-radar">
              <div className="flex justify-between items-start mb-4 gap-4">
                 <div className="flex flex-col gap-1 w-full">
                    <h3 className="text-slate-300 font-medium">Profile Comparison</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <ChartSelect 
                            value={radarCategory} 
                            options={categoricalColumns} 
                            onChange={setRadarCategory}
                            label="Group"
                        />
                        <MultiChartSelect 
                            selected={radarMetrics}
                            options={numericColumns} 
                            onChange={setRadarMetrics}
                            label="Variables"
                        />
                        <ChartSelect 
                            value={radarScaling} 
                            options={['Raw', 'Min-Max', 'Standard']} 
                            onChange={setRadarScaling}
                            label="Scaling"
                        />
                    </div>
                 </div>
                 <div className="flex items-center gap-1 self-start">
                     <ShareButton chartId="radar" />
                     <DownloadMenu onDownload={(scale) => downloadChart(radarChartRef, getSafeFilename('radar_profile'), scale)} />
                 </div>
              </div>
              <div className="h-64" ref={radarChartRef}>
                  <ChartErrorBoundary>
                    {radarChartData.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData.data}>
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <PolarRadiusAxis 
                                angle={30} 
                                domain={radarScaling === 'Min-Max' ? [0, 1] : radarScaling === 'Standard' ? ['auto', 'auto'] : [0, 'auto']}
                                tick={false} 
                                axisLine={false} 
                              />
                              {radarChartData.groups.map((group, idx) => (
                                  <Radar
                                      key={group}
                                      name={group}
                                      dataKey={group}
                                      stroke={COLORS[idx % COLORS.length]}
                                      fill={COLORS[idx % COLORS.length]}
                                      fillOpacity={0.3}
                                  />
                              ))}
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                                formatter={(value: number) => formatTooltipValue(value)}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyDataMessage />
                    )}
                  </ChartErrorBoundary>
              </div>
          </div>
      )}

      {/* Correlation Matrix (Unchanged visual, just re-rendered) */}
      {correlationMatrix && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 md:col-span-2 overflow-hidden relative group">
            <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg font-semibold text-white">Correlation Matrix</h3>
                <div className="group/info relative">
                    <Info size={16} className="text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-300 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        A heatmap showing Pearson correlation coefficients. 
                        <br/><br/>
                        <span className="text-emerald-400">Green</span>: Positive correlation.<br/>
                        <span className="text-red-400">Red</span>: Negative correlation.<br/>
                        Darker colors indicate stronger relationships.
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="inline-block relative min-w-full">
                    {/* Column Headers (X Axis) */}
                    <div className="flex ml-[120px] mb-2">
                        {correlationMatrix.cols.map((col, i) => (
                             <div key={col} className="w-[40px] flex justify-center items-end h-[100px] relative">
                                 <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120px] text-xs text-slate-400 truncate origin-bottom-left -rotate-45 text-right pb-1 pointer-events-none">
                                    {col}
                                 </span>
                             </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {correlationMatrix.cols.map((rowCol, i) => (
                        <div key={rowCol} className="flex items-center h-[40px] hover:bg-slate-700/30 transition-colors rounded-lg">
                            {/* Row Header (Y Axis) */}
                            <div className="w-[120px] text-right pr-4 text-xs text-slate-400 truncate" title={rowCol}>
                                {rowCol}
                            </div>
                            
                            {/* Cells */}
                            <div className="flex gap-[1px]">
                                {correlationMatrix.cols.map((colCol, j) => {
                                    const cellData = correlationMatrix.matrix.find(m => m.x === colCol && m.y === rowCol);
                                    const val = cellData?.value || 0;
                                    
                                    return (
                                        <div 
                                            key={`${rowCol}-${colCol}`}
                                            className="w-[40px] h-[40px] flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110 hover:z-10 relative cursor-default border border-slate-900/10 rounded-sm"
                                            style={{ 
                                                backgroundColor: getCorrelationColor(val), 
                                                color: Math.abs(val) > 0.5 ? 'white' : 'rgba(255,255,255,0.7)' 
                                            }}
                                            onMouseEnter={() => setHoveredCorrelationCell({ x: colCol, y: rowCol, value: val })}
                                            onMouseLeave={() => setHoveredCorrelationCell(null)}
                                        >
                                            {val === 1 ? '1.0' : val.toFixed(2).replace('0.', '.')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Tooltip */}
            {hoveredCorrelationCell && (
                <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur pointer-events-none animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="flex items-center gap-2 text-sm text-slate-300 mb-1">
                        <span className="font-semibold text-white">{hoveredCorrelationCell.x}</span>
                        <span>vs</span>
                        <span className="font-semibold text-white">{hoveredCorrelationCell.y}</span>
                    </div>
                    <div className="text-2xl font-bold font-mono" style={{ color: hoveredCorrelationCell.value > 0 ? '#34d399' : '#f87171' }}>
                        {hoveredCorrelationCell.value.toFixed(4)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Pearson Correlation</div>
                </div>
            )}
        </div>
      )}

      {/* Scatter Plot (Unchanged but needs to be in grid) */}
      {scatterConfig && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700" id="chart-correlation">
          <div className="flex justify-between items-start mb-4 gap-4">
             <div className="flex flex-col gap-1 w-full">
                <h3 className="text-slate-300 font-medium">Scatter Analysis</h3>
                <div className="flex items-center gap-2">
                    <ChartSelect 
                        value={scatterX} 
                        options={numericColumns} 
                        onChange={setScatterX}
                        label="X" 
                    />
                    <span className="text-slate-500">vs</span>
                    <ChartSelect 
                        value={scatterY} 
                        options={numericColumns} 
                        onChange={setScatterY} 
                        label="Y"
                    />
                </div>
             </div>
             <div className="flex items-center gap-1 self-start">
                 <ShareButton chartId="correlation" />
                 <DownloadMenu onDownload={(scale) => downloadChart(scatterChartRef, getSafeFilename(`scatter_${scatterConfig.x}_vs_${scatterConfig.y}`), scale)} />
             </div>
          </div>
          <div className="h-64" ref={scatterChartRef}>
            <ChartErrorBoundary>
              {scatterConfig.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={scatterConfig.x} 
                        stroke="#94a3b8" 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                    >
                        <Label value={scatterConfig.x} offset={-10} position="insideBottom" fill="#94a3b8" fontSize={12} />
                    </XAxis>
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={scatterConfig.y} 
                        stroke="#94a3b8" 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                    >
                        <Label value={scatterConfig.y} angle={-90} position="insideLeft" fill="#94a3b8" fontSize={12} style={{ textAnchor: 'middle' }} />
                    </YAxis>
                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-slate-200">
                                  <p className="font-semibold mb-1 text-slate-400">Data Point</p>
                                  <p>{`${scatterConfig.x}: ${formatTooltipValue(Number(payload[0].value))}`}</p>
                                  <p>{`${scatterConfig.y}: ${formatTooltipValue(Number(payload[1].value))}`}</p>
                                  <div className="mt-2 pt-2 border-t border-slate-700">
                                    <span className="text-slate-500">Correlation: </span>
                                    <span className={scatterConfig.correlation > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {scatterConfig.correlation.toFixed(3)}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                        }}
                    />
                    <Scatter name="Data" data={scatterConfig.data} fill="#10b981" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <EmptyDataMessage />
              )}
            </ChartErrorBoundary>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChartSection;