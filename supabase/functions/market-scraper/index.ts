import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // In a real scenario, we would allow passing a list of SKUs or URLs.
    // Here we run a "Job" to update core items.
    
    // MOCK DATA: Simulating a fetch from Home Depot
    const scrappedData = [
        { name: 'Drywall 1/2in 4x8 Regular', price: 16.50, sku: 'DW-48-REG' }, // Price incresed
        { name: '2x4x8 SPF Dimension Lumber', price: 4.25, sku: 'LUM-248' },   // Price dropped
        { name: 'Interior Paint Eggshell 18.9L', price: 255.99, sku: 'PT-5G-EGG' } // Price increased
    ];

    const results = [];
    
    for (const item of scrappedData) {
        const { data, error } = await supabase
            .from('market_items')
            .update({ 
                price: item.price, 
                last_scraped_at: new Date().toISOString() 
            })
            .eq('sku', item.sku)
            .select();
        
        if (data) results.push(data[0]);
    }

    return new Response(
      JSON.stringify({ success: true, updated: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
