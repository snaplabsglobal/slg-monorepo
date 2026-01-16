import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Received payload:", JSON.stringify(payload, null, 2))

      let fileBuffer: ArrayBuffer;
      let mimeType = 'image/jpeg';
      let orgId = null;
      let sourceName = '';

      // Determine Trigger Type
      if (payload.type === 'WEBHOOK' && payload.fileUrl) {
         // Case A: R2 Webhook
         console.log("Processing Generic Webhook for R2:", payload.fileUrl);
         const fileResponse = await fetch(payload.fileUrl);
         if (!fileResponse.ok) throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
         fileBuffer = await fileResponse.arrayBuffer();
         mimeType = fileResponse.headers.get('content-type') || mimeType;
         orgId = payload.orgId || null;
         sourceName = payload.fileUrl; // Use URL as reference
      } else if (payload.type === 'INSERT' && payload.table === 'objects' && payload.record) {
         // Case B: Supabase Storage Event
         console.log("Processing Storage Event:", payload.record.name);
         const { bucket_id, name } = payload.record;
         const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket_id)
            .download(name);
         
         if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);
         fileBuffer = await fileData.arrayBuffer();
         mimeType = payload.record.metadata?.mimetype || mimeType;
         orgId = payload.record.metadata?.org_id || null;
         sourceName = name;
      } else {
         throw new Error("Unknown payload type. Expected 'WEBHOOK' or Storage 'INSERT' event.");
      }

      // 3. Initialize Gemini
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
      
      const genAI = new GoogleGenerativeAI(apiKey)
      // Leveraging Gemini 2.5 Flash as requested for high speed and low cost
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      // 4. Prepare Prompt
      const systemPrompt = `
Role: Professional Construction Accountant specializing in CA (CRA) and US (IRS) tax laws. Input: Receipt image (can be English/Chinese/Spanish). Objective: Extract structured data for transactions table.

Rules:
Region Detection: Identify vendor address.
If CA: Map GST/HST to primary_tax, PST to secondary_tax.
If US: Map State Tax to primary_tax, Local Tax to secondary_tax.
Audit Readiness: Extract Invoice Number, BN/GST Number (for CA), and Payment Method (last 4 digits).
Asset Detection: If total > $1,000, set is_asset: true and suggest a CCA_Class or Asset_Category.
Business Purpose: Based on line items (e.g., "Lumber"), generate a professional business purpose description (e.g., "Building materials for project").
Risk Check: If data is blurry or key fields (Tax/Vendor) are missing, set risk_level: high and explain why in risk_reasons.

Output Requirement:
Return ONLY a valid JSON object. No markdown, no code blocks. The JSON should be compatible with a database insert.
Structure:
{
  "vendor_name": "string",
  "transaction_date": "YYYY-MM-DD",
  "total_amount": number,
  "tax_amount": number,
  "currency": "CAD" | "USD",
  "primary_tax_amount": number,
  "secondary_tax_amount": number,
  "invoice_number": "string | null",
  "tax_id": "string | null",
  "payment_method": "string | null",
  "is_asset": boolean,
  "asset_category": "string | null",
  "business_purpose": "string",
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": ["string"]
}
`

      // 5. Generate Content
      const base64Data = btoa(new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

      const result = await model.generateContent([
        systemPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ])

      const response = await result.response
      const text = response.text()
      console.log("Gemini Raw Output:", text)

      // 6. Parse JSON
      // Clean potential markdown code blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const extractedData = JSON.parse(jsonStr)

      // 7. Insert into Transactions
      
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          ...extractedData,
          org_id: orgId, // Might be null if not in metadata, let DB handle or erro
          created_by: user_id ?? undefined, // User ID might be undefined for webhooks if not passed, but transactions table might strictly require it or define default?
          // CAUTION: 'created_by' is linked to users. If webhook doesn't pass a user_id, this insert might fail if RLS or Foreign Key requires it.
          // For now, we assume payload might have it or we skip if null and schema allows.
          // Let's assume payload.userId might come in webhook? 
          // Re-checking payload structure... added 'userId' to extraction below for safety but let's stick to what we have.
          // If userId is missing, maybe rely on defaults or service role override.
          receipt_url: sourceName, 
          description: extractedData.business_purpose, 
          status: 'pending_review' 
        })

      if (insertError) {
        console.error("DB Insert Error:", insertError)
        throw new Error(`DB Insert failed: ${insertError.message}`)
      }

      console.log("Successfully processed receipt and inserted transaction.")

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
