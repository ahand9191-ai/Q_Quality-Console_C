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
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const record = await base44.asServiceRole.entities.MtrRecord.get(id);

    return new Response(JSON.stringify({
      id: record.id,
      extractionStatus: record.data?.extractionStatus || 'pending',
      extractedData: record.data?.extractedData || null,
      fileName: record.data?.fileName || '',
      poNumber: record.data?.poNumber || '',
      heatNumber: record.data?.heatNumber || '',
      specification: record.data?.specification || '',
      materialType: record.data?.materialType || '',
      countryOfOrigin: record.data?.countryOfOrigin || ''
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
