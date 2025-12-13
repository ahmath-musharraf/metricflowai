import React, { useState, useMemo } from 'react';
import { Dataset } from '../types';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface DataPreviewProps {
  dataset: Dataset;
}

const PAGE_SIZE = 10;

const DataPreview: React.FC<DataPreviewProps> = ({ dataset }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return dataset.rows;
    
    const lowerTerm = searchTerm.toLowerCase();
    return dataset.rows.filter(row => 
        Object.values(row).some(val => 
            String(val).toLowerCase().includes(lowerTerm)
        )
    );
  }, [dataset.rows, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  // Reset page when search changes
  useMemo(() => setCurrentPage(0), [searchTerm]);

  const paginatedData = filteredData.slice(
    currentPage * PAGE_SIZE, 
    (currentPage + 1) * PAGE_SIZE
  );

  return (
    <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/30">
        <div>
            <h3 className="text-white font-medium">Data Preview</h3>
            <p className="text-xs text-slate-400">
                {filteredData.length.toLocaleString()} rows found &bull; {dataset.columns.length} columns
            </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search data..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-48 bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
            </div>
            
            <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0 || totalPages === 0}
                    className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 font-mono whitespace-nowrap min-w-[60px] text-center">
                    {totalPages === 0 ? '0 / 0' : `${currentPage + 1} / ${totalPages}`}
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 relative">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
            <tr>
              {dataset.columns.map((col) => (
                <th key={col} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-slate-700">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    {dataset.columns.map((col) => (
                    <td key={`${idx}-${col}`} className="px-4 py-2.5 whitespace-nowrap max-w-[200px] truncate">
                        {row[col] === null ? <span className="text-slate-600 italic">null</span> : String(row[col])}
                    </td>
                    ))}
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={dataset.columns.length} className="px-4 py-12 text-center text-slate-500 italic">
                        No matching records found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataPreview;