import { Dataset, ColumnProfile, DataRow, CellValue, ChartConfig } from '../types';

// Robust CSV Line Parser
const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      // Check for escaped quote ""
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const parseCSV = (csvText: string, fileName: string): Dataset => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) throw new Error("File is empty");

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Clean up values
    const rowData: DataRow = {};
    headers.forEach((header, index) => {
      let val: string | undefined = values[index];
      
      // Attempt type conversion
      if (!val) {
        rowData[header] = null;
      } else {
        // Remove surrounding quotes if somehow missed (though parser handles it usually)
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        
        const numVal = Number(val);
        if (!isNaN(numVal) && val.trim() !== '') {
            rowData[header] = numVal;
        } else if (val.toLowerCase() === 'true') {
            rowData[header] = true;
        } else if (val.toLowerCase() === 'false') {
            rowData[header] = false;
        } else {
            rowData[header] = val;
        }
      }
    });
    rows.push(rowData);
  }

  // Generate Profile
  const profile: ColumnProfile[] = headers.map(header => {
    const values = rows.map(r => r[header]);
    const definedValues = values.filter(v => v !== null && v !== undefined);
    
    // Determine type based on majority
    const numCount = definedValues.filter(v => typeof v === 'number').length;
    const isNumeric = numCount > definedValues.length * 0.8; // 80% threshold

    const uniqueSet = new Set(definedValues.map(v => String(v)));
    
    let stats: Partial<ColumnProfile> = {};
    let colType: 'string' | 'number' | 'boolean' | 'date' = 'string';
    
    if (isNumeric) {
      colType = 'number';
      const numbers = definedValues.filter(v => typeof v === 'number') as number[];
      if (numbers.length > 0) {
        numbers.sort((a, b) => a - b);
        stats.min = numbers[0];
        stats.max = numbers[numbers.length - 1];
        const sum = numbers.reduce((a, b) => a + b, 0);
        stats.mean = sum / numbers.length;
        stats.median = numbers[Math.floor(numbers.length / 2)];
      }
    } else {
      // Check for Date
      // Only check strings that are long enough to be a date (e.g. 2020-01-01) and not just simple numbers
      const dateCandidates = definedValues.filter(v => {
          if (typeof v !== 'string') return false;
          if (v.length < 6) return false; 
          const timestamp = Date.parse(v);
          return !isNaN(timestamp);
      });

      if (dateCandidates.length > definedValues.length * 0.8) {
        colType = 'date';
        const timestamps = dateCandidates.map(v => Date.parse(String(v))).sort((a, b) => a - b);
        if (timestamps.length > 0) {
           stats.minDate = new Date(timestamps[0]).toISOString();
           stats.maxDate = new Date(timestamps[timestamps.length - 1]).toISOString();
        }
      }
    }

    return {
      name: header,
      type: colType,
      uniqueCount: uniqueSet.size,
      missingCount: values.length - definedValues.length,
      ...stats
    };
  });

  return {
    name: fileName,
    rows,
    columns: headers,
    profile
  };
};

export const getDatasetSummaryForAI = (dataset: Dataset): string => {
  const summary = {
    totalRows: dataset.rows.length,
    columns: dataset.profile.map(p => ({
      name: p.name,
      type: p.type,
      uniqueValues: p.uniqueCount,
      missingValues: p.missingCount,
      stats: p.type === 'number' ? {
        min: p.min,
        max: p.max,
        mean: p.mean?.toFixed(2),
        median: p.median
      } : p.type === 'date' ? {
        min: p.minDate,
        max: p.maxDate
      } : undefined
    })),
    sampleData: dataset.rows.slice(0, 5) // Send top 5 rows
  };
  return JSON.stringify(summary, null, 2);
};

export const convertDatasetToCSV = (dataset: Dataset): string => {
  const escape = (val: CellValue): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // If value contains comma, quote or newline, wrap in quotes and escape double quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = dataset.columns.map(escape).join(',');
  const rows = dataset.rows.map(row => 
    dataset.columns.map(col => escape(row[col])).join(',')
  ).join('\n');

  return `${headers}\n${rows}`;
};

export const convertDatasetToJSON = (dataset: Dataset): string => {
  return JSON.stringify(dataset.rows, null, 2);
};

