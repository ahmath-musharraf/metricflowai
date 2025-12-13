import React, { useState, useMemo, useEffect } from 'react';
import { Dataset } from '../types';
import { generateForecast } from '../utils/dataUtils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar, TrendingUp, Settings, AlertTriangle, ArrowRight, Zap } from 'lucide-react';

interface ForecastSectionProps {
  dataset: Dataset;
}

const ForecastSection: React.FC<ForecastSectionProps> = ({ dataset }) => {
  const [dateCol, setDateCol] = useState<string>('');
  const [metricCol, setMetricCol] = useState<string>('');
  const [horizon, setHorizon] = useState<number>(6);
  const [unit, setUnit] = useState<'Days' | 'Months' | 'Years'>('Months');

  // Identify candidate columns
  const dateColumns = useMemo(() => dataset.profile.filter(c => c.type === 'date').map(c => c.name), [dataset]);
  const numericColumns = useMemo(() => dataset.profile.filter(c => c.type === 'number').map(c => c.name), [dataset]);

  // Set defaults
  useEffect(() => {
    if (dateColumns.length > 0 && !dateCol) setDateCol(dateColumns[0]);
    if (numericColumns.length > 0 && !metricCol) setMetricCol(numericColumns[0]);
  }, [dateColumns, numericColumns]);

  const forecastData = useMemo(() => {
    if (!dateCol || !metricCol) return null;
    return generateForecast(dataset, dateCol, metricCol, horizon, unit);
  }, [dataset, dateCol, metricCol, horizon, unit]);

  if (dateColumns.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-800/30 border border-slate-700/50 rounded-xl text-center">
              <div className="p-3 bg-slate-800 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Date Columns Found</h3>
              <p className="text-slate-400 max-w-md">
                  Forecasting requires at least one date/time column in your dataset. Please ensure your CSV contains valid dates (e.g., YYYY-MM-DD).
              </p>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-white">Trend Forecasting</h2>
                <p className="text-xs text-slate-400">Predict future trends based on historical linear regression.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Controls */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl space-y-5">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/50">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-white">Configuration</span>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 font-medium block mb-1.5">Time Column</label>
                        <select 
                            value={dateCol} 
                            onChange={(e) => setDateCol(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        >
                            {dateColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 font-medium block mb-1.5">Metric to Forecast</label>
                        <select 
                            value={metricCol} 
                            onChange={(e) => setMetricCol(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        >
                            {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1.5">Horizon</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={horizon}
                                onChange={(e) => setHorizon(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                            />
                         </div>
                         <div>
                            <label className="text-xs text-slate-400 font-medium block mb-1.5">Unit</label>
                            <select 
                                value={unit} 
                                onChange={(e) => setUnit(e.target.value as any)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                            >
                                <option value="Days">Days</option>
                                <option value="Months">Months</option>
                                <option value="Years">Years</option>
                            </select>
                         </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="mt-2 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                             <Zap className="w-3 h-3 text-brand-400" />
                             <label className="text-xs text-slate-400 font-medium">Quick Predict</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={() => { setUnit('Years'); setHorizon(5); }}
                                className={`px-2 py-2 text-xs rounded-lg border transition-all ${unit === 'Years' && horizon === 5 ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300'}`}
                             >
                                5 Years
                             </button>
                             <button 
                                onClick={() => { setUnit('Years'); setHorizon(10); }}
                                className={`px-2 py-2 text-xs rounded-lg border transition-all ${unit === 'Years' && horizon === 10 ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300'}`}
                             >
                                10 Years
                             </button>
                             <button 
                                onClick={() => { setUnit('Months'); setHorizon(12); }}
                                className={`px-2 py-2 text-xs rounded-lg border transition-all ${unit === 'Months' && horizon === 12 ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300'}`}
                             >
                                12 Months
                             </button>
                             <button 
                                onClick={() => { setUnit('Months'); setHorizon(6); }}
                                className={`px-2 py-2 text-xs rounded-lg border transition-all ${unit === 'Months' && horizon === 6 ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300'}`}
                             >
                                6 Months
                             </button>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Insight
                    </h4>
                    <p className="text-xs text-blue-200/80 leading-relaxed">
                        Forecasting <strong>{horizon} {unit.toLowerCase()}</strong> ahead for <strong>{metricCol}</strong> based on historical data from <strong>{dateCol}</strong>.
                    </p>
                </div>
            </div>

            {/* Chart Area */}
            <div className="lg:col-span-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-[500px] flex flex-col">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="font-semibold text-white">Forecast Visualization</h3>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-brand-500"></span>
                                <span className="text-slate-300">Actual</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-purple-500 border border-white/20"></span>
                                <span className="text-slate-300">Forecast</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                         {forecastData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecastData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis 
                                        dataKey="displayDate" 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 12, fill: '#94a3b8'}}
                                        tickLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 12, fill: '#94a3b8'}}
                                        tickLine={false}
                                        tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                        formatter={(value: number) => [value.toLocaleString(undefined, {maximumFractionDigits: 2}), '']}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="Actual" 
                                        stroke="#0ea5e9" 
                                        strokeWidth={3} 
                                        dot={{ r: 3, fill: '#0ea5e9' }}
                                        activeDot={{ r: 6 }}
                                        connectNulls={false}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="Forecast" 
                                        stroke="#a855f7" 
                                        strokeWidth={3} 
                                        strokeDasharray="5 5"
                                        dot={{ r: 3, fill: '#a855f7' }}
                                        activeDot={{ r: 6 }}
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                 <AlertTriangle className="w-10 h-10 mb-3 opacity-50" />
                                 <p>Insufficient data to generate a forecast.</p>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ForecastSection;