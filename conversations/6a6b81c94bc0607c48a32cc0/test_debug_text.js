const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  
  // Capture the raw OCR text
  await page.evaluate(() => {
    window.__captureText = '';
    const origParse = window.parseMtrText;
    window.parseMtrText = function(text, area) {
      window.__captureText = text;
      return origParse.call(this, text, area);
    };
  });
  
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf');
  
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }
  
  const rawText = await page.evaluate(() => window.__captureText || '');
  // Print first 600 chars to see the spec area
  console.log('=== RAW OCR TEXT (first 600 chars) ===');
  console.log(rawText.substring(0, 600));
  console.log('\n=== AROUND POSITION 380-460 ===');
  console.log(rawText.substring(380, 460));
  console.log('\n=== SEARCH FOR 588 OR A588 ===');
  console.log('588 found at:', rawText.indexOf('588'));
  console.log('A588 found at:', rawText.indexOf('A588'));
  console.log('a588 found at:', rawText.indexOf('a588'));
  // Check for garbled versions
  console.log('58 found at:', rawText.indexOf('58'));
  console.log('88 found at:', rawText.indexOf('88'));
  console.log('A242 found at:', rawText.indexOf('A242'));
  console.log('A242 context:', rawText.substring(Math.max(0, rawText.indexOf('A242')-30), rawText.indexOf('A242')+30).replace(/\n/g,'|'));
  
  await browser.close();
})();
