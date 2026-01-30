// ========================================
// Gemini 2.0 Flash - Receipt Analysis Implementation
// ========================================
// File: lib/gemini/receipt-analyzer.ts
// Purpose: Analyze receipt images using Google Gemini 2.0 Flash
// ========================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// ========================================
// Types and Interfaces (Updated for Accounting)
// ========================================

export interface ReceiptItem {
  description: string;
  quantity: number;
  price_cents: number; // Changed to cents
}

export interface ConfidenceScores {
  vendor_name: number;
  date: number;
  amounts: number;
  tax_split: number;
  overall: number;
}

export interface ReceiptAnalysisResult {
  vendor_name: string | null;
  vendor_alias: string | null;
  receipt_date: string | null; // YYYY-MM-DD format
  currency: string;
  
  // All amounts in CENTS (integers)
  subtotal_cents: number;
  gst_cents: number;
  pst_cents: number;
  total_cents: number;
  
  // Canadian GIFI tax code
  gifi_code_suggested: string | null;
  category: string;
  
  items: ReceiptItem[];
  
  // Accounting flags
  is_meals_50_deductible: boolean;
  is_shareholder_loan_potential: boolean;
  needs_review: boolean;
  
  // Confidence scoring
  confidence: ConfidenceScores;
  
  raw_text: string;
}

export interface GeminiError {
  message: string;
  code?: string;
  retryable: boolean;
}

// ========================================
// Constants
// ========================================

const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // or 'gemini-2.0-flash-001'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Available categories (must match database categories)
const VALID_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Office Supplies',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Shopping',
  'Professional Services',
  'Other',
];

// ========================================
// Prompt Template (Optimized for BC Construction Industry)
// ========================================

