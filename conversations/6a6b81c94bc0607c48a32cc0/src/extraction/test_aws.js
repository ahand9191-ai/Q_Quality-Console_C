const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
const fs = require('fs');

async function testAWS() {
  const client = new TextractClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID_3,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const testFile = 'incoming_files/2a5e1d73e_1096119C8X1875A36PO-1723925.pdf';
  const bytes = fs.readFileSync(testFile);
  console.log(`Test PDF loaded: ${bytes.length} bytes`);
  
  try {
    const command = new DetectDocumentTextCommand({ Document: { Bytes: bytes } });
    console.log('Calling AWS Textract...');
    const response = await client.send(command);
    console.log(`✅ Textract responded! Got ${response.Blocks?.length || 0} blocks`);
    
    const textBlocks = (response.Blocks || []).filter(b => b.BlockType === 'LINE').slice(0, 15);
    textBlocks.forEach(b => console.log(`  ${b.Text}`));
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Error type:', err.name);
  }
}

testAWS();
