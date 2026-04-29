import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  apiVersion: 'v1'
});

export interface GeneratedQuestion {
  text: string;
  type: 'textarea' | 'mcq';
  options: string; // Comma separated for MCQ
}

export async function generateAIQuestions(topic: string, count: number = 5): Promise<GeneratedQuestion[]> {
  console.log("VITE_MOCK_AI value:", import.meta.env.VITE_MOCK_AI);
  // Check for Mock Mode
  if (import.meta.env.VITE_MOCK_AI === 'true') {
    await new Promise(r => setTimeout(r, 1000)); // Simulate delay
    return [
      { text: `What are the core principles of ${topic}?`, type: 'textarea', options: '' },
      { text: `Which of the following best describes ${topic}?`, type: 'mcq', options: 'Option A, Option B, Option C, Option D' },
      { text: `Explain the historical context of ${topic}.`, type: 'textarea', options: '' },
      { text: `True or False: ${topic} is widely used in modern industry.`, type: 'mcq', options: 'True, False' },
      { text: `Describe a common use case for ${topic}.`, type: 'textarea', options: '' }
    ];
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your .env file.");
  }

  const prompt = `
    Generate ${count} exam questions about: "${topic}".
    Output MUST be a valid JSON array of objects.
    Structure: [{"text": string, "type": "mcq" | "textarea", "options": "A, B, C, D"}]
    No markdown, no preamble.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    
    const text = response.text || "";
    
    // Improved JSON extraction
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI Response was not valid JSON:", text);
      throw new Error("AI returned an invalid format. Please try again.");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error?.message || "Unknown error";
    throw new Error(`AI Error: ${msg.substring(0, 100)}`);
  }
}
