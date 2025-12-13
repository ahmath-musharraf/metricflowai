import React, { useRef, useState } from 'react';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { parseCSV } from '../utils/dataUtils';
import { Dataset } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: Dataset) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const dataset = parseCSV(text, file.name);
        onDataLoaded(dataset);
      } catch (err) {
        console.error(err);
        setError("Failed to parse CSV. Please check the file format.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6">
      <div 
        className={`
          relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-200 ease-in-out cursor-pointer
          ${isDragging 
            ? 'border-brand-400 bg-brand-900/20' 
            : 'border-slate-600 hover:border-brand-500 hover:bg-slate-800/50 bg-slate-800/20'
          }
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin mb-4"></div>
            <p className="text-slate-300 font-medium">Processing Data...</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-slate-800 rounded-full mb-4 shadow-lg border border-slate-700">
              <Upload className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Upload your CSV file
            </h3>
            <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
              Drag and drop your dataset here, or click to browse.
            </p>
            <div className="flex gap-2 items-center text-xs text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
              <FileType className="w-3 h-3" />
              <span>Supports .csv</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 w-full bg-red-900/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;