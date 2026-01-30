// ========================================
// Gemini 2.5 Flash - Receipt Analysis Implementation
// ========================================
// File: lib/gemini/receipt-analyzer.ts
// Purpose: Analyze receipt images using Google Gemini 2.5 Flash
// Database: Compatible with transactions table structure
// ========================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// ========================================
// Types and Interfaces
// ========================================

export interface ReceiptItem {
  description: string;
  quantity: number;
  price: number;
}

// Output interface matching transactions table structure
export interface ReceiptAnalysisResult {
  // Database field names (transactions table)
  vendor_name: string | null;           // maps to transactions.vendor_name
  transaction_date: string | null;      // maps to transactions.transaction_date (YYYY-MM-DD format)
  total_amount: number | null;         // maps to transactions.total_amount
  currency: string;                     // maps to transactions.currency
  tax_amount: number | null;           // maps to transactions.tax_amount
  category_user: string;                // maps to transactions.category_user
  ai_confidence: number;                 // maps to transactions.ai_confidence (0.0 to 1.0)
  
  // Additional extracted data
  items: ReceiptItem[];                 // for transaction_items table
  raw_text: string;                     // stored in raw_data JSONB
}

export interface GeminiError {
  message: string;
  code?: string;
  retryable: boolean;
}

// ========================================
// Constants
// ========================================

const GEMINI_MODEL = 'gemini-2.5-flash'; // Gemini 2.5 Flash model
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
// Prompt Template
// ========================================

