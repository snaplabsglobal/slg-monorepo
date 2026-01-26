import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { raw_vendor_name, organization_id, transaction_id } =
      await req.json();

    if (!raw_vendor_name || !organization_id) {
      throw new Error("raw_vendor_name and organization_id are required");
    }

    // ============================================
    // Step 1: Try Database Lookup (Exact/Fuzzy Match)
    // ============================================
    const { data: dbSuggestion, error: dbError } = await supabase.rpc(
      "get_vendor_standardization_suggestion",
      {
        p_organization_id: organization_id,
        p_raw_vendor_name: raw_vendor_name,
      }
    );

    if (dbError) {
      console.error("DB lookup error:", dbError);
    }

    // If we found a match with high confidence, use it
    if (dbSuggestion && dbSuggestion.length > 0) {
      const suggestion = dbSuggestion[0];
      if (
        suggestion.method === "exact_match" ||
        (suggestion.method === "fuzzy_match" &&
          suggestion.confidence_score > 0.9)
      ) {
        // Log the standardization
        await supabase.from("vendor_standardization_log").insert({
          organization_id,
          transaction_id: transaction_id || null,
          raw_vendor_name,
          standardized_name: suggestion.standardized_name,
          vendor_alias_id: suggestion.vendor_alias_id,
          standardization_method: suggestion.method,
          confidence_score: suggestion.confidence_score,
          user_action: "accepted", // Auto-accepted
        });

        return new Response(
          JSON.stringify({
            standardized_name: suggestion.standardized_name,
            confidence_score: suggestion.confidence_score,
            method: suggestion.method,
            vendor_alias_id: suggestion.vendor_alias_id,
            auto_accepted: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ============================================
    // Step 2: Use Gemini 2.5 Flash for ML Suggestion
    // ============================================
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Get existing vendor aliases for context
    const { data: existingVendors } = await supabase
      .from("vendor_aliases")
      .select("resolved_name, alias")
      .eq("organization_id", organization_id)
      .limit(50); // Get top 50 for context

    const vendorContext = existingVendors
      ? existingVendors
          .map((v) => `- "${v.alias}" → "${v.resolved_name}"`)
          .join("\n")
      : "";

    const prompt = `
You are a vendor name standardization assistant for a construction/renovation business.

Task: Standardize the vendor name "${raw_vendor_name}" to a clean, professional business name.

Rules:
1. Remove common suffixes: "Inc.", "Ltd.", "LLC", "Corp", "Corporation", etc.
2. Remove location suffixes if redundant: "Vancouver", "BC", etc. (unless it's part of the brand)
3. Normalize spacing and capitalization
4. Use the standard business name if known
5. Keep it concise (max 50 characters)

${vendorContext ? `Existing vendor mappings in this organization:\n${vendorContext}\n\nTry to match the style and format of existing vendors.` : ""}

Return ONLY a JSON object:
{
  "standardized_name": "string",
  "confidence": 0.0-1.0,
  "alternatives": ["string"], // Up to 3 alternative names
  "reasoning": "string" // Brief explanation
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const mlSuggestion = JSON.parse(jsonStr);

    // ============================================
    // Step 3: Log the ML Suggestion
    // ============================================
    const { data: logEntry, error: logError } = await supabase
      .from("vendor_standardization_log")
      .insert({
        organization_id,
        transaction_id: transaction_id || null,
        raw_vendor_name,
        standardized_name: mlSuggestion.standardized_name,
        standardization_method: "ml_suggestion",
        confidence_score: mlSuggestion.confidence,
        ml_suggestion: {
          alternatives: mlSuggestion.alternatives,
          reasoning: mlSuggestion.reasoning,
        },
        ml_model_version: "gemini-2.5-flash",
        user_action: "pending", // Waiting for user approval
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging standardization:", logError);
    }

    return new Response(
      JSON.stringify({
        standardized_name: mlSuggestion.standardized_name,
        confidence_score: mlSuggestion.confidence,
        method: "ml_suggestion",
        alternatives: mlSuggestion.alternatives,
        reasoning: mlSuggestion.reasoning,
        log_id: logEntry?.id,
        auto_accepted: false, // Requires user approval
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Vendor standardizer error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
