export type CellValue = string | number | boolean | null;

export interface DataRow {
  [key: string]: CellValue;
}

export interface ColumnProfile {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  uniqueCount: number;
  missingCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  minDate?: string;
  maxDate?: string;
}

export interface Dataset {
  name: string;
  rows: DataRow[];
  columns: string[];
  profile: ColumnProfile[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'pie';
  xAxis: string;
  yAxis: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  chartConfig?: ChartConfig;
}

export interface QueryResponse {
  text: string;
  chartConfig?: ChartConfig;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}