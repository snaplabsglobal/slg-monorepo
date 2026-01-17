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
        
        const isGeneral = project_id === 'GENERAL';
        // If GENERAL, use user's org (fetch org_id from user profile or via RPC, here we simplify)
        // Ideally we need org_id. If project is GENERAL, we might not have a simple way to get org_id without a project.
        // Assuming user belongs to one boolean org or we look up from a default project or user.
        // For MVP: Let's assume we can get org_id from the user (if we had auth context fully) or just nullable.
        
        let targetProjectId = isGeneral ? null : project_id;
        let isOverhead = isGeneral;
        
        let orgId = null;
        if (!isGeneral) {
             const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', project_id).single();
             orgId = proj?.organization_id;
        } else {
             // Fallback: Try to find any project for this user to get Org ID, or use a 'default' org.
             // This is a common issue with "General". Let's assume the user context has it, or we rely on RLS default?
             // Or we just query ANY project the user is in.
             const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user_id).limit(1).single();
             orgId = members?.organization_id;
        }

        await supabase.from('transactions').insert({
            project_id: targetProjectId,
            org_id: orgId,
            user_id: user_id,
            transaction_date: new Date().toISOString(),
            vendor_name: "Pending AI Extraction",
            total_amount: 0,
            attachment_url: image_url,
            status: 'draft',
            description: data.description,
            is_overhead: isOverhead, // <--- NEW IS_OVERHEAD FLAG
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
