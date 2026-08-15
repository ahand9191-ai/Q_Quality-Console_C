const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  
  // Override parseMtrText to debug the A588 fuzzy check
  await page.evaluate(() => {
    const orig = window.parseMtrText;
    window.parseMtrText = function(text, area) {
      var flat = text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' \n ').trim();
      flat = flat.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      
      // Check for 588
      var m588 = /\b588\b/.exec(flat);
      console.log('DBG_588_match:', m588 ? m588[0] + ' at ' + m588.index : 'NOT FOUND');
      
      // Check for PLATE
      var mPlate = /PLATE|COIL|HOT\s*ROL/i.exec(flat);
      console.log('DBG_PLATE_match:', mPlate ? mPlate[0] + ' at ' + mPlate.index : 'NOT FOUND');
      
      // Check for A588
      var mA588 = /\bA588\b/i.exec(flat);
      console.log('DBG_A588_match:', mA588 ? mA588[0] : 'NOT FOUND');
      
      // Check for GRADE
      var mGrade = /GRADE/i.exec(flat);
      console.log('DBG_GRADE_match:', mGrade ? mGrade[0] + ' at ' + mGrade.index + ': ' + flat.substring(mGrade.index, mGrade.index+40) : 'NOT FOUND');
      
      // Check for A36
      var mA36 = /\bA36\b/i.exec(flat);
      console.log('DBG_A36_match:', mA36 ? mA36[0] + ' at ' + mA36.index : 'NOT FOUND');
      
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
  
  logs.forEach(l => { if (l.startsWith('DBG')) console.log(l); });
  const spec = await page.evaluate(() => document.getElementById('spec-select').value);
  console.log('specSelect:', spec);
  
  await browser.close();
})();
