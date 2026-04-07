import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

const cleanJSON = (text) => {
  const start = text.indexOf('{'); // Start of object
  const startArr = text.indexOf('['); // Start of array
  const firstMatch = (start !== -1 && (startArr === -1 || start < startArr)) ? start : startArr;
  
  const end = text.lastIndexOf('}') + 1;
  const endArr = text.lastIndexOf(']') + 1;
  const lastMatch = Math.max(end, endArr);

  if (firstMatch !== -1 && lastMatch !== -1) return text.slice(firstMatch, lastMatch);
  return text.trim().replace(/^```json\s*|\n```$/g, "");
};

// RENAME THIS TO MATCH App.jsx
export const callGeminiJSON = async (systemPrompt, userPrompt) => {
  try {
    // Gemma 3 Upgrade: Move system instructions into a conversational turn 
    // to avoid the native systemInstruction 400 error
    const contents = [
      { role: "user", parts: [{ text: `INSTRUCTIONS: ${systemPrompt}` }] },
      { role: "model", parts: [{ text: "Understood. I will provide ONLY the raw JSON requested." }] },
      { role: "user", parts: [{ text: userPrompt }] }
    ];

    const result = await model.generateContent({ contents });
    const textResponse = result.response.text();
    
    return cleanJSON(textResponse);
  } catch (error) {
    console.error("Gemma 3 API Error:", error);
    throw error;
  }
};