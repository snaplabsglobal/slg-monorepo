import { GoogleGenerativeAI } from '@google/generative-ai'

// Receipt Analysis Result Interface (from existing /api/receipts/upload)
export interface ReceiptAnalysisResult {
  vendor_name: string | null
  vendor_alias: string | null
  transaction_date: string | null
  currency: string
  subtotal_cents: number
  gst_cents: number
  pst_cents: number
  total_cents: number
  gifi_code_suggested: string | null
  category: string
  items: Array<{
    description: string
    quantity: number
    price_cents: number
  }>
  is_meals_50_deductible: boolean
  is_shareholder_loan_potential: boolean
  needs_review: boolean
  confidence: {
    vendor_name: number
    date: number
    amounts: number
    tax_split: number
    overall: number
  }
  raw_text: string
}

function clamp01(n: any, fallback = 0.5) {
  const x = Number(n)
  if (Number.isNaN(x)) return fallback
  return Math.max(0, Math.min(1, x))
}

export async function analyzeReceiptWithGemini(
  imageBuffer: ArrayBuffer,
  mimeType: string
): Promise<ReceiptAnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const buffer = Buffer.from(imageBuffer)
  const imageBase64 = buffer.toString('base64')

  const prompt = `You are a professional Canadian accountant-grade receipt analysis engine specializing in British Columbia construction and renovation businesses.

Extract financial data from this receipt image with absolute precision for tax filing (CRA compliance) and GST Input Tax Credit (ITC) recovery.

Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "vendor_name": "string | null",
  "vendor_alias": "string | null",
  "transaction_date": "YYYY-MM-DD | null",
  "currency": "CAD | USD",
  "subtotal_cents": 0,
  "gst_cents": 0,
  "pst_cents": 0,
  "total_cents": 0,
  "gifi_code_suggested": "string | null",
  "category": "string",
  "items": [],
  "is_meals_50_deductible": false,
  "is_shareholder_loan_potential": false,
  "needs_review": false,
  "confidence": {
    "vendor_name": 0.0,
    "date": 0.0,
    "amounts": 0.0,
    "tax_split": 0.0,
    "overall": 0.0
  },
  "raw_text": "string"
}

CRITICAL RULES:
- ALL amounts in CENTS (integers only)
- BC receipts: GST (5%) and PST (7%) separately
- If tax unclear, set needs_review: true
- confidence.overall < 0.9 → needs_review: true
- Category: Food & Dining, Transportation, Office Supplies, Utilities, Entertainment, Healthcare, Travel, Shopping, Professional Services, Other

Now analyze the receipt image:`

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ])

    const response = await result.response
    const text = response.text()

    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\s*/g, '')
    cleanedText = cleanedText.replace(/```\s*/g, '')
    cleanedText = cleanedText.trim()

    const parsed = JSON.parse(cleanedText)

    return {
      vendor_name: parsed.vendor_name?.trim?.() || null,
      vendor_alias: parsed.vendor_alias?.trim?.() || null,
      transaction_date: parsed.transaction_date || null,
      currency: (parsed.currency || 'CAD').toUpperCase(),
      subtotal_cents: parseInt(parsed.subtotal_cents) || 0,
      gst_cents: parseInt(parsed.gst_cents) || 0,
      pst_cents: parseInt(parsed.pst_cents) || 0,
      total_cents: parseInt(parsed.total_cents) || 0,
      gifi_code_suggested: parsed.gifi_code_suggested || null,
      category: parsed.category || 'Other',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      is_meals_50_deductible: Boolean(parsed.is_meals_50_deductible),
      is_shareholder_loan_potential: Boolean(parsed.is_shareholder_loan_potential),
      needs_review: Boolean(parsed.needs_review) || clamp01(parsed.confidence?.overall) < 0.9,
      confidence: {
        vendor_name: clamp01(parsed.confidence?.vendor_name),
        date: clamp01(parsed.confidence?.date),
        amounts: clamp01(parsed.confidence?.amounts),
        tax_split: clamp01(parsed.confidence?.tax_split),
        overall: clamp01(parsed.confidence?.overall),
      },
      raw_text: parsed.raw_text || '',
    }
  } catch (error: any) {
    console.error('Gemini API error:', error)
    throw new Error(`AI analysis failed: ${error.message}`)
  }
}

