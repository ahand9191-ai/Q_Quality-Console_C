const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  
  // Capture raw OCR text at different scales for Nucor-Yamato
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Patch to capture the text and scale
  let captured = { text: '', scale: 0 };
  await page.evaluate(() => {
    window.__capturedTexts = [];
    const origParse = window.parseMtrText;
    window.parseMtrText = function(text, area) {
      window.__capturedTexts.push(text);
      return origParse.call(this, text, area);
    };
  });
  
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/e7322f56c_496386W18X65A588PO-1919770.pdf');
  
  // Wait for both passes to complete (up to 60s for retry)
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const status = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (status.includes('Auto-extracted') && !status.includes('Re-scanning')) break;
  }
  await page.waitForTimeout(2000); // Extra wait for second parse
  
  const texts = await page.evaluate(() => window.__capturedTexts || []);
  console.log('Number of parse calls:', texts.length);
  
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    const flat = t.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('\n=== Pass ' + (i+1) + ' (len=' + t.length + ') ===');
    
    // Search for key patterns
    const patterns = [
      { name: 'HEAT', re: /HEAT/gi },
      { name: 'A588', re: /A588/gi },
      { name: 'A709', re: /A709/gi },
      { name: 'W18', re: /W18/gi },
      { name: '6-digit num', re: /\b\d{6,8}\b/g },
      { name: 'ASTM', re: /ASTM/gi },
    ];
    
    patterns.forEach(p => {
      const matches = [];
      let m;
      while ((m = p.re.exec(flat)) !== null) {
        const ctx = flat.substring(Math.max(0, m.index-10), m.index + m[0].length + 10);
        matches.push(m[0] + ' [' + ctx.replace(/\|/g,'') + ']');
        if (matches.length > 5) break;
      }
      if (matches.length > 0) console.log('  ' + p.name + ':', matches.join(', '));
      else console.log('  ' + p.name + ': NOT FOUND');
    });
    
    // First 200 chars
    console.log('  First 200:', flat.substring(0, 200));
  }
  
  await browser.close();
})();