const RECEIPT_ANALYSIS_PROMPT = `
You are a professional Canadian accountant-grade receipt analysis engine specializing in British Columbia construction and renovation businesses.

Your task is to extract financial data from receipt images with absolute precision for tax filing (CRA compliance) and GST Input Tax Credit (ITC) recovery.

**CRITICAL: OUTPUT REQUIREMENTS**
- Return ONLY a valid JSON object
- NO markdown code blocks (\`\`\`json)
- NO explanatory text before or after JSON
- NO conversational responses
- All string values must be properly escaped

**JSON STRUCTURE:**

{
  "vendor_name": "string | null",
  "vendor_alias": "string | null",
  "receipt_date": "YYYY-MM-DD | null",
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

**EXTRACTION RULES:**

1. **CENTS-ONLY CONSTRAINT (CRITICAL):**
   - ALL monetary amounts MUST be converted to CENTS (integer)
   - Example: $100.05 → 10005 (cents)
   - Example: $45.99 → 4599 (cents)
   - NEVER use floating point decimals (e.g., 100.05)
   - This prevents rounding errors in accounting systems

2. **BC TAX SPLIT LOGIC (CRITICAL):**
   - BC receipts have GST (5%) and PST (7%)
   - Extract GST and PST separately, in cents
   - If receipt shows "Tax" without breakdown:
     * Calculate: If total tax ≈ 12% of subtotal, likely GST + PST
     * Split: GST = 5/12 of tax, PST = 7/12 of tax
   - If tax calculation is uncertain, set "needs_review": true
   - GST is for ITC recovery - accuracy is CRITICAL

3. **VENDOR IDENTIFICATION:**
   - Extract full legal business name from receipt header
   - Create a short alias (e.g., "Home Depot #7133" → "Home Depot")
   - Common BC construction vendors:
     * Home Depot, Lowe's, Rona, Windsor Plywood
     * Burnaby Builders Supply, Emco, Andrew Sheret
     * Shell, Petro-Canada, Chevron (for vehicle expenses)

4. **GIFI CODE MAPPING (Canadian Tax Codes):**
   Based on vendor name, suggest appropriate GIFI code:
   
   Construction Materials:
   - Home Depot, Lowe's, Rona → "8320" (Materials/Supplies)
   - Lumber yards, Windsor Plywood → "8320"
   
   Vehicle Expenses:
   - Shell, Petro-Canada, Esso → "9281" (Fuel)
   - Automotive shops → "9282" (Repairs & Maintenance)
   
   Professional Services:
   - Consulting, legal, accounting → "8862"
   
   Meals & Entertainment:
   - Restaurants, cafes → "8523" (Meals - 50% deductible)
   - Set "is_meals_50_deductible": true
   
   Office Supplies:
   - Staples, Office Depot → "8810"
   
   Utilities:
   - BC Hydro → "9220"
   - Telus, Rogers → "9225" (Phone/Internet)
   
   If uncertain, use "8760" (Other Expenses)

5. **SHAREHOLDER LOAN DETECTION:**
   - If receipt is from personal vendors (restaurants, retail):
     * Set "is_shareholder_loan_potential": true
     * This flags potential personal expenses for accountant review

6. **CONFIDENCE SCORING (0.0 - 1.0):**
   Score each field independently:
   
   - vendor_name confidence:
     * 1.0: Clear business name at top
     * 0.8: Readable but slightly unclear
     * 0.5: Partially visible or ambiguous
     * 0.0: Not readable
   
   - date confidence:
     * 1.0: Clear date in standard format
     * 0.8: Date visible but format unclear (MM/DD vs DD/MM)
     * 0.5: Partially visible
     * 0.0: Not readable
   
   - amounts confidence:
     * 1.0: All amounts clearly visible and consistent
     * 0.8: Some calculations needed but numbers clear
     * 0.5: Blurry or partially obscured
     * 0.0: Not readable
   
   - tax_split confidence:
     * 1.0: GST and PST clearly labeled separately
     * 0.8: Combined "Tax" but can calculate split
     * 0.5: Tax amount unclear or inconsistent
     * 0.0: No tax information visible
   
   - overall confidence:
     * Average of all field confidences
     * If overall < 0.9, set "needs_review": true

7. **NEEDS REVIEW FLAGS:**
   Set "needs_review": true if ANY of these conditions:
   - overall confidence < 0.9
   - Image is blurry or low quality
   - Tax split is ambiguous (no clear GST/PST breakdown)
   - Total doesn't match subtotal + GST + PST (±2 cents tolerance)
   - Receipt is handwritten
   - Multiple currency symbols visible

8. **DATE FORMAT:**
   - Always return dates as YYYY-MM-DD
   - For ambiguous dates (e.g., 01/02/2024):
     * If MM/DD/YYYY format (North American): 2024-01-02
     * Use context: If day > 12, format is DD/MM/YYYY
     * Look for day-of-week to confirm
   - If date is completely unclear, return null

9. **CURRENCY:**
   - Default to "CAD" for BC receipts
   - Only use "USD" if clearly marked with $ USD or US$

10. **ITEMS EXTRACTION (Optional but helpful):**
    - Extract line items if clearly visible
    - Each item: { description, quantity, price_cents }
    - If items are unclear or receipt is too complex, leave array empty

**CATEGORY SELECTION:**
Choose from these categories:
${VALID_CATEGORIES.map(c => `- ${c}`).join('\n')}

**EXAMPLE OUTPUT:**

{
  "vendor_name": "Home Depot #7133",
  "vendor_alias": "Home Depot",
  "receipt_date": "2024-01-27",
  "currency": "CAD",
  "subtotal_cents": 4500,
  "gst_cents": 225,
  "pst_cents": 315,
  "total_cents": 5040,
  "gifi_code_suggested": "8320",
  "category": "Office Supplies",
  "items": [
    { "description": "2x4 Lumber", "quantity": 10, "price_cents": 4500 }
  ],
  "is_meals_50_deductible": false,
  "is_shareholder_loan_potential": false,
  "needs_review": false,
  "confidence": {
    "vendor_name": 1.0,
    "date": 1.0,
    "amounts": 0.95,
    "tax_split": 0.90,
    "overall": 0.96
  },
  "raw_text": "HOME DEPOT #7133\\nDate: 01/27/2024\\n..."
}

Now analyze the receipt image below with these rules:
`;

// ========================================
// Main Analysis Function
// ========================================

