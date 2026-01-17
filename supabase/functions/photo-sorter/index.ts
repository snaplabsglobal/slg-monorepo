import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_url, project_id, caption, user_id } = await req.json();

    if (!image_url || !project_id) {
        throw new Error("Missing image_url or project_id");
    }

    // 1. Initialize Clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error("GEMINI_API_KEY missing");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Fetch Image Data for Analysis
    const imageResp = await fetch(image_url);
    const imageBuffer = await imageResp.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // 3. AI Classification Prompt
    const prompt = `
      Analyze this construction site image.
      Classify it into ONE of these types:
      - RECEIPT: An invoice, receipt, or bill of materials.
      - PROGRESS: A photo showing construction progress (walls, framing, wiring, finished work).
      - ISSUE: A photo showing damage, defects, safety hazards, or a problem requiring attention.
      - DOC: A permit, drawing, or paper document that is NOT a receipt.

      Also provide a 1-sentence description/caption.
      Also provide a JSON list of tags (e.g. ["drywall", "electrical", "leak"]).
      
      Return JSON ONLY:
      {
        "type": "RECEIPT" | "PROGRESS" | "ISSUE" | "DOC",
        "description": "...",
        "tags": ["..."]
      }
    `;

    const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType: "image/jpeg" } } // adjusting mimetype blindly, usually ok for prediction
    ]);
    const responseText = result.response.text();
    
    // Parse JSON (Gemini 1.5 is usually good at JSON, but let's scrub markdown)
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    console.log("AI Classification:", data);

    // 4. Routing Logic ("The Sorter")
    if (data.type === 'RECEIPT') {
        // Forward to Receipt Processor (or insert simple transaction for now)
        // Ideally we invoke the receipt-processor function, but for now let's just mark it.
        // Or we can invoke the receipt-processor? 
        // Let's insert into transactions as DRAFT with the image, so processor can pick it up or user can verify.
        // Actually, user instruction says "classify... then store".
        // Let's call receipt-processor logic? Or just insert into transactions?
        // Let's insert into transactions with status='pending' and type='expense'.
        // Wait, receipt-processor extracts amounts. Sorter just sorts.
        // If it's a receipt, we should probably trigger extraction.
        // For MVP speed: Insert into 'transactions' with minimal info, let a trigger or another func handle extraction?
        // OR: Just return the type to frontend? No, async upload.
        // Let's Insert into 'transactions' as a placeholder.
        
        await supabase.from('transactions').insert({
            project_id: project_id,
            org_id: (await supabase.from('projects').select('organization_id').eq('id', project_id).single()).data?.organization_id,
            user_id: user_id,
            transaction_date: new Date().toISOString(),
            vendor_name: "Pending AI Extraction",
            total_amount: 0,
            attachment_url: image_url,
            status: 'draft',
            description: data.description,
            metadata: { ai_tags: data.tags, sorted_by: 'photo-sorter' }
        });

    } else if (data.type === 'ISSUE') {
        await supabase.from('project_issues').insert({
            project_id: project_id,
            image_url: image_url,
            description: caption || data.description,
            severity: 'NORMAL',
            status: 'OPEN',
            ai_analysis: data,
            created_by: user_id
        });
    } else {
        // PROGRESS or DOC or Default
        await supabase.from('project_media').insert({
            project_id: project_id,
            url: image_url,
            type: data.type,
            caption: caption || data.description,
            ai_tags: data.tags,
            created_by: user_id
        });
    }

    return new Response(JSON.stringify({ success: true, classification: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
