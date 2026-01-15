import { createClient } from 'npm:@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    console.log('Processing record:', record)

    if (!record || !record.name || !record.bucket_id) {
       // Handle manual test invocation or unexpected payload
       // For now, if no record, return error or mock
       throw new Error('No record found in payload')
    }
    
    // 1. Setup Clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // 2. Get User Language & Organization Context
    // We need to find the organization this user belongs to or owns to determine jurisdiction
    const { data: profile } = await supabase
      .from('profiles')
      .select('language_code')
      .eq('id', record.owner) 
      .single()
    
    // Fetch Organization Country Code
    // First try to find org where user is owner, fallback to member. 
    // Simplified: Find org owned by user.
    const { data: org } = await supabase
      .from('organizations')
      .select('id, country_code, region_code')
      .eq('owner_id', record.owner)
      .single()

    const lang = profile?.language_code || 'en'
    const country = org?.country_code || 'CA'
    const region = org?.region_code || 'BC'
    
    // 3. Download Image
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(record.bucket_id)
      .download(record.name)

    if (downloadError) throw downloadError

    // 4. Prepare for Gemini (Convert to base64)
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Image = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

    // 5. Construct Prompt
    let taxInstructions = `Focus on BC Tax Rules: GST (5%) and PST (7%).`
    if (country === 'US') {
        taxInstructions = `This is a US-based receipt. Extract Sales Tax and identify potential 1099 contractor expenses.`
    }

    const prompt = `
      Please analyze this receipt image and extract the following transaction details into a strict JSON format.
      The user's preferred language is "${lang}".
      Jurisdiction: ${country}-${region}.
      
      Required Fields (32 total):
      - vendor_name (string)
      - total_amount (number)
      - currency (string, e.g., 'CAD' or 'USD')
      - date (YYYY-MM-DD)
      - category (string, infer from content)
      - subtotal (number)
      - gst (number, 5% if in BC and applicable, extract exact amount if visible. If US, use 0)
      - pst (number, 7% if in BC and applicable, extract exact amount if visible. If US, use 0)
      - sales_tax (number, use this for US Sales Tax or combined tax if not split)
      - tip (number)
      - transaction_id (string, receipt number)
      - merchant_address (string)
      - payment_method (string)
      - time (HH:MM)
      - items (array of objects with name, quantity, price)
      - summary (string, short description in ${lang})
      - is_expense (boolean, true for receipts)
      - is_contractor_expense (boolean, true if likely a service requiring 1099/T5018)
      - confidence (number, 0-1)
      
      ... (Include other relevant standard fields)

      ${taxInstructions}
      If text isn't clear, estimate confidence lower.
      
      Output ONLY raw JSON. No markdown formatting.
    `

    // 6. Call Gemini
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: record.content_type || 'image/jpeg' } }
    ])
    const response = await result.response
    const text = response.text()
    
    // Clean markdown from response
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const extractedData = JSON.parse(jsonStr)

    // 7. Upsert to Transactions Table
    // We assume the object ID or path maps to a transaction, OR we create a new one.
    // The user requirement said "Update the record status... update to public.transactions".
    // Usually we insert a NEW transaction or update an existing one created by the UI.
    // Let's assume we insert a new one if not exists, or matches by some ID.
    // For now, we'll insert a new record linked to the file.
    
    const transactionData = {
      org_id: (await supabase.from('organizations').select('id').eq('owner_id', record.owner).single()).data?.id, // Basic inference
      user_id: record.owner, // from storage object
      receipt_url: record.name, // or public URL
      vendor: extractedData.vendor_name,
      amount: extractedData.total_amount,
      currency: extractedData.currency,
      date: extractedData.date,
      gst_amount: extractedData.gst,
      pst_amount: extractedData.pst,
      gl_category: extractedData.category,
      description: extractedData.summary,
      status: 'needs_review',
      ai_confidence: extractedData.confidence,
      metadata: extractedData // store full extraction
    }

    const { error: dbError } = await supabase
      .from('transactions')
      .insert(transactionData)

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true, data: extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error(error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
