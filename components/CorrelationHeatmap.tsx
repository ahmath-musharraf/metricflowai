import React, { useMemo, useState } from 'react';
import { Dataset } from '../types';
import { calculateCorrelation } from '../utils/dataUtils';
import { Info } from 'lucide-react';

interface CorrelationHeatmapProps {
  dataset: Dataset;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ dataset }) => {
  const [hoveredCell, setHoveredCell] = useState<{x: string, y: string, value: number} | null>(null);

  const numericCols = useMemo(() => 
    dataset.profile.filter(c => c.type === 'number').map(c => c.name), 
  [dataset]);

  const correlationMatrix = useMemo(() => {
    if (numericCols.length < 2) return null;
    
    // Limit to 20 columns to prevent rendering performance issues
    const colsToUse = numericCols.slice(0, 20);
    
    const matrix: { x: string, y: string, value: number }[] = [];
    
    for (let i = 0; i < colsToUse.length; i++) {
        for (let j = 0; j < colsToUse.length; j++) {
            const val = calculateCorrelation(dataset.rows, colsToUse[i], colsToUse[j]);
            matrix.push({ x: colsToUse[i], y: colsToUse[j], value: val });
        }
    }
    return { matrix, cols: colsToUse };
  }, [dataset, numericCols]);

  const getColor = (value: number) => {
      // Color interpolation: Red (-1) -> Slate (0) -> Emerald (1)
      if (value > 0) {
          // 0 to 1 mapping to Slate -> Emerald
          const intensity = Math.abs(value);
          // Simple opacity based approach or mix
          if (intensity < 0.2) return `rgba(51, 65, 85, 1)`; // Slate-700
          // Emerald 500 is #10b981 (16, 185, 129)
          // Slate 800 is #1e293b (30, 41, 59)
          return `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`;
      } else {
          // 0 to -1 mapping to Slate -> Red
          const intensity = Math.abs(value);
          if (intensity < 0.2) return `rgba(51, 65, 85, 1)`; // Slate-700
          // Red 500 is #ef4444 (239, 68, 68)
          return `rgba(239, 68, 68, ${0.1 + intensity * 0.9})`;
      }
  };

  if (!correlationMatrix || correlationMatrix.cols.length < 2) return null;

  const gridSize = correlationMatrix.cols.length;
  const cellSize = 40; // px
  
  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 overflow-hidden relative group">
        <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-white">Statistical Relationships</h3>
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
                                        style={{ backgroundColor: getColor(val), color: Math.abs(val) > 0.5 ? 'white' : 'rgba(255,255,255,0.7)' }}
                                        onMouseEnter={() => setHoveredCell({ x: colCol, y: rowCol, value: val })}
                                        onMouseLeave={() => setHoveredCell(null)}
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
        {hoveredCell && (
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 text-sm text-slate-300 mb-1">
                    <span className="font-semibold text-white">{hoveredCell.x}</span>
                    <span>vs</span>
                    <span className="font-semibold text-white">{hoveredCell.y}</span>
                </div>
                <div className="text-2xl font-bold font-mono" style={{ color: hoveredCell.value > 0 ? '#34d399' : '#f87171' }}>
                    {hoveredCell.value.toFixed(4)}
                </div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Pearson Correlation</div>
            </div>
        )}
    </div>
  );
};

export default CorrelationHeatmap;