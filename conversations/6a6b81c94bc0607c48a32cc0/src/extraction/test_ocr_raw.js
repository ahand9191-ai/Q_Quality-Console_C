const { chromium } = require('playwright');

const files = [
  { path: 'incoming_files/e7322f56c_496386W18X65A588PO-1919770.pdf', label: 'Nucor-Yamato' },
  { path: 'incoming_files/ed52b1343_1097247L4X3X25A588WITHCVNPO-1718311.pdf', label: 'CMC-angle' },
  { path: 'incoming_files/2a5e1d73e_1096119C8X1875A36PO-1723925.pdf', label: 'CMC-channel' },
  { path: 'incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf', label: 'NucorTuscaloosa-plate' },
  { path: 'incoming_files/a7d1dca58_822K36240HSS10SQX375A500PO-1755673.pdf', label: 'AtlasTube-HSS' },
];

(async () => {
  const browser = await chromium.launch();
  for (const f of files) {
    const page = await browser.newPage();
    await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    // Directly run OCR via page.evaluate to capture raw text, bypassing the parse logic
    const fileInput = await page.$('#file-input');
    await fileInput.setInputFiles(f.path);

    let rawText = null;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
      if (statusText.includes('Auto-extracted') || statusText.includes('Could not') || statusText.includes('unavailable')) {
        break;
      }
    }
    // pageContentCache holds ocr words; reconstruct rough text by reading window.pageContentCache
    rawText = await page.evaluate(() => {
      var out = [];
      for (var k in window.pageContentCache) {
        var c = window.pageContentCache[k];
        if (c.type === 'ocr' && c.words) {
          out.push(c.words.map(function(w){return w.str;}).join(' '));
        }
      }
      return out.join('\\n---PAGE BREAK---\\n');
    });

    console.log('\\n\\n===== ' + f.label + ' RAW OCR TEXT =====');
    console.log(rawText);
    await page.close();
  }
  await browser.close();
})();
