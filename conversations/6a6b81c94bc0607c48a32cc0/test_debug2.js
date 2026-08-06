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
    
    // Use addInitScript to override before page scripts load
    await page.addInitScript(() => {
      window.__rawTexts = [];
      const origParse = window.parseMtrText;
      // Use defineProperty to intercept
      Object.defineProperty(window, 'parseMtrText', {
        get: function() { return function(text, area) { window.__rawTexts.push(text); return window.__origParseMtrText.call(this, text, area); }; },
        set: function(v) { window.__origParseMtrText = v; },
        configurable: true
      });
    });
    
    await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    const fileInput = await page.$('#file-input');
    await fileInput.setInputFiles(t.file);
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
      if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
    }
    
    const rawTexts = await page.evaluate(() => window.__rawTexts || []);
    const rawText = rawTexts.length > 0 ? rawTexts[0] : '';
    var flat = rawText.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' \n ').trim().replace(/\n/g,' ').replace(/\s+/g,' ');
    flat = flat.replace(/\bAS88\b/gi,'A588').replace(/\bAS36\b/gi,'A36');
    
    console.log('\n=== ' + t.name + ' (len=' + rawText.length + ') ===');
    
    if (rawText.length === 0) {
      // Fallback: read from pageContentCache
      const cached = await page.evaluate(() => {
        var out = [];
        for (var k in window.pageContentCache) {
          var c = window.pageContentCache[k];
          if (c.type === 'ocr' && c.words) out.push(c.words.map(w=>w.str).join(' '));
          else if (c.type === 'text' && c.items) out.push(c.items.map(it=>it.str).join(' '));
        }
        return out.join('\n');
      });
      console.log('Using cache instead, len:', cached.length);
      flat = cached.replace(/\n/g,' ').replace(/\s+/g,' ');
      flat = flat.replace(/\bAS88\b/gi,'A588').replace(/\bAS36\b/gi,'A36');
    }
    
    // Search for size patterns
    console.log('--- Size ---');
    var sizeRes = [/C\d+X\d+\.?\d*/gi, /W\d+X\d+/gi, /HSS\d+/gi, /10\s*SQ/gi, /\d+\.?\d*X\d+\.?\d*X\d+\.?\d*/gi];
    for (var p of sizeRes) {
      var m;
      while ((m = p.exec(flat)) !== null) {
        console.log(m[0], 'ctx:', flat.substring(Math.max(0,m.index-15), m.index+m[0].length+10).replace(/\n/g,'|'));
      }
    }
    
    // Spec patterns
    console.log('--- Spec ---');
    [/A500/g, /A588/g, /A36/g, /A709/g, /GRADE/gi].forEach(function(sp) {
      var m;
      while ((m = sp.exec(flat)) !== null) {
        console.log(m[0], 'ctx:', flat.substring(Math.max(0,m.index-5), m.index+m[0].length+20).replace(/\n/g,'|'));
      }
    });
    
    // Numbers
    console.log('--- Numbers ---');
    var nm; var numRe = /\b(\d{6,})\b/g;
    while ((nm = numRe.exec(flat)) !== null) {
      console.log(nm[1], 'ctx:', flat.substring(Math.max(0,nm.index-15), nm.index+nm[1].length+5).replace(/\n/g,'|'));
    }
    
    // Origin
    console.log('--- Origin ---');
    var om; var originRe = /MELT|MELTED|MANUFACTUR|MADE\s*IN|USA|AMERICA/gi;
    while ((om = originRe.exec(flat)) !== null) {
      console.log(om[0], 'at', om.index, ':', flat.substring(Math.max(0,om.index-5), om.index+om[0].length+15).replace(/\n/g,'|'));
    }
    
    await page.close();
  }
  await browser.close();
})();
