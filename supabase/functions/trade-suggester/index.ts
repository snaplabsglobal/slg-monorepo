import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trade_name } = await req.json()
    if (!trade_name) throw new Error("trade_name is required");

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `
      Act as a construction inventory expert.
      Generate a list of the 10 most common consumable stock items for a "${trade_name}".
      These should be items a ${trade_name} would typically keep in their van or warehouse.
      
      Return ONLY a JSON array of objects with this structure:
      {
        "name": "Item Name",
        "unit": "Unit (ea, ft, box, roll, gal, lb)",
        "default_price": Number (Estimated Cost in USD)
      }
    `;

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const items = JSON.parse(jsonStr)

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
