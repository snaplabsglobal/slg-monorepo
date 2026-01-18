import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib';

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

    const { change_order_id, project_id, signature_base64 } = await req.json()

    // 1. Fetch Details
    const { data: co, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('id', change_order_id)
        .single();
    
    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .single();

    if (coError || !project) throw new Error("Data not found");

    // 2. Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = height - 50;

    // Header
    page.drawText('CHANGE ORDER CONFIRMATION', { x: 50, y, size: 20, font: boldFont })
    y -= 30;
    page.drawText(`Project: ${project.name}`, { x: 50, y, size: 12, font })
    y -= 20;
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y, size: 12, font })
    
    y -= 40;
    page.drawText(`Change Order: ${co.title}`, { x: 50, y, size: 14, font: boldFont })
    y -= 25;
    
    // Description (Simple wrapping logic or just dump text)
    const desc = co.description || 'No description provided.';
    page.drawText(desc, { x: 50, y, size: 10, font, maxWidth: 500 })
    y -= 60;

    // Stats
    page.drawText(`Cost Impact: $${co.amount_change}`, { x: 50, y, size: 12, font: boldFont, color: rgb(0,0,0) })
    y -= 20;
    page.drawText(`Time Impact: ${co.impact_days} Days`, { x: 50, y, size: 12, font: boldFont })
    
    // Signature
    y -= 100;
    page.drawText('Approved By Client:', { x: 50, y, size: 12, font })
    
    if (signature_base64) {
        // Embed PNG
        // The base64 string likely has "data:image/png;base64," prefix, remove it
        const cleanBase64 = signature_base64.replace('data:image/png;base64,', '');
        const imageBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(imageBytes)
        const pngDims = pngImage.scale(0.5)
        
        page.drawImage(pngImage, {
            x: 50,
            y: y - 60,
            width: pngDims.width,
            height: pngDims.height,
        })
    }

    const pdfBytes = await pdfDoc.save()

    // 3. Upload to Storage
    const filePath = `${project_id}/change_orders/${change_order_id}.pdf`;
    const { error: uploadError } = await supabase
        .storage
        .from('project_files')
        .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (uploadError) console.error("Upload failed", uploadError);

    // 4. Send Email
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Change Orders <updates@ledgersnap.app>', // Update with verified domain
                to: [project.client_email || 'owner@example.com'], // Fallback
                subject: `Change Order Approved: ${co.title}`,
                html: `
                    <h1>Change Order Confirmation</h1>
                    <p>Attached is the signed confirmation for <strong>${co.title}</strong>.</p>
                    <ul>
                        <li><strong>Cost Impact:</strong> $${co.amount_change}</li>
                        <li><strong>Time Impact:</strong> ${co.impact_days} Days</li>
                    </ul>
                    <p>Thank you for moving fast!</p>
                `,
                attachments: [
                    {
                        content: Buffer.from(pdfBytes).toString('base64'),
                        filename: `ChangeOrder-${co.id.slice(0,8)}.pdf`,
                    }
                ]
            })
        });
        const emailResult = await res.json();
        console.log("Email Sent:", emailResult);
    } else {
        console.log(`[Mock Email] To: ${project.client_email} | Subject: Change Order Approved: ${co.title}`);
    }

    return new Response(
      JSON.stringify({ success: true, filePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
