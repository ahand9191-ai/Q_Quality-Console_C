const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  
  let parseText = '';
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  
  // Override parseMtrText to capture the text
  await page.evaluate(() => {
    const orig = window.__origParseMtrText || window.parseMtrText;
    window.__origParseMtrText = orig;
    window.parseMtrText = function(text, area) {
      window.__capturedText = text;
      return orig.call(this, text, area);
    };
  });
  
  await page.waitForTimeout(300);
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf');
  
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }
  
  const text = await page.evaluate(() => window.__capturedText || '');
  const flat = text.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' \n ').trim().replace(/\n/g,' ').replace(/\s+/g,' ')
    .replace(/\bAS88\b/gi,'A588').replace(/\bAS36\b/gi,'A36');
  
  console.log('Text length:', text.length);
  console.log('Flat length:', flat.length);
  
  // Search for origin keywords
  const patterns = ['MELTED', 'MANUFACTUR', 'MADE IN', 'BUY AMER', 'USA', 'AMERICA', 'MELT'];
  patterns.forEach(p => {
    const idx = flat.toUpperCase().indexOf(p);
    if (idx !== -1) {
      console.log(p, 'found at', idx, ':', flat.substring(Math.max(0,idx-10), idx+30).replace(/\n/g,'|'));
    } else {
      console.log(p, 'NOT FOUND');
    }
  });
  
  // Also check word list directly
  const wordText = await page.evaluate(() => {
    var out = [];
    for (var k in window.pageContentCache) {
      var c = window.pageContentCache[k];
      if (c.type === 'ocr' && c.words) out.push(c.words.map(w=>w.str).join(' '));
    }
    return out.join(' ');
  });
  console.log('\nWord text length:', wordText.length);
  const buyIdx = wordText.toUpperCase().indexOf('BUY AMER');
  console.log('BUY AMER in word text:', buyIdx);
  if (buyIdx !== -1) {
    console.log('Context:', wordText.substring(Math.max(0,buyIdx-10), buyIdx+30));
  }
  
  await browser.close();
})();
