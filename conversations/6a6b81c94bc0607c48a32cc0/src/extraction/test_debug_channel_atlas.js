const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  const tests = [
    { name: 'CMC Channel', file: 'incoming_files/2a5e1d73e_1096119C8X1875A36PO-1723925.pdf' },
    { name: 'Atlas Tube', file: 'incoming_files/a7d1dca58_822K36240HSS10SQX375A500PO-1755673.pdf' }
  ];

  for (const t of tests) {
    const page = await browser.newPage();
    page.on('dialog', async d => { await d.accept(); });
    
    let rawText = '';
    await page.evaluate(() => {
      const orig = window.parseMtrText;
      window.parseMtrText = function(text, area) {
        window.__rawText = text;
        return orig.call(this, text, area);
      };
    });
    
    await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const fileInput = await page.$('#file-input');
    await fileInput.setInputFiles(t.file);
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
      if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
    }
    
    rawText = await page.evaluate(() => window.__rawText || '');
    var flat = rawText.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' \n ').trim().replace(/\n/g,' ').replace(/\s+/g,' ');
    // OCR corrections
    flat = flat.replace(/\bAS88\b/gi,'A588').replace(/\bAS36\b/gi,'A36');
    
    console.log('\n=== ' + t.name + ' ===');
    console.log('Text length:', rawText.length);
    
    // Search for size patterns
    console.log('--- Size patterns ---');
    var sizePatterns = [
      { re: /C\d+X\d+\.?\d*/gi, name: 'C-channel' },
      { re: /W\d+X\d+/gi, name: 'W-beam' },
      { re: /\d+X\d+X\d+\/?\d*/gi, name: 'angle/HSS' },
      { re: /HSS\d+/gi, name: 'HSS' },
      { re: /\d+\.?\d*X\d+\.?\d*/gi, name: 'generic X' },
      { re: /10\s*SQ/gi, name: '10SQ' }
    ];
    for (var p of sizePatterns) {
      var m;
      while ((m = p.re.exec(flat)) !== null) {
        var ctx = flat.substring(Math.max(0,m.index-20), m.index+m[0].length+10);
        console.log(p.name + ':', m[0], 'ctx:', ctx.replace(/\n/g,'|'));
      }
    }
    
    // Search for spec/grade
    console.log('--- Spec patterns ---');
    var specPatterns = [/A500/gi, /A588/gi, /A36/gi, /A709/gi, /GRADE/gi, /A992/gi];
    for (var sp of specPatterns) {
      var m;
      while ((m = sp.exec(flat)) !== null) {
        console.log(m[0], 'at', m.index, ':', flat.substring(Math.max(0,m.index-10), m.index+m[0].length+20).replace(/\n/g,'|'));
      }
    }
    
    // Search for heat numbers (6-7 digits)
    console.log('--- Numbers (6+ digits) ---');
    var numRe = /\b(\d{6,})\b/g;
    var nm;
    while ((nm = numRe.exec(flat)) !== null) {
      console.log('NUM', nm[1], 'ctx:', flat.substring(Math.max(0,nm.index-20), nm.index+nm[1].length+5).replace(/\n/g,'|'));
    }
    
    // Made in / origin
    console.log('--- Origin ---');
    var originRe = /MELT|MELTED|MANUFACTUR|MADE\s*IN|USA|AMERICA/gi;
    var om;
    while ((om = originRe.exec(flat)) !== null) {
      console.log(om[0], 'at', om.index, ':', flat.substring(Math.max(0,om.index-5), om.index+om[0].length+15).replace(/\n/g,'|'));
    }
    
    await page.close();
  }
  await browser.close();
})();
