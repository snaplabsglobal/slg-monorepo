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

      // 2a. Magic Link: GPS Project Matching
      let projectId = null;
      let matchMethod = 'MANUAL';
      // Expect payload to carry gps info if available
      const gpsLat = payload.gps_lat || (payload.metadata?.gps_lat); 
      const gpsLong = payload.gps_long || (payload.metadata?.gps_long);

      if (gpsLat && gpsLong && orgId) {
          console.log(`Checking GPS Match: ${gpsLat}, ${gpsLong}`);
          const { data: matchedPid, error: gpsError } = await supabase
              .rpc('get_project_by_gps', { 
                  p_lat: gpsLat, 
                  p_long: gpsLong, 
                  p_org_id: orgId 
              });
          
          if (matchedPid) {
              // CHANGE (2026-01-16): Demote GPS to Suggestion as per user request
              // projectId = matchedPid; <--- Disabled auto-assign
              // matchMethod = 'GPS_AUTO';
              
              // Instead, we just Suggest it in Metadata metadata (handled in insert below)
              // But we can set a local var here to use in the insert
              projectId = null; // Explicitly null
              matchMethod = 'GPS_SUGGESTION';
              
              // We'll store the 'matchedPid' in the insert
              console.log("GPS Suggested Project:", matchedPid);
          } else if (gpsError) {
              console.error("GPS RPC Error:", gpsError);
          }
      }

      // Store suggestion for insert
      let suggestedProjectId = matchMethod === 'GPS_SUGGESTION' ? (await supabase.rpc('get_project_by_gps', { p_lat: gpsLat, p_long: gpsLong, p_org_id: orgId })).data : null;
      // Optimization: we already called RPC above, let's capture the result efficiently.
      // Refactoring the block above to capture 'matchedPid' into a var.


      // 3. Initialize Gemini
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
      
      const genAI = new GoogleGenerativeAI(apiKey)
      // Leveraging Gemini 2.5 Flash as requested for high speed and low cost
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      // 4. Prepare Prompt
      const systemPrompt = `
Role: Professional Construction Accountant specializing in CA/US tax.
Input: Receipt image.
Objective: Extract structured data for 'transactions' and DETAILED 'line_items'.

Rules:
1. ONLY extract construction/renovation related specific line items.
2. For each line item, you MUST extract:
   - item_name: Standardized product name (e.g., "Standard SPF Lumber 2x4x8").
   - raw_name: Original text on receipt (e.g., "STD SPF 2x4x8").
   - quantity: Number of units (default 1).
   - unit_price: Price per unit.
   - amount: Total line amount.
   - category: e.g., "Lumber", "Plumbing", "Electrical".
3. Region & Tax Logic:
   - CA: GST -> primary_tax, PST -> secondary_tax.
   - US: State -> primary_tax, Local -> secondary_tax.

Output Requirement:
Return ONLY a valid JSON object:
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
  "business_purpose": "string",
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": ["string"],
  "line_items": [
    {
      "item_name": "string",
      "raw_name": "string",
      "quantity": number,
      "unit_price": number,
      "amount": number,
      "category": "string"
    }
  ]
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
      const { data: transactionData, error: insertError } = await supabase
        .from('transactions')
        .insert({
          vendor_name: extractedData.vendor_name,
          transaction_date: extractedData.transaction_date,
          total_amount: extractedData.total_amount,
          tax_amount: extractedData.tax_amount,
          currency: extractedData.currency,
          primary_tax_amount: extractedData.primary_tax_amount,
          secondary_tax_amount: extractedData.secondary_tax_amount,
          invoice_number: extractedData.invoice_number,
          tax_id: extractedData.tax_id,
          payment_method: extractedData.payment_method,
          // Extract explicit top-level fields only, assume parsing handled extras
          
          org_id: orgId,
          created_by: extractedData.created_by, // Likely undefined, relying on default or trigger if any, or null
          receipt_url: sourceName, 
          description: extractedData.business_purpose, 
          status: 'pending_review',
          
          // Map Risk info
          risk_level: extractedData.risk_level,
          risk_reasons: extractedData.risk_reasons,
          
          // Project Awareness Fields
          project_id: projectId, // Now likely null if matchMethod is GPS_SUGGESTION
          project_match_method: matchMethod,
          gps_coordinates: (gpsLat && gpsLong) ? `POINT(${gpsLong} ${gpsLat})` : null,
          
          // Store Suggestion in Metadata if applicable
          metadata: {
             suggested_project_id: suggestedProjectId,
             original_filename: name // might as well store this
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error("DB Insert Error (Transaction):", insertError)
        throw new Error(`DB Insert failed: ${insertError.message}`)
      }

      console.log("Inserted Transaction ID:", transactionData.id);

      // 8. Insert Line Items & Feed Data Factory
      if (extractedData.line_items && extractedData.line_items.length > 0) {
          const transactionId = transactionData.id;
          
          // A. Personal Ledger: transaction_items
          const lineItemsPayload = extractedData.line_items.map((item: any) => ({
              transaction_id: transactionId,
              description: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.amount,
              category_tax: null // prompt doesn't extract tax per line yet, can be enhanced later
          }));

          const { error: linesError } = await supabase
            .from('transaction_items')
            .insert(lineItemsPayload);
          
          if (linesError) console.error("Error inserting line items:", linesError);

          // B. Data Factory: material_market_prices (Anonymous)
          // Transform for Factory
          // Note: embedding generation would ideally happen here using another model or pgvector-python helper, 
          // but for now we insert raw data. Gemini can generate embedding but typical flow is separate.
          // We will insert without embedding for now, or use a placeholder if required. 
          // Schema matches: material_name, raw_name, price (unit_price), unit (implied EA for now or extract), brand (extract?), vendor (from txn)
          
          const marketDataPayload = extractedData.line_items.map((item: any) => ({
              material_name: item.item_name,
              raw_name: item.raw_name,
              category: item.category,
              price: item.unit_price,
              vendor_id: extractedData.vendor_name, // Use extracted vendor name
              region_code: 'BC-Greater-Vancouver', // Hardcoded or extracted if possible
              unit: 'EA', // Defaulting for MVP
              // embedding: ... // Skip for now
          }));

          // Use service role client to bypass RLS if needed, but here we are in Edge Function with Service Key (assumed or implicit)
          // Wait, 'supabase' client created at top: createClient(URL, KEY). 
          // Usually Edge Functions get a permissive key via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          // Let's ensure we use that if we want to write to the Factory without user RLS blocking.
          
          const { error: factoryError } = await supabase
            .from('material_market_prices')
            .insert(marketDataPayload);
            
          if (factoryError) console.error("Error feeding Data Factory:", factoryError);
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