const RECEIPT_ANALYSIS_PROMPT = `
You are an expert receipt analysis AI with perfect accuracy in extracting information from receipt images.

Analyze this receipt image and extract the following information in JSON format:

{
  "vendor_name": "Full business/store name as it appears on the receipt",
  "transaction_date": "Date in YYYY-MM-DD format (be careful with MM/DD vs DD/MM)",
  "total_amount": "Final total amount paid (numeric value only, e.g., 45.99)",
  "currency": "Currency code (CAD, USD, EUR, etc. - default to CAD if unclear)",
  "tax_amount": "Tax amount if clearly visible (numeric value, e.g., 5.99). Use null if not visible or included in total",
  "items": [
    {
      "description": "Item name or description",
      "quantity": 1,
      "price": 10.00
    }
  ],
  "category_user": "Best matching category from the list below",
  "ai_confidence": "Your confidence score from 0.0 to 1.0",
  "raw_text": "All visible text from the receipt"
}

**IMPORTANT INSTRUCTIONS:**

1. **Date Extraction:**
   - Look for date patterns carefully (DD/MM/YYYY or MM/DD/YYYY)
   - Use context clues (day of week, month names) to determine format
   - If ambiguous, assume MM/DD/YYYY for North American receipts
   - Convert to YYYY-MM-DD format

2. **Amount Extraction:**
   - Extract the FINAL TOTAL (after all taxes and fees)
   - Look for keywords: "TOTAL", "AMOUNT DUE", "BALANCE DUE"
   - Ignore subtotals, tax amounts, tips (unless included in total)
   - Remove currency symbols and commas, keep decimal point

3. **Vendor Name:**
   - Use the business name at the top of the receipt
   - Include the full legal name if visible
   - If unclear, use the most prominent business identifier

4. **Tax Amount:**
   - Extract tax amount if clearly separated from total
   - Look for keywords: "TAX", "GST", "HST", "PST", "VAT"
   - If tax is included in total or not visible, use null
   - Remove currency symbols and commas, keep decimal point

5. **Items:**
   - Extract individual line items if clearly visible
   - Include quantity, description, and price for each
   - If items are unclear or too many, you can leave this array empty

6. **Category Selection:**
   Choose the BEST matching category from this list:
   ${VALID_CATEGORIES.map(c => `- ${c}`).join('\n   ')}
   
   Guidelines:
   - "Food & Dining": Restaurants, cafes, grocery stores
   - "Transportation": Gas, parking, transit, rideshare
   - "Office Supplies": Stationery, printer supplies, office furniture
   - "Utilities": Electric, water, internet, phone bills
   - "Entertainment": Movies, concerts, subscriptions
   - "Healthcare": Pharmacy, medical supplies, doctor visits
   - "Travel": Hotels, flights, car rentals
   - "Shopping": Retail, clothing, electronics
   - "Professional Services": Consulting, legal, accounting
   - "Other": Anything that doesn't fit above

7. **Confidence Score (ai_confidence):**
   - 0.9-1.0: Very clear, easy to read receipt
   - 0.7-0.9: Most information clear, minor uncertainties
   - 0.5-0.7: Some fields unclear or ambiguous
   - 0.0-0.5: Poor quality image or highly uncertain

8. **Missing Information:**
   - Use null for fields that are truly unclear or missing
   - Don't guess or make up information

9. **Output Format:**
   - Return ONLY valid JSON
   - No markdown code blocks
   - No explanatory text before or after JSON
   - All string values should be properly escaped

Now analyze the receipt image below:
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
  // Normalize vendor name (maps to transactions.vendor_name)
  const vendor_name = data.vendor_name?.trim() || data.merchant_name?.trim() || null;

  // Validate and normalize date (maps to transactions.transaction_date)
  let transaction_date: string | null = null;
  if (data.transaction_date) {
    transaction_date = normalizeDate(data.transaction_date);
  } else if (data.receipt_date) {
    // Backward compatibility with old field name
    transaction_date = normalizeDate(data.receipt_date);
  }

  // Validate total amount (maps to transactions.total_amount)
  const total_amount = parseFloat(data.total_amount) || null;
  if (total_amount !== null && (total_amount < 0 || total_amount > 999999)) {
    throw new Error('Invalid total amount');
  }

  // Validate tax amount (maps to transactions.tax_amount)
  const tax_amount = data.tax_amount !== undefined && data.tax_amount !== null
    ? parseFloat(data.tax_amount)
    : null;
  if (tax_amount !== null && (tax_amount < 0 || tax_amount > 999999)) {
    throw new Error('Invalid tax amount');
  }

  // Normalize currency (maps to transactions.currency)
  const currency = (data.currency || 'CAD').toUpperCase();

  // Validate category (maps to transactions.category_user)
  let category_user = data.category_user || data.category || 'Other';
  if (!VALID_CATEGORIES.includes(category_user)) {
    console.warn(`Invalid category "${category_user}", defaulting to "Other"`);
    category_user = 'Other';
  }

  // Validate confidence (maps to transactions.ai_confidence)
  let ai_confidence = parseFloat(data.ai_confidence) || parseFloat(data.confidence) || 0.5;
  ai_confidence = Math.max(0, Math.min(1, ai_confidence)); // Clamp to [0, 1]

  // Validate items (for transaction_items table)
  const items: ReceiptItem[] = Array.isArray(data.items) 
    ? data.items.map(normalizeItem).filter(Boolean)
    : [];

  // Raw text (stored in raw_data JSONB)
  const raw_text = data.raw_text?.trim() || '';

  return {
    vendor_name,
    transaction_date,
    total_amount,
    currency,
    tax_amount,
    category_user,
    ai_confidence,
    items,
    raw_text,
  };
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
    return {
      description: item.description?.trim() || 'Unknown Item',
      quantity: parseFloat(item.quantity) || 1,
      price: parseFloat(item.price) || 0,
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
  // Gemini 2.5 Flash pricing (as of Jan 2026)
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
// Output:
// {
//   vendor_name: "Home Depot",
//   transaction_date: "2026-01-27",
//   total_amount: 123.45,
//   currency: "CAD",
//   tax_amount: 16.05,
//   category_user: "Office Supplies",
//   ai_confidence: 0.95,
//   items: [...],
//   raw_text: "..."
// }

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

// Example 5: Save to transactions table
const { data: transaction } = await supabase
  .from('transactions')
  .insert({
    organization_id: orgId,
    vendor_name: result.vendor_name,
    transaction_date: result.transaction_date,
    total_amount: result.total_amount,
    currency: result.currency,
    tax_amount: result.tax_amount,
    category_user: result.category_user,
    ai_confidence: result.ai_confidence,
    entry_source: 'ocr',
    raw_data: {
      gemini_response: result,
      raw_text: result.raw_text,
    },
  })
  .select()
  .single();

// Example 6: Save line items to transaction_items table
if (result.items.length > 0) {
  await supabase.from('transaction_items').insert(
    result.items.map(item => ({
      transaction_id: transaction.id,
      organization_id: orgId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.price,
    }))
  );
}
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
