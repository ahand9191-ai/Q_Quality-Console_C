const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('dialog', async d => { await d.accept(); });

  // Use CMC angle (best extraction result)
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/ed52b1343_1097247L4X3X25A588WITHCVNPO-1718311.pdf');

  // Wait for OCR
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }

  // Make sure highlights are visible
  await page.evaluate(() => {
    if (!window.hlVisible) toggleHighlights();
    // Make sure all chips are active
    document.querySelectorAll('.hl-chip').forEach(c => c.classList.add('active'));
    if (window.drawHL) drawHL();
  });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test_cmc_angle_highlights.png', fullPage: false });
  console.log('Errors:', errors);

  await browser.close();
})();
