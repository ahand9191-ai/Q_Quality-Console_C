const { chromium } = require('playwright');

const files = [
  { path: 'incoming_files/e7322f56c_496386W18X65A588PO-1919770.pdf', label: 'Nucor-Yamato W18X65 A588 (beam)' },
  { path: 'incoming_files/ed52b1343_1097247L4X3X25A588WITHCVNPO-1718311.pdf', label: 'CMC Steel L4X3X.25 A709/50W (angle)' },
  { path: 'incoming_files/2a5e1d73e_1096119C8X1875A36PO-1723925.pdf', label: 'CMC Steel C8X18.75 A36/A572 (channel)' },
  { path: 'incoming_files/41b08b62d_243539PLATE375X96X240A588WITHCVNPO-1707213.pdf', label: 'Nucor Tuscaloosa Plate A588 (plate)' },
  { path: 'incoming_files/a7d1dca58_822K36240HSS10SQX375A500PO-1755673.pdf', label: 'Atlas Tube HSS10SQ A500 (HSS)' },
];

(async () => {
  const browser = await chromium.launch();

  for (const f of files) {
    const page = await browser.newPage();
    const errors = [];
    const consoleErrs = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('dialog', async d => { errors.push('DIALOG: ' + d.message()); await d.accept(); });
    page.on('console', msg => { if (msg.type() === 'error') consoleErrs.push(msg.text()); });

    console.log('\\n\\n========== ' + f.label + ' ==========');
    await page.goto('http://localhost:8899/mtr_verifier.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const fileInput = await page.$('#file-input');
    await fileInput.setInputFiles(f.path);

    // Wait for OCR to complete - poll extract-area for final status
    let done = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000);
      const statusText = await page.evaluate(() => document.getElementById('extract-area')?.innerText || '');
      if (statusText.includes('Auto-extracted') || statusText.includes('Could not') || statusText.includes('unavailable')) {
        done = true;
        console.log('Status after ' + ((i+1)*2) + 's: ' + statusText);
        break;
      }
    }
    if (!done) console.log('TIMEOUT waiting for extraction to finish');

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
        chem1: window.chem1,
        chem2: window.chem2,
      };
    });
    console.log('VALUES:', JSON.stringify(values, null, 2));
    console.log('PAGE ERRORS:', errors);
    if (consoleErrs.length) console.log('CONSOLE ERRORS:', consoleErrs);

    await page.screenshot({ path: 'test_' + f.path.split('/').pop().replace('.pdf','') + '.png' });
    await page.close();
  }

  await browser.close();
})();
