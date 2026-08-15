const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const consoleMsgs = [];

  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.message));
  page.on('dialog', async dialog => {
    errors.push('DIALOG: ' + dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Upload the actual PDF
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/7fd99491e_20260805114203367.pdf');

  // Wait for PDF processing
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'test_screenshot_1.png', fullPage: false });

  // Check what got filled in
  const values = await page.evaluate(() => {
    return {
      po: document.getElementById('po-number')?.value,
      mill: document.getElementById('mill-name')?.value,
      heat1: document.getElementById('heat1')?.value,
      heat2: document.getElementById('heat2')?.value,
      beamType: document.getElementById('beam-type')?.value,
      quantity: document.getElementById('quantity')?.value,
      matType: document.getElementById('mat-type')?.value,
      specSelect: document.getElementById('spec-select')?.value,
      extractArea: document.getElementById('extract-area')?.innerHTML,
    };
  });

  console.log('=== EXTRACTED VALUES ===');
  console.log(JSON.stringify(values, null, 2));
  console.log('=== CONSOLE MESSAGES ===');
  consoleMsgs.forEach(m => console.log(m));
  console.log('=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));

  await browser.close();
})();
