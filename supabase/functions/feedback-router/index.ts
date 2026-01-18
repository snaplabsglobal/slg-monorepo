import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
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
    const { message, audio_base64, context_url, user_id } = await req.json()
    
    // Initialize Clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service Role to write even if anon
    )
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
    const discordUrl = Deno.env.get('DISCORD_FEEDBACK_WEBHOOK')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // 1. Process Input (Transcription & Sentiment)
    let transcript = message || "";
    let sentimentScore = 5;
    let isUrgent = false;
    let tags = [];

    if (audio_base64) {
         // Multimodal Prompt: Transcribe + Analyze + Tag
         const prompt = `
             You are a customer support AI.
             1. Transcribe the audio exactly (it may be English, Mandarin, or Cantonese).
             2. Analyze the sentiment (1 = Happy, 10 = Furious/Rage).
             3. Flag 'urgent' if user is clearly angry, shouting, or reporting a breakage.
             4. Extract TAGS based on content, e.g. ["#UI", "#Bug", "#Feature", "#Account"].
             
             Return ONLY JSON: { "transcription": "...", "sentiment": number, "is_urgent": boolean, "tags": string[] }
         `;
         
         const result = await model.generateContent([
             prompt,
             { inlineData: { data: audio_base64, mimeType: "audio/webm" } } // WebM from MediaRecorder
         ]);
         const analysis = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
         
         transcript = analysis.transcription;
         sentimentScore = analysis.sentiment;
         isUrgent = analysis.is_urgent;
         tags = analysis.tags || [];
    } else {
         // Text Analysis
         const prompt = `
             Analyze this user feedback: "${transcript}"
             Determine sentiment (1=Happy, 10=Furious) and urgency.
             Extract TAGS (e.g. ["#UI", "#Bug", "#Feature"]).
             Return ONLY JSON: { "sentiment": number, "is_urgent": boolean, "tags": string[] }
         `;
         const result = await model.generateContent(prompt);
         const analysis = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
         sentimentScore = analysis.sentiment;
         isUrgent = analysis.is_urgent;
         tags = analysis.tags || [];
    }

    // 2. Generate Reply
    const replyPrompt = `
        User said: "${transcript}"
        Context: They are using a construction management app.
        Sentiment: ${sentimentScore}/10 (Urgent: ${isUrgent})
        
        Generate a short, helpful, and empathetic response. 
        If they are angry, be apologetic and assure them a human is notified.
        If they are asking a question, try to answer or acknowledge.
        Max 2 sentences.
    `;
    const replyResult = await model.generateContent(replyPrompt);
    const aiReply = replyResult.response.text();

    // 3. Save to DB
    const { data: record, error } = await supabase.from('user_feedback').insert({
        user_id,
        context_url,
        message: message, // Original text if provided
        transcription: transcript, // Or transcription
        sentiment_score: sentimentScore,
        is_urgent: isUrgent,
        tags: tags,
        ai_response: aiReply,
        status: 'new'
    }).select().single();

    if (error) console.error("DB Error:", error);

    // 4. Send to Discord (Fire and Forget)
    if (discordUrl) {
        const color = isUrgent ? 15158332 : 3066993; // Red or Green
        const payload = {
            username: "Jarvis Feedback",
            embeds: [{
                title: isUrgent ? "🚨 RAGE ALERT" : "New Feedback",
                description: transcript,
                color: color,
                fields: [
                    { name: "Sentiment", value: `${sentimentScore}/10`, inline: true },
                    { name: "Context", value: context_url || "Unknown", inline: true },
                    { name: "User", value: user_id || "Anon", inline: true }
                ]
            }]
        };
        fetch(discordUrl, { method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} });
    }

    return new Response(JSON.stringify({ 
        reply: aiReply,
        transcription: transcript,
        is_urgent: isUrgent
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
