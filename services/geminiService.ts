import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Dataset, QueryResponse } from "../types";
import { getDatasetSummaryForAI } from "../utils/dataUtils";

// Helper to retrieve API key from env (injected) or localStorage (manual)
const getApiKey = (): string | null => {
  return process.env.API_KEY || localStorage.getItem('gemini_api_key') || null;
};

export const analyzeDataset = async (dataset: Dataset, model: string = 'gemini-2.5-flash'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please log in or set up your API key.");

  const ai = new GoogleGenAI({ apiKey });

  const dataSummary = getDatasetSummaryForAI(dataset);
  
  const prompt = `
    You are an expert Data Analyst capable of understanding English, Tamil, Arabic, and Sinhala.
    I have a dataset with the following structure and sample data:
    
    \`\`\`json
    ${dataSummary}
    \`\`\`
    
    Please provide a comprehensive analysis of this dataset.
    
    **Language Instruction:**
    Analyze the content of the data. If the data content is primarily in Arabic, Tamil, or Sinhala, generate the analysis in that language. Otherwise, use English.

    1. **Executive Summary**: A brief overview of what this data represents.
    2. **Key Insights**: Identify trends, correlations, or interesting patterns based on the statistics provided.
    3. **Data Quality**: Comment on missing values or potential anomalies.
    4. **Recommendations**: What deeper questions should I ask about this data?
    
    Format your response in clean Markdown. Use bolding and lists for readability. Keep it professional but accessible.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.4, // Lower temperature for more analytical/factual responses
      }
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

const renderChartTool: FunctionDeclaration = {
    name: "render_chart",
    description: "Visualizes data by rendering a chart. Use this when the user asks to 'show', 'plot', 'graph', or 'visualize' data, or when a chart would answer the question better than text.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        chartType: { 
            type: Type.STRING, 
            enum: ["bar", "line", "scatter", "pie"],
            description: "The best chart type for the data." 
        },
        xAxis: { type: Type.STRING, description: "Name of the column for the X-axis (categories or time)." },
        yAxis: { type: Type.STRING, description: "Name of the column for the Y-axis (values). Must be a numeric column." },
        title: { type: Type.STRING, description: "A descriptive title for the chart." }
      },
      required: ["chartType", "xAxis", "yAxis"]
    }
};

export const queryDataset = async (dataset: Dataset, question: string, chatHistory: {role: string, content: string}[] = [], model: string = 'gemini-2.5-flash'): Promise<QueryResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please log in.");

  const ai = new GoogleGenAI({ apiKey });

  const dataSummary = getDatasetSummaryForAI(dataset);
  const columnsList = dataset.profile.map(p => `- ${p.name} (${p.type})`).join('\n');
  
  const systemContext = `
    You are a helpful Data Assistant capable of chatting in English, Tamil, Arabic, and Sinhala. 
    You are analyzing the following dataset:
    
    **Columns & Types:**
    ${columnsList}

    **Detailed Stats & Sample:**
    ${dataSummary}
    
    **Instructions:**
    1. Answer the user's question in the language they used to ask it (English, Tamil, Arabic, or Sinhala).
    2. If the user asks for a visualization (chart, plot, graph), or if the answer involves comparing numeric values across categories, USE the 'render_chart' tool.
    3. Otherwise, provide a text answer based strictly on the stats.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: 'user', parts: [{ text: systemContext }] },
        ...chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: question }] }
      ],
      config: {
        tools: [{ functionDeclarations: [renderChartTool] }],
      }
    });

    const functionCall = response.functionCalls?.[0];
    const text = response.text || "";

    if (functionCall && functionCall.name === "render_chart") {
        const args = functionCall.args as any;
        return {
            text: text || `I've created a ${args.chartType} chart for you.`,
            chartConfig: {
                type: args.chartType,
                xAxis: args.xAxis,
                yAxis: args.yAxis,
                title: args.title
            }
        };
    }

    return { text: text || "I couldn't generate an answer." };
  } catch (error) {
    console.error("Query Error:", error);
    return { text: "Sorry, I encountered an error processing your request." };
  }
};
