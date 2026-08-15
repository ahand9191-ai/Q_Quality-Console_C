const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  // Add debug hook to see what parseMtrText receives
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  
  // Override parseMtrText to capture the flat text
  await page.evaluate(() => {
    const orig = window.parseMtrText;
    window.parseMtrText = function(text, area) {
      window.debugFlatText = text;
      console.log('DEBUG_TEXT_LENGTH:', text.length);
      // Search for 243539
      var idx = text.indexOf('243539');
      console.log('DEBUG_243539_FOUND:', idx);
      if (idx !== -1) {
        console.log('DEBUG_243539_CONTEXT:', text.substring(Math.max(0, idx-30), idx+30).replace(/\n/g,'|'));
      }
      // Search for 243539-01 pattern
      var m = text.match(/(\d{6})\s*-\s*0\d/);
      if (m) console.log('DEBUG_HEAT_PATTERN:', m[0], m[1]);
      else console.log('DEBUG_HEAT_PATTERN: NOT FOUND');
      return orig.call(this, text, area);
    };
  });
  
  const fileInput = await page.$('#file-input');
  await fileInput.setInputFiles('incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf');
  
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
    if (statusText.includes('Auto-extracted') || statusText.includes('Could not')) break;
  }
  
  const heatVal = await page.evaluate(() => document.getElementById('heat1').value);
  console.log('Heat1 value:', heatVal);
  
  // Print relevant console logs
  logs.forEach(l => { if (l.startsWith('DEBUG_')) console.log(l); });
  
  await browser.close();
})();
