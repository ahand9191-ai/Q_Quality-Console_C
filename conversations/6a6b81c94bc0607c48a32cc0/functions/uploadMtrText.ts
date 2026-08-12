import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Create MtrRecord with raw text — triggers extraction workflow
    const record = await base44.asServiceRole.entities.MtrRecord.create({
      rawText: body.rawText || '',
      fileName: body.fileName || '',
      fileUrl: body.fileUrl || '',
      extractionStatus: 'pending',
      uploadedDate: new Date().toISOString()
    });

    return new Response(JSON.stringify({ id: record.id, status: 'pending' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