// Helper to extract top metrics for dashboard
export const generateKeyMetrics = (dataset: Dataset) => {
  const numericCols = dataset.profile.filter(c => c.type === 'number');
  
  // Multilingual Priority Keywords
  // English: Revenue, Sales, Cost, Price, Total, Score, Age, Year
  // Arabic: دخل/إيرادات (Revenue), مبيعات (Sales), تكلفة (Cost), سعر (Price), مجموع (Total), نقاط (Score), عمر (Age), سنة (Year)
  // Tamil: வருவாய் (Revenue), விற்பனை (Sales), செலவு (Cost), விலை (Price), மொத்தம் (Total), மதிப்பெண் (Score), வயது (Age), ஆண்டு (Year)
  // Sinhala: ආදායම (Revenue), විකුණුම් (Sales), පිරිවැය (Cost), මිල (Price), එකතුව (Total), ලකුණු (Score), වයස (Age), වර්ෂය (Year)

  const priorityKeywords = [
      // English
      'revenue', 'sales', 'amount', 'price', 'cost', 'total', 'score', 'rating', 'age', 'year',
      // Arabic
      'دخل', 'إيرادات', 'مبيعات', 'تكلفة', 'سعر', 'مجموع', 'إجمالي', 'كمية', 'قيمة', 'نقاط', 'تقييم', 'درجة', 'عمر', 'سنة', 'عام',
      // Tamil
      'வருவாய்', 'விற்பனை', 'செலவு', 'விலை', 'மொத்தம்', 'தொகை', 'மதிப்பெண்', 'தரவரிசை', 'வயது', 'ஆண்டு', 'வருடம்',
      // Sinhala
      'ආදායම', 'විකුණුම්', 'පිරිවැය', 'වියදම', 'මිල', 'එකතුව', 'මුළු', 'ලකුණු', 'ශ්‍රේණිගත', 'වයස', 'වර්ෂය', 'අවුරුද්ද'
  ];
  
  const sortedCols = [...numericCols].sort((a, b) => {
    const aIndex = priorityKeywords.findIndex(k => a.name.toLowerCase().includes(k));
    const bIndex = priorityKeywords.findIndex(k => b.name.toLowerCase().includes(k));
    
    // If both matches, priority by keyword order
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // If one matches, it comes first
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // Otherwise, default order (usually file order)
    return 0;
  });

  // Take top 4 relevant columns
  return sortedCols.slice(0, 4).map(col => {
    // Check if column name implies it should be summed
    const sumKeywords = [
        'revenue', 'sales', 'cost', 'total', 'amount',
        'مبيعات', 'إيرادات', 'مجموع', 'إجمالي',
        'வருவாய்', 'விற்பனை', 'மொத்தம்',
        'ආදායම', 'විකුණුම්', 'එකතුව'
    ];
    
    const isSummable = sumKeywords.some(k => col.name.toLowerCase().includes(k));
    
    let value = 0;
    let label = '';

    if (isSummable) {
       // Calculate Sum
       const sum = dataset.rows.reduce((acc, row) => acc + (Number(row[col.name]) || 0), 0);
       value = sum;
       label = `${col.name}`; // Simple label, allow UI to handle prefix if needed or just use col name
    } else {
       // Use Mean
       value = col.mean || 0;
       label = `Avg ${col.name}`;
    }

    // Format
    let formattedValue = '';
    if (value > 1000000) {
        formattedValue = `${(value / 1000000).toFixed(1)}M`;
    } else if (value > 1000) {
        formattedValue = `${(value / 1000).toFixed(1)}K`;
    } else {
        formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }

    return {
        id: col.name,
        label,
        value: formattedValue
    };
  });
};

// Helper to calculate Pearson correlation coefficient
export const calculateCorrelation = (rows: DataRow[], xCol: string, yCol: string): number => {
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  let n = 0;

  for (const row of rows) {
    const x = Number(row[xCol]);
    const y = Number(row[yCol]);
    
    if (!isNaN(x) && !isNaN(y)) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
      n++;
    }
  }

  if (n === 0) return 0;

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

