const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf');
  
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }
  
  logs.forEach(l => { if (l.startsWith('DBG')) console.log(l); });
  const heat = await page.evaluate(() => document.getElementById('heat1').value);
  console.log('Heat1:', heat);
  
  await browser.close();
})();
