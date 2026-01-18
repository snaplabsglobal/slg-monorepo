import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import ExcelJS from "https://esm.sh/exceljs@4.4.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { org_id, start_date, end_date, format } = await req.json()
    
    // Auth Check (Service Role for generating Signed URLs, but usually RLS is safer. 
    // We assume the caller is authorized via Auth Header and we use it to create client, 
    // but generating 7-day signed URLs requires permission on objects bucket)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    )

    // 1. Fetch Data
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
            *,
            projects (name)
        `)
        .eq('org_id', org_id)
        .gte('transaction_date', start_date)
        .lte('transaction_date', end_date)
        .order('transaction_date', { ascending: true });

    if (error) throw error;

    if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LedgerSnap AI';
        workbook.lastModifiedBy = 'LedgerSnap AI';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Transactions Register');

        // Columns
        sheet.columns = [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Vendor', key: 'vendor', width: 25 },
            { header: 'Tax ID / BN', key: 'tax_id', width: 15 },
            { header: 'Description', key: 'desc', width: 30 },
            { header: 'Project', key: 'project', width: 20 },
            { header: 'Category', key: 'category', width: 15 }, // Need category logic if exists, usually line items. Using Main Desc for MVP
            { header: 'Net Amount', key: 'net', width: 12, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Primary Tax', key: 'tax1', width: 12, style: { numFmt: '"$"#,##0.00' } }, // GST/State
            { header: 'Secondary Tax', key: 'tax2', width: 12, style: { numFmt: '"$"#,##0.00' } }, // PST/Local
            { header: 'Total', key: 'total', width: 12, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Receipt Link', key: 'link', width: 15 }
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Populate
        for (const t of transactions) {
            // Generate Link if applicable
            let linkText = '';
            let hyperLink = '';
            
            if (t.receipt_url) {
                // Determine bucket (usually 'receipts' or 'documents')
                // Assuming t.receipt_url might be a path.
                const path = t.receipt_url; 
                // Create Signed URL (7 days = 604800 seconds)
                const { data: signData } = await supabase
                    .storage
                    .from('receipts') // Default bucket
                    .createSignedUrl(path, 604800);
                
                if (signData?.signedUrl) {
                    linkText = 'View Receipt';
                    hyperLink = signData.signedUrl;
                }
            }

            sheet.addRow({
                date: t.transaction_date,
                vendor: t.vendor_name || 'Unspecified',
                tax_id: t.tax_id || '',
                desc: t.description || '',
                project: t.projects?.name || 'Unassigned',
                category: 'Expense', // Placeholder until category logic refined
                net: (t.total_amount - (t.tax_amount || 0)),
                tax1: t.primary_tax_amount || 0,
                tax2: t.secondary_tax_amount || 0,
                total: t.total_amount,
                link: { text: linkText, hyperlink: hyperLink }
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        
        // Return Binary
        return new Response(buffer, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="LedgerSnap_Export_${start_date}_${end_date}.xlsx"`
            }
        });
    }

    return new Response(JSON.stringify({ error: "Only Excel supported in MVP" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
