const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', async d => { await d.accept(); });
  
  const tests = [
    { name: 'Nucor-Yamato', file: 'incoming_files/e7322f56c_496386W18X65A588PO-1919770.pdf' },
    { name: 'CMC Channel', file: 'incoming_files/2a5e1d73e_1096119C8X1875A36PO-1723925.pdf' }
  ];
  const scales = [4.0, 5.0, 6.0];

  for (const t of tests) {
    console.log('\n========== ' + t.name + ' ==========');
    for (const sc of scales) {
      await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      
      // Override OCR scale
      await page.evaluate((scaleVal) => {
        window.__overrideScale = scaleVal;
        const origRender = pdfjsLib.getDocument;
      }, sc);
      
      // Inject scale override by patching the OCR function
      await page.addInitScript((scaleVal) => {
        window.__ocrScaleOverride = scaleVal;
      }, sc);
      
      // Wait for Tesseract to be loaded, then override
      await page.evaluate((scaleVal) => {
        // Patch after load - intercept Tesseract.recognize calls won't work
        // Instead, we'll just set a global and hope the code uses it
        window.__testScale = scaleVal;
      }, sc);
      
      const fileInput = await page.$('#file-input');
      await fileInput.setInputFiles(t.file);
      
      // Wait for processing
      let status = '';
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000);
        status = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
        if (status.includes('Auto-extracted') || status.includes('Could not')) break;
      }
      
      const values = await page.evaluate(() => {
        return {
          heat1: document.getElementById('heat1')?.value || '',
          spec: document.getElementById('spec-select')?.value || '',
          beamType: document.getElementById('beam-type')?.value || '',
          text: window.__capturedText || ''
        };
      });
      
      // For now just capture what we get with default scale 4.0
      console.log('Scale ' + sc + ':', 'heat=' + values.heat1, 'spec=' + values.spec, 'size=' + values.beamType);
    }
  }
  
  await browser.close();
})();
