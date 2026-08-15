const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });

  // CMC angle
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/ed52b1343_1097247L4X3X25A588WITHCVNPO-1718311.pdf');

  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }

  // Get raw OCR text
  const rawText = await page.evaluate(() => {
    var out = [];
    for (var k in window.pageContentCache) {
      var c = window.pageContentCache[k];
      if (c.type === 'ocr' && c.words) {
        out.push(c.words.map(function(w){return w.str;}).join(' '));
      } else if (c.type === 'text' && c.items) {
        out.push(c.items.map(function(it){return it.str;}).join(' '));
      }
    }
    return out.join('\n---PAGE---\n');
  });

  // Find GRADE in the text
  var gradeIdx = rawText.search(/GRADE/i);
  console.log('GRADE found at index:', gradeIdx);
  if (gradeIdx !== -1) {
    console.log('Context around GRADE:', rawText.substring(Math.max(0, gradeIdx-20), gradeIdx + 80));
  }

  // Find all "GRADE" occurrences
  var re = /GRADE/gi;
  var m;
  while ((m = re.exec(rawText)) !== null) {
    console.log('GRADE at', m.index, ':', rawText.substring(m.index, m.index + 60).replace(/\n/g,' '));
  }

  // Also check specSelect value
  const specVal = await page.evaluate(() => document.getElementById('spec-select')?.value);
  console.log('specSelect value:', specVal);

  await browser.close();
})();
