const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  const tests = [
    { name: 'Nucor Tuscaloosa', file: 'incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf' },
    { name: 'Atlas Tube', file: 'incoming_files/a7d1dca58_822K36240HSS10SQX375A500PO-1755673.pdf' },
    { name: 'Nucor-Yamato', file: 'incoming_files/e7322f56c_496386W18X65A588PO-1919770.pdf' }
  ];

  for (const t of tests) {
    const page = await browser.newPage();
    page.on('dialog', async d => { await d.accept(); });
    await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const fileInput = await page.$('#file-input');
    await fileInput.setInputFiles(t.file);
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
      if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
    }
    const rawText = await page.evaluate(() => {
      var out = [];
      for (var k in window.pageContentCache) {
        var c = window.pageContentCache[k];
        if (c.type === 'ocr' && c.words) out.push(c.words.map(w=>w.str).join(' '));
        else if (c.type === 'text' && c.items) out.push(c.items.map(it=>it.str).join(' '));
      }
      return out.join('\n---PAGE---\n');
    });
    
    console.log('\n=== ' + t.name + ' ===');
    // Find HEAT/SLAB/LOAD occurrences
    var re = /HEAT|SLAB|LOAD|ORDER|MATERIAL/gi;
    var m;
    while ((m = re.exec(rawText)) !== null) {
      console.log(m[0].toUpperCase() + ' at', m.index, ':', rawText.substring(Math.max(0,m.index-5), m.index+50).replace(/\n/g,' '));
    }
    // Find 6-7 digit numbers
    console.log('--- Numbers ---');
    var numRe = /\b(\d{6,7})\b/g;
    var nm;
    while ((nm = numRe.exec(rawText)) !== null) {
      var ctx = rawText.substring(Math.max(0,nm.index-20), nm.index+nm[1].length+5);
      console.log('NUM', nm[1], 'ctx:', ctx.replace(/\n/g,' '));
    }
    await page.close();
  }
  await browser.close();
})();
