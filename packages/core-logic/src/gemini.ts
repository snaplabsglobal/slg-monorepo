import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

export async function extractReceiptData(imageBase64: string) {
    if (!API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    Analyze this receipt.Extract the following details in JSON format:
    - vendor_name
        - total_amount
        - date
        - category_tax(Classify into: Materials, Labor, Fuel, Office, Meals, Other)
        - summary(Brief description)
        - currency(CAD or USD)
        - items: An array of line items, each with: { description, quantity, unit_price, amount, category }
    `;

    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
        },
    };

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        return text; // Caller should parse JSON
    } catch (error) {
        console.error('Gemini extraction failed:', error);
        throw error;
    }
}