// Aggregator for charts
export const prepareChartData = (dataset: Dataset, config: ChartConfig) => {
    const { type, xAxis, yAxis } = config;
    
    // Safety check
    if (!dataset.columns.includes(xAxis) || !dataset.columns.includes(yAxis)) return [];

    if (type === 'scatter') {
        // No aggregation needed, just mapping
        return dataset.rows
            .map(row => ({
                [xAxis]: row[xAxis],
                [yAxis]: Number(row[yAxis]) || 0,
            }))
            .slice(0, 500); // Limit points
    }

    // For Bar, Line, Pie -> Aggregate by X
    const aggregated: Record<string, number> = {};
    
    dataset.rows.forEach(row => {
        const xVal = String(row[xAxis] || 'Unknown');
        const yVal = Number(row[yAxis]) || 0;
        
        if (aggregated[xVal] === undefined) {
            aggregated[xVal] = 0;
        }
        aggregated[xVal] += yVal;
    });

    // Convert to array
    const result = Object.entries(aggregated)
        .map(([x, y]) => ({ [xAxis]: x, [yAxis]: y }));

    // Sort
    if (type === 'line') {
        // Try to sort by date or logic if possible, otherwise by index
        // Simple alphanumeric sort for line charts often makes sense for dates
        result.sort((a, b) => String(a[xAxis]).localeCompare(String(b[xAxis])));
    } else {
        // For bar/pie, sort by value descending
        result.sort((a, b) => (Number(b[yAxis]) || 0) - (Number(a[yAxis]) || 0));
    }

    return result.slice(0, 20); // Top 20 for readability
};

export const generateForecast = (dataset: Dataset, dateCol: string, valueCol: string, period: number, unit: 'Days' | 'Months' | 'Years') => {
  const dateIndex = dataset.columns.indexOf(dateCol);
  const valIndex = dataset.columns.indexOf(valueCol);
  
  if (dateIndex === -1 || valIndex === -1) return null;

  // Extract valid pairs
  const raw = dataset.rows
    .map(r => {
      const d = new Date(String(r[dateCol]));
      const v = Number(r[valueCol]);
      return { d, v };
    })
    .filter(item => !isNaN(item.d.getTime()) && !isNaN(item.v));

  if (raw.length < 2) return null;
  
  // Sort
  raw.sort((a, b) => a.d.getTime() - b.d.getTime());

  // Aggregate
  const grouped = new Map<string, { sum: number, count: number }>();
  
  raw.forEach(({d, v}) => {
    let key = '';
    if (unit === 'Years') key = `${d.getFullYear()}-01-01`; 
    else if (unit === 'Months') key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
    else key = d.toISOString().split('T')[0];
    
    const curr = grouped.get(key) || { sum: 0, count: 0 };
    curr.sum += v;
    curr.count += 1;
    grouped.set(key, curr);
  });

  const timeSeries = Array.from(grouped.entries()).map(([k, v]) => ({
     date: new Date(k),
     timestamp: new Date(k).getTime(),
     value: v.sum // Sum aggregation
  })).sort((a, b) => a.timestamp - b.timestamp);

  if (timeSeries.length < 2) return null;

  // Linear Regression
  const n = timeSeries.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  const startX = timeSeries[0].timestamp;
  
  timeSeries.forEach(p => {
      const x = (p.timestamp - startX) / (1000 * 3600 * 24); // days normalized
      sumX += x;
      sumY += p.value;
      sumXY += x * p.value;
      sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate Data
  const chartData = timeSeries.map(p => ({
      date: p.date,
      displayDate: unit === 'Years' ? p.date.getFullYear().toString() : p.date.toLocaleDateString(),
      Actual: p.value,
      Forecast: null as number | null
  }));

  // Create connector point
  const lastPoint = timeSeries[timeSeries.length - 1];
  chartData[chartData.length - 1].Forecast = lastPoint.value; // Connect forecast to last actual
  
  const futurePoints = [];
  let currentDate = new Date(lastPoint.date);
  
  for(let i=1; i<=period; i++) {
     if (unit === 'Years') currentDate.setFullYear(currentDate.getFullYear() + 1);
     else if (unit === 'Months') currentDate.setMonth(currentDate.getMonth() + 1);
     else currentDate.setDate(currentDate.getDate() + 1);
     
     const xNorm = (currentDate.getTime() - startX) / (1000 * 3600 * 24);
     const yPred = slope * xNorm + intercept;
     
     futurePoints.push({
         date: new Date(currentDate),
         displayDate: unit === 'Years' ? currentDate.getFullYear().toString() : currentDate.toLocaleDateString(),
         Actual: null,
         Forecast: Math.max(0, yPred) // Simple floor at 0
     });
  }

  return [...chartData, ...futurePoints];
};