export async function analyzeReceipt(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ReceiptAnalysisResult> {
  // Validate inputs
  validateInputs(imageBuffer, mimeType);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  try {
    // Convert image to base64
    const imageBase64 = imageBuffer.toString('base64');

    // Call Gemini API
    const result = await model.generateContent([
      RECEIPT_ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse and validate response
    const receiptData = parseGeminiResponse(text);
    
    // Post-process and validate
    return validateAndNormalizeData(receiptData);

  } catch (error: any) {
    throw handleGeminiError(error);
  }
}

// ========================================
// Analysis with Retry Logic
// ========================================

export async function analyzeReceiptWithRetry(
  imageBuffer: Buffer,
  mimeType: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ReceiptAnalysisResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Analyzing receipt (attempt ${attempt}/${maxRetries})...`);
      return await analyzeReceipt(imageBuffer, mimeType);
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const geminiError = error as GeminiError;
      if (!geminiError.retryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Failed to analyze receipt after retries');
}

// ========================================
// Batch Analysis
// ========================================

export async function analyzeReceiptBatch(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  maxConcurrent: number = 3
): Promise<ReceiptAnalysisResult[]> {
  const results: ReceiptAnalysisResult[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < images.length; i += maxConcurrent) {
    const batch = images.slice(i, i + maxConcurrent);
    
    const batchResults = await Promise.allSettled(
      batch.map((img, idx) => 
        analyzeReceiptWithRetry(img.buffer, img.mimeType)
          .catch(error => ({ index: i + idx, error }))
      )
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value as ReceiptAnalysisResult);
      } else {
        errors.push({ index: i + idx, error: result.reason });
      }
    });
  }

  if (errors.length > 0) {
    console.warn(`Batch analysis completed with ${errors.length} errors:`, errors);
  }

  return results;
}

// ========================================
// Helper Functions
// ========================================

function validateInputs(imageBuffer: Buffer, mimeType: string): void {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  if (imageBuffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
  }

  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported image type: ${mimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
}

function parseGeminiResponse(text: string): any {
  try {
    // Clean response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    
    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    // Parse JSON
    const parsed = JSON.parse(cleanedText);
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Invalid JSON response from Gemini API');
  }
}

function validateAndNormalizeData(data: any): ReceiptAnalysisResult {
  // Normalize vendor names
  const vendor_name = data.vendor_name?.trim() || null;
  const vendor_alias = data.vendor_alias?.trim() || null;

  // Validate and normalize date
  let receipt_date: string | null = null;
  if (data.receipt_date) {
    receipt_date = normalizeDate(data.receipt_date);
  }

  // Validate currency
  const currency = (data.currency || 'CAD').toUpperCase();

  // Validate amounts (ALL in CENTS - integers only)
  const subtotal_cents = parseInt(data.subtotal_cents) || 0;
  const gst_cents = parseInt(data.gst_cents) || 0;
  const pst_cents = parseInt(data.pst_cents) || 0;
  const total_cents = parseInt(data.total_cents) || 0;

  // Validate total matches subtotal + taxes (±2 cents tolerance)
  const calculated_total = subtotal_cents + gst_cents + pst_cents;
  const needs_review_amount = Math.abs(calculated_total - total_cents) > 2;

  // Validate GIFI code format (4 digits)
  let gifi_code_suggested: string | null = data.gifi_code_suggested;
  if (gifi_code_suggested && !/^\d{4}$/.test(gifi_code_suggested)) {
    gifi_code_suggested = null;
  }

  // Validate category
  let category = data.category || 'Other';
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`Invalid category "${category}", defaulting to "Other"`);
    category = 'Other';
  }

  // Validate items (convert price to cents)
  const items: ReceiptItem[] = Array.isArray(data.items) 
    ? data.items.map(normalizeItem).filter(Boolean)
    : [];

  // Validate flags
  const is_meals_50_deductible = Boolean(data.is_meals_50_deductible);
  const is_shareholder_loan_potential = Boolean(data.is_shareholder_loan_potential);

  // Validate confidence scores
  const confidence: ConfidenceScores = {
    vendor_name: clampConfidence(data.confidence?.vendor_name),
    date: clampConfidence(data.confidence?.date),
    amounts: clampConfidence(data.confidence?.amounts),
    tax_split: clampConfidence(data.confidence?.tax_split),
    overall: clampConfidence(data.confidence?.overall),
  };

  // Determine if needs review
  const needs_review = 
    data.needs_review === true ||
    confidence.overall < 0.9 ||
    needs_review_amount ||
    (gst_cents === 0 && pst_cents === 0 && subtotal_cents > 0); // Missing tax info

  // Raw text
  const raw_text = data.raw_text?.trim() || '';

  return {
    vendor_name,
    vendor_alias,
    receipt_date,
    currency,
    subtotal_cents,
    gst_cents,
    pst_cents,
    total_cents,
    gifi_code_suggested,
    category,
    items,
    is_meals_50_deductible,
    is_shareholder_loan_potential,
    needs_review,
    confidence,
    raw_text,
  };
}

function clampConfidence(value: any): number {
  const num = parseFloat(value) || 0.5;
  return Math.max(0, Math.min(1, num));
}

function normalizeDate(dateStr: string): string | null {
  try {
    // Try to parse the date
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return null;
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function normalizeItem(item: any): ReceiptItem | null {
  try {
    // Convert price to cents if it's in dollars
    let price_cents = parseInt(item.price_cents);
    if (isNaN(price_cents) && item.price) {
      // If price is in dollars (e.g., 10.50), convert to cents
      price_cents = Math.round(parseFloat(item.price) * 100);
    }
    
    return {
      description: item.description?.trim() || 'Unknown Item',
      quantity: parseFloat(item.quantity) || 1,
      price_cents: price_cents || 0,
    };
  } catch {
    return null;
  }
}

function handleGeminiError(error: any): GeminiError {
  const message = error.message || 'Unknown Gemini API error';
  
  // Determine if error is retryable
  let retryable = false;
  let code = error.code;

  if (
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('429')
  ) {
    retryable = true;
    code = 'RATE_LIMIT';
  } else if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('ECONNRESET')
  ) {
    retryable = true;
    code = 'NETWORK_ERROR';
  } else if (
    message.includes('500') ||
    message.includes('503')
  ) {
    retryable = true;
    code = 'SERVER_ERROR';
  }

  return {
    message,
    code,
    retryable,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// Cost Estimation
// ========================================

export function estimateCost(
  imageCount: number,
  avgTokensPerImage: number = 1500 // input + output tokens
): number {
  // Gemini 2.0 Flash pricing (as of Jan 2024)
  const INPUT_COST_PER_MILLION = 0.075; // $0.075 per 1M tokens
  const OUTPUT_COST_PER_MILLION = 0.30;  // $0.30 per 1M tokens
  
  // Assume 1000 input tokens (image + prompt) + 500 output tokens
  const inputTokens = imageCount * 1000;
  const outputTokens = imageCount * 500;
  
  const inputCost = (inputTokens / 1000000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1000000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + outputCost;
}

// Example: Cost for 1000 receipts
// console.log(`Cost for 1000 receipts: $${estimateCost(1000).toFixed(4)}`);
// Output: Cost for 1000 receipts: $0.2250

// ========================================
// Usage Example
// ========================================

/*
// Example 1: Basic usage
const imageBuffer = fs.readFileSync('receipt.jpg');
const result = await analyzeReceipt(imageBuffer, 'image/jpeg');
console.log(result);

// Example 2: With retry
const resultWithRetry = await analyzeReceiptWithRetry(
  imageBuffer,
  'image/jpeg',
  3, // max retries
  1000 // initial delay (ms)
);

// Example 3: Batch processing
const images = [
  { buffer: buffer1, mimeType: 'image/jpeg' },
  { buffer: buffer2, mimeType: 'image/png' },
];
const results = await analyzeReceiptBatch(images, 3); // 3 concurrent

// Example 4: Cost estimation
const monthlyCost = estimateCost(1000); // 1000 receipts/month
console.log(`Monthly cost: $${monthlyCost.toFixed(2)}`);
*/

// ========================================
// Export
// ========================================

export default {
  analyzeReceipt,
  analyzeReceiptWithRetry,
  analyzeReceiptBatch,
  estimateCost,
};
