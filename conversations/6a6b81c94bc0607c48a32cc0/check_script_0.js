
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===== SPEC DATABASE =====
var SPECS = {
  'A588-A709-50W':{name:'ASTM A588 Gr B / A709 Gr 50W',weathering:true,elements:{C:{min:null,max:0.19,label:'Carbon'},Mn:{min:0.80,max:1.25,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:0.15,max:0.40,label:'Silicon'},Cu:{min:0.20,max:0.50,label:'Copper'},Ni:{min:null,max:0.50,label:'Nickel'},Cr:{min:0.40,max:0.70,label:'Chromium'},V:{min:0.01,max:0.10,label:'Vanadium'},Mo:{min:null,max:0.06,label:'Molybdenum'},Nb:{min:null,max:0.03,label:'Niobium'}}},
  'A709-50W':{name:'ASTM A709 Gr 50W',weathering:true,elements:{C:{min:null,max:0.19,label:'Carbon'},Mn:{min:0.80,max:1.25,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:0.15,max:0.40,label:'Silicon'},Cu:{min:0.20,max:0.50,label:'Copper'},Ni:{min:null,max:0.50,label:'Nickel'},Cr:{min:0.40,max:0.70,label:'Chromium'},V:{min:0.01,max:0.10,label:'Vanadium'},Mo:{min:null,max:0.06,label:'Molybdenum'},Nb:{min:null,max:0.03,label:'Niobium'}}},
  'A588':{name:'ASTM A588 Gr B',weathering:true,elements:{C:{min:null,max:0.20,label:'Carbon'},Mn:{min:0.75,max:1.35,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:0.15,max:0.50,label:'Silicon'},Cu:{min:0.20,max:0.50,label:'Copper'},Ni:{min:null,max:0.50,label:'Nickel'},Cr:{min:0.40,max:0.70,label:'Chromium'},V:{min:0.01,max:0.10,label:'Vanadium'}}},
  'A992':{name:'ASTM A992',elements:{C:{min:null,max:0.23,label:'Carbon'},Mn:{min:null,max:1.35,label:'Manganese'},P:{min:null,max:0.025,label:'Phosphorus'},S:{min:null,max:0.035,label:'Sulfur'},Si:{min:null,max:0.40,label:'Silicon'},Cu:{min:null,max:0.60,label:'Copper'},Ni:{min:null,max:0.45,label:'Nickel'},Cr:{min:null,max:0.35,label:'Chromium'},Mo:{min:null,max:0.15,label:'Molybdenum'},V:{min:null,max:0.05,label:'Vanadium'},Nb:{min:null,max:0.05,label:'Niobium'}}},
  'A572-50':{name:'ASTM A572 Gr 50',elements:{C:{min:null,max:0.23,label:'Carbon'},Mn:{min:null,max:1.35,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:null,max:0.40,label:'Silicon'}}},
  'A709-50':{name:'ASTM A709 Gr 50',elements:{C:{min:null,max:0.23,label:'Carbon'},Mn:{min:null,max:1.35,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:null,max:0.40,label:'Silicon'}}},
  'A36':{name:'ASTM A36',elements:{C:{min:null,max:0.26,label:'Carbon'},Mn:{min:null,max:1.20,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:null,max:0.40,label:'Silicon'},Cu:{min:0.20,max:null,label:'Copper (when spec.)'}}},
  'A500-B':{name:'ASTM A500 Gr B (HSS)',elements:{C:{min:null,max:0.22,label:'Carbon'},Mn:{min:null,max:1.20,label:'Manganese'},P:{min:null,max:0.045,label:'Phosphorus'},S:{min:null,max:0.045,label:'Sulfur'},Cu:{min:0.18,max:null,label:'Copper (when spec.)'}}},
  'A500-C':{name:'ASTM A500 Gr C (HSS)',elements:{C:{min:null,max:0.23,label:'Carbon'},Mn:{min:null,max:1.35,label:'Manganese'},P:{min:null,max:0.045,label:'Phosphorus'},S:{min:null,max:0.045,label:'Sulfur'},Cu:{min:0.18,max:null,label:'Copper (when spec.)'}}},
  'A53-B':{name:'ASTM A53 Gr B (Pipe)',elements:{C:{min:null,max:0.30,label:'Carbon'},Mn:{min:null,max:1.20,label:'Manganese'},P:{min:null,max:0.050,label:'Phosphorus'},S:{min:null,max:0.045,label:'Sulfur'},Cu:{min:0.20,max:null,label:'Copper (when spec.)'}}},
  'A106-B':{name:'ASTM A106 Gr B (Pipe)',elements:{C:{min:null,max:0.30,label:'Carbon'},Mn:{min:0.29,max:1.06,label:'Manganese'},P:{min:null,max:0.035,label:'Phosphorus'},S:{min:null,max:0.035,label:'Sulfur'},Si:{min:0.10,max:0.30,label:'Silicon'},Cr:{min:null,max:0.40,label:'Chromium'},Cu:{min:null,max:0.40,label:'Copper'},Mo:{min:null,max:0.15,label:'Molybdenum'},V:{min:null,max:0.08,label:'Vanadium'}}},
  'A653-50':{name:'ASTM A653 SS Gr 50',elements:{C:{min:null,max:0.20,label:'Carbon'},Mn:{min:null,max:1.20,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.040,label:'Sulfur'}}},
  'A653-80':{name:'ASTM A653 SS Gr 80',elements:{C:{min:null,max:0.20,label:'Carbon'},Mn:{min:null,max:1.65,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.040,label:'Sulfur'}}},
  'A108-1018':{name:'ASTM A108 Gr 1018',elements:{C:{min:0.15,max:0.20,label:'Carbon'},Mn:{min:0.60,max:0.90,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'},Si:{min:null,max:0.30,label:'Silicon'}}},
  'F1554-36':{name:'ASTM F1554 Gr 36',elements:{C:{min:null,max:0.26,label:'Carbon'},Mn:{min:0.60,max:0.90,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'}}},
  'F1554-55':{name:'ASTM F1554 Gr 55',elements:{C:{min:null,max:0.27,label:'Carbon'},Mn:{min:0.60,max:0.90,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'}}},
  'F1554-105':{name:'ASTM F1554 Gr 105',elements:{C:{min:null,max:0.28,label:'Carbon'},Mn:{min:0.60,max:0.90,label:'Manganese'},P:{min:null,max:0.040,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'}}},
  'A325':{name:'ASTM A325 (Bolt)',elements:{C:{min:0.20,max:0.55,label:'Carbon'},Mn:{min:0.20,max:0.50,label:'Manganese'},P:{min:null,max:0.060,label:'Phosphorus'},S:{min:null,max:0.050,label:'Sulfur'}}},
  'A490':{name:'ASTM A490 (Bolt)',elements:{C:{min:0.28,max:0.48,label:'Carbon'},Mn:{min:0.50,max:1.20,label:'Manganese'},P:{min:null,max:0.030,label:'Phosphorus'},S:{min:null,max:0.040,label:'Sulfur'},Si:{min:0.15,max:0.30,label:'Silicon'}}}
};
var MAT_SPECS = {beam:['A992','A572-50','A36','A588-A709-50W','A709-50W','A588','A709-50'],channel:['A36','A572-50','A588-A709-50W','A709-50W','A588','A709-50'],angle:['A36','A572-50','A588-A709-50W','A709-50W','A588','A709-50'],flatbar:['A36','A572-50','A588-A709-50W','A588','A709-50W'],plate:['A36','A572-50','A588-A709-50W','A709-50W','A588','A709-50'],decking:['A653-50','A653-80'],'hss-round':['A500-B','A500-C'],'hss-square':['A500-B','A500-C'],pipe:['A53-B','A106-B'],'round-bar':['A36','A108-1018'],sheet:['A653-50','A653-80'],'square-bar':['A36','A572-50'],studs:['A108-1018'],bearings:['A588-A709-50W','A709-50W','A36','A572-50'],hardware:['F1554-36','F1554-55','F1554-105','A325','A490']};
var MAT_LABELS = {beam:'Beam Designation (e.g. W24x76)',channel:'Size (e.g. C12x25)',angle:'Size (e.g. L4x4x1/2)',flatbar:'Size (e.g. 1/2 x 4)',plate:'Thickness x Width x Length',decking:'Type (e.g. 1.5B 22ga)','hss-round':'Size (e.g. HSS 6x0.500)','hss-square':'Size (e.g. HSS 6x6x0.500)',pipe:'Size (e.g. 6in Sch 40)','round-bar':'Diameter (e.g. 1-1/2in)',sheet:'Thickness x Width x Length','square-bar':'Size (e.g. 1x1)',studs:'Size (e.g. 3/4 x 6)',bearings:'Type',hardware:'Type (e.g. A325 3/4 bolt)'};
var THICK_LABELS = {beam:'Flange Thickness (in)',channel:'Web Thickness (in)',angle:'Leg Thickness (in)',flatbar:'Thickness (in)',plate:'Plate Thickness (in)',decking:'Gauge / Thickness','hss-round':'Wall Thickness (in)','hss-square':'Wall Thickness (in)',pipe:'Wall Thickness (in)','round-bar':'Diameter (in)',sheet:'Thickness (in)','square-bar':'Bar Size (in)',studs:'Stud Diameter (in)',bearings:'Thickness (in)',hardware:'Bolt Diameter (in)'};
var D11_CAT_A=[{t:0.125,p:32},{t:0.25,p:32},{t:0.5,p:32},{t:0.75,p:32},{t:1.5,p:50},{t:2.5,p:150},{t:999,p:225}];
var D11_CAT_B=[{t:0.125,p:32},{t:0.25,p:32},{t:0.5,p:50},{t:0.75,p:50},{t:1.5,p:150},{t:2.5,p:225},{t:999,p:300}];
var D15_NONFCM=[{t:0.75,p:70,l:'Up to 3/4"'},{t:1.5,p:70,l:'3/4" to 1-1/2"'},{t:2.5,p:150,l:'1-1/2" to 2-1/2"'},{t:999,p:200,l:'Over 2-1/2"'}];
var D15_FCM=[{t:0.375,p:70,l:'Up to 3/8"'},{t:0.75,p:100,l:'3/8" to 3/4"'},{t:1.5,p:150,l:'3/4" to 1-1/2"'},{t:2.5,p:200,l:'1-1/2" to 2-1/2"'},{t:999,p:300,l:'Over 2-1/2"'}];
var CVN_REQ={1:{t:70,e:15},2:{t:40,e:15},3:{t:10,e:15}};
var CVN_FCM={1:{t:70,e:25,s:20},2:{t:40,e:25,s:20},3:{t:10,e:25,s:20}};

var pdfDoc=null,curPage=1,scale=1.5,hlVisible=true,chem1={},chem2={},approvalState=null,fileName='',currentStep=1;

// ===== WORKFLOW STEPS =====
function setStep(n) {
  currentStep = n;
  document.querySelectorAll('.step').forEach(function(s,i) {
    s.classList.toggle('active', i+1===n);
    s.classList.toggle('done', i+1<n);
  });
  document.getElementById('sec-step2').classList.toggle('locked', n<2);
  document.getElementById('sec-step2b').classList.toggle('locked', n<2);
  document.getElementById('sec-step3').classList.toggle('locked', n<3);
  if (n>=2) document.getElementById('btn-chem').disabled = false;
  if (n===3) document.getElementById('review-date').value = new Date().toISOString().split('T')[0];
}

// ===== MATERIAL / SPECS =====
function onMaterialChange() {
  var mat = document.getElementById('mat-type').value;
  var specs = MAT_SPECS[mat] || [];
  var sel = document.getElementById('spec-select');
  sel.innerHTML = specs.map(function(s) { return '<option value="'+s+'">'+SPECS[s].name+'</option>'; }).join('');
  document.getElementById('type-label').textContent = MAT_LABELS[mat] || 'Size';
  document.getElementById('thick-label').textContent = THICK_LABELS[mat] || 'Thickness (in)';
  if (mat==='hardware' || mat==='studs') document.getElementById('weld-code').value = 'none';
  initChem();
  updatePreheat();
}

function initChem() {
  var spec = SPECS[document.getElementById('spec-select').value];
  if (!spec) return;
  ['1','2'].forEach(function(h) {
    var body = document.getElementById('chem-'+h);
    body.innerHTML = '';
    var vals = h==='1' ? chem1 : chem2;
    Object.keys(spec.elements).forEach(function(e) {
      var lim = spec.elements[e];
      var limStr = (lim.min!==null ? lim.min+'-' : '') + (lim.max!==null ? lim.max : '') + (lim.min===null && lim.max!==null ? ' max' : '');
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+lim.label+' ('+e+')</td><td><input class="chem-in" data-h="'+h+'" data-e="'+e+'" value="'+(vals[e]||'')+'" placeholder="--" onchange="chkChem(\''+h+'\',\''+e+'\')"></td><td style="font-size:11px;color:#777">'+limStr+'</td><td id="st-'+h+'-'+e+'" class="st-na">--</td>';
      body.appendChild(tr);
    });
  });
}

function chkChem(h,e) {
  var inp = document.querySelector('input[data-h="'+h+'"][data-e="'+e+'"]');
  var v = parseFloat(inp.value);
  var cell = document.getElementById('st-'+h+'-'+e);
  var spec = SPECS[document.getElementById('spec-select').value];
  var lim = spec.elements[e];
  if (h==='1') chem1[e] = inp.value; else chem2[e] = inp.value;
  if (isNaN(v)) { cell.className='st-na'; cell.textContent='--'; return; }
  var ok = true;
  if (lim.min!==null && v<lim.min) ok = false;
  if (lim.max!==null && v>lim.max) ok = false;
  cell.className = ok ? 'st-pass' : 'st-fail';
  cell.textContent = ok ? 'PASS' : 'FAIL';
}

function calcCE(v) {
  if (!v) return null;
  var C=+v.C||0, Mn=+v.Mn||0, Cr=+v.Cr||0, Mo=+v.Mo||0, V=+v.V||0, Ni=+v.Ni||0, Cu=+v.Cu||0;
  if (!C && !Mn) return null;
  return (C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15).toFixed(3);
}
function getPreheat(t,tbl) { for (var i=0;i<tbl.length;i++) { if (t<=tbl[i].t) return tbl[i]; } return tbl[tbl.length-1]; }
function isWeathering() { var spec = SPECS[document.getElementById('spec-select').value]; return spec && spec.weathering; }
function getCategory() { return document.getElementById('spec-select').value==='A36' ? 'A' : 'B'; }
function updatePreheat() {
  var t = parseFloat(document.getElementById('flange-thick').value);
  var note = document.getElementById('preheat-info');
  var wc = document.getElementById('weld-code').value;
  if (wc==='none') { note.textContent = 'Welding code not applicable.'; return; }
  if (!t) { note.textContent = 'Enter thickness for preheat requirements.'; return; }
  var fcm = document.getElementById('fcm-select').value==='Y';
  var cat = getCategory();
  var s = '';
  if (wc==='D1.1' || wc==='both') { var tbl = cat==='A' ? D11_CAT_A : D11_CAT_B; var r = getPreheat(t,tbl); s += 'D1.1 (Cat '+cat+'): Min preheat '+r.p+'F\n'; }
  if (wc==='D1.5' || wc==='both') { var r2 = getPreheat(t, fcm ? D15_FCM : D15_NONFCM); s += 'D1.5 ('+(fcm?'FCM':'non-FCM')+'): Min preheat '+r2.p+'F ('+r2.l+')'; }
  note.textContent = s;
}

// ===== PDF UPLOAD + AUTO-EXTRACT =====
async function handleFile(e) {
  var f = e.target.files[0];
  if (f) { fileName = f.name; await loadPDF(f); }
}

async function loadPDF(file) {
  try {
    var r = new FileReader();
    r.onload = async function(e) {
      try {
        pdfDoc = await pdfjsLib.getDocument({data: new Uint8Array(e.target.result)}).promise;
        curPage = 1;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        document.getElementById('pdf-bar').classList.remove('hidden');
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('pdf-canvas').classList.remove('hidden');
        document.getElementById('btn-hl').disabled = false;
        setStep(1);
        await renderPage();
        // Auto-extract MTR data from text
        await extractMtrData();
      } catch(err) {
        alert('Error loading PDF: ' + err.message);
      }
    };
    r.readAsArrayBuffer(file);
  } catch(err) {
    alert('Error reading file: ' + err.message);
  }
}

// ===== AUTO-EXTRACTION =====
async function extractMtrData() {
  var area = document.getElementById('extract-area');
  area.innerHTML = '<div class="extract-status">Extracting MTR data from document...</div>';
  var allText = '';
  try {
    for (var i = 1; i <= Math.min(pdfDoc.numPages, 5); i++) {
      var page = await pdfDoc.getPage(i);
      var tc = await page.getTextContent();
      var pageText = tc.items.map(function(item) { return item.str; }).join(' ');
      allText += pageText + '\n';
    }
  } catch(err) {
    allText = '';
  }

  if (allText.trim().length < 20) {
    area.innerHTML = '<div class="extract-status warn">No embedded text found (scanned PDF). Please enter MTR data manually on the left.</div>';
    return;
  }

  var filled = [];
  var text = allText;

  // PO Number
  var poMatch = text.match(/(?:PO|P\.O\.|Purchase\s*Order)\s*#?\s*(\d{4,})/i);
  if (poMatch) { document.getElementById('po-number').value = poMatch[1]; filled.push('PO Number'); }

  // Heat numbers
  var heatMatches = text.match(/Heat\s*#?\s*(\d{4,})/gi);
  if (heatMatches) {
    var h1 = heatMatches[0].match(/\d{4,}/);
    if (h1) { document.getElementById('heat1').value = h1[0]; filled.push('Heat #1'); }
    if (heatMatches.length > 1) {
      var h2 = heatMatches[1].match(/\d{4,}/);
      if (h2) { document.getElementById('heat2').value = h2[0]; filled.push('Heat #2'); }
    }
  }

  // Specification
  if (/A588.*A709.*50W/i.test(text)) { document.getElementById('spec-select').value = 'A588-A709-50W'; filled.push('Spec'); }
  else if (/A709.*50W/i.test(text)) { document.getElementById('spec-select').value = 'A709-50W'; filled.push('Spec'); }
  else if (/A588/i.test(text)) { document.getElementById('spec-select').value = 'A588'; filled.push('Spec'); }
  else if (/A992/i.test(text)) { document.getElementById('spec-select').value = 'A992'; filled.push('Spec'); }
  else if (/A572.*50/i.test(text)) { document.getElementById('spec-select').value = 'A572-50'; filled.push('Spec'); }
  else if (/A36/i.test(text)) { document.getElementById('spec-select').value = 'A36'; filled.push('Spec'); }

  // Type/Size
  var typeMatch = text.match(/(W\d+x\d+)/i);
  if (typeMatch) { document.getElementById('beam-type').value = typeMatch[1]; filled.push('Type'); }
  else {
    var cMatch = text.match(/(C\d+x\d+)/i);
    if (cMatch) document.getElementById('beam-type').value = cMatch[1];
    var lMatch = text.match(/(L\d+x\d+x[\d\/]+)/i);
    if (lMatch) document.getElementById('beam-type').value = lMatch[1];
  }

  // Quantity
  var qtyMatch = text.match(/(?:QTY|Quantity|Qty)\s*:?\s*(\d+\s*[^,\n]{0,20})/i);
  if (qtyMatch) { document.getElementById('quantity').value = qtyMatch[1].trim(); filled.push('Quantity'); }

  // Mill name
  if (/Nucor/i.test(text)) { document.getElementById('mill-name').value = 'Nucor-Yamato Steel'; filled.push('Mill'); }
  else if (/ArcelorMittal/i.test(text)) { document.getElementById('mill-name').value = 'ArcelorMittal'; filled.push('Mill'); }
  else if (/Steel\s*Dynamics/i.test(text)) { document.getElementById('mill-name').value = 'Steel Dynamics'; filled.push('Mill'); }
  else if (/Nucor.*Yamato/i.test(text)) { document.getElementById('mill-name').value = 'Nucor-Yamato Steel'; filled.push('Mill'); }

  // Country of origin
  if (/Melted.*Manufactured.*USA|Made.*USA|U\.S\.A/i.test(text)) { filled.push('Domestic (USA)'); }

  // Chemical composition - try to find element values
  // Look for patterns like "C 0.09 Mn 1.25" or "Carbon 0.09 Manganese 1.25"
  var chemFound = [];
  var chemPatterns = {
    C: /(?:^|\s)C\s+\.?(\d{1,4}\.?\d{0,4})/m,
    Mn: /(?:^|\s)Mn\s+(\d{1,4}\.?\d{0,4})/m,
    P: /(?:^|\s)P\s+\.?(\d{1,4}\.?\d{0,4})/m,
    S: /(?:^|\s)S\s+\.?(\d{1,4}\.?\d{0,4})/m,
    Si: /(?:^|\s)Si\s+(\d{1,4}\.?\d{0,4})/m,
    Cu: /(?:^|\s)Cu\s+(\d{1,4}\.?\d{0,4})/m,
    Ni: /(?:^|\s)Ni\s+(\d{1,4}\.?\d{0,4})/m,
    Cr: /(?:^|\s)Cr\s+(\d{1,4}\.?\d{0,4})/m,
    Mo: /(?:^|\s)Mo\s+(\d{1,4}\.?\d{0,4})/m,
    V: /(?:^|\s)V\s+(\d{1,4}\.?\d{0,4})/m,
    Nb: /(?:^|\s)(?:Nb|Cb)\s+(\d{1,4}\.?\d{0,4})/m
  };

  Object.keys(chemPatterns).forEach(function(e) {
    var m = text.match(chemPatterns[e]);
    if (m) {
      var val = m[1];
      if (val.charAt(0) === '.') val = '0' + val;
      chem1[e] = val;
      chemFound.push(e);
    }
  });

  // Re-init chemistry tables to show extracted values
  initChem();
  if (chemFound.length > 0) filled.push('Chemistry (' + chemFound.length + ' elements)');

  // Update status
  if (filled.length > 0) {
    area.innerHTML = '<div class="extract-status">Auto-extracted: ' + filled.join(', ') + '</div>';
  } else {
    area.innerHTML = '<div class="extract-status warn">Text found but no MTR fields recognized. Please enter data manually.</div>';
  }
}

// ===== PDF RENDER =====
async function renderPage() {
  if (!pdfDoc) return;
  var page = await pdfDoc.getPage(curPage);
  var vp = page.getViewport({scale: scale});
  var c = document.getElementById('pdf-canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({canvasContext: c.getContext('2d'), viewport: vp}).promise;
  document.getElementById('page-num').textContent = curPage;
  document.getElementById('zoom-level').textContent = Math.round(scale/1.5*100) + '%';
  if (hlVisible) drawHL();
  if (approvalState) drawStamp();
}
function prevPage() { if (curPage>1) { curPage--; renderPage(); } }
function nextPage() { if (pdfDoc && curPage<pdfDoc.numPages) { curPage++; renderPage(); } }
function zoomIn() { scale *= 1.2; renderPage(); }
function zoomOut() { scale /= 1.2; renderPage(); }

// ===== HIGHLIGHTS =====
function drawHL() {
  var ov = document.getElementById('hl-overlay');
  ov.innerHTML = '';
  var c = document.getElementById('pdf-canvas');
  var wrap = document.getElementById('pdf-wrap');
  var cr = c.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  ov.style.left = (cr.left - wr.left + wrap.scrollLeft) + 'px';
  ov.style.top = (cr.top - wr.top + wrap.scrollTop) + 'px';
  ov.style.width = c.width + 'px';
  ov.style.height = c.height + 'px';
  var act = {};
  document.querySelectorAll('.hl-chip.active').forEach(function(c) { act[c.dataset.area] = true; });
  if (curPage === 1) {
    if (act.cert) addHL(50, 50, c.width-100, 120, 'cert', 'Certification');
    if (act.grade) addHL(50, 180, 300, 40, 'grade', 'Grade/Spec');
  }
  if (curPage >= 2) {
    if (act.heat) addHL(50, 80, 200, 30, 'heat', 'Heat #');
    if (act.chem) addHL(c.width*0.55, 150, c.width*0.43, 200, 'chem', 'Chemistry');
    if (act.cvn) addHL(c.width*0.30, 150, c.width*0.20, 80, 'cvn', 'CVN');
    if (act.mech) addHL(c.width*0.05, 150, c.width*0.20, 100, 'mech', 'Mechanical');
  }
}
function addHL(x,y,w,h,type,label) {
  var ov = document.getElementById('hl-overlay');
  var b = document.createElement('div');
  b.className = 'hl-box hl-' + type;
  b.style.cssText = 'left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;';
  var l = document.createElement('div');
  l.className = 'hl-label';
  l.textContent = label;
  b.appendChild(l);
  ov.appendChild(b);
}
function toggleHighlights() {
  hlVisible = !hlVisible;
  document.getElementById('hl-overlay').style.display = hlVisible ? 'block' : 'none';
}
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('hl-chip')) {
    e.target.classList.toggle('active');
    if (hlVisible) drawHL();
  }
});

// ===== STAMP =====
function drawStamp() {
  var pdfCanvas = document.getElementById('pdf-canvas');
  var stampCanvas = document.getElementById('stamp-canvas');
  var wrap = document.getElementById('pdf-wrap');
  var cr = pdfCanvas.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  stampCanvas.classList.remove('hidden');
  stampCanvas.width = pdfCanvas.width;
  stampCanvas.height = pdfCanvas.height;
  stampCanvas.style.left = (cr.left - wr.left + wrap.scrollLeft) + 'px';
  stampCanvas.style.top = (cr.top - wr.top + wrap.scrollTop) + 'px';
  var ctx = stampCanvas.getContext('2d');
  ctx.clearRect(0, 0, stampCanvas.width, stampCanvas.height);
  var cx = stampCanvas.width * 0.5, cy = stampCanvas.height * 0.5;
  var color = approvalState === 'Approved' ? 'rgba(26,122,48,0.7)' : approvalState === 'Rejected' ? 'rgba(204,0,0,0.7)' : 'rgba(197,160,94,0.7)';
  var lineColor = approvalState === 'Approved' ? 'rgba(26,122,48,0.9)' : approvalState === 'Rejected' ? 'rgba(204,0,0,0.9)' : 'rgba(197,160,94,0.9)';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.25);
  var fs = Math.round(stampCanvas.width * 0.06);
  ctx.font = 'bold ' + fs + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var text = approvalState.toUpperCase();
  var tw = ctx.measureText(text).width;
  var padX = fs * 0.6, padY = fs * 0.4;
  var boxW = tw + padX * 2, boxH = fs + padY * 2;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(3, fs * 0.08);
  ctx.strokeRect(-boxW/2, -boxH/2, boxW, boxH);
  ctx.lineWidth = Math.max(1.5, fs * 0.04);
  ctx.strokeRect(-boxW/2 + 6, -boxH/2 + 6, boxW - 12, boxH - 12);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.font = 'bold ' + Math.round(fs * 0.35) + 'px Arial';
  ctx.fillText(document.getElementById('reviewer-name').value || '', 0, fs * 0.7);
  ctx.fillText(document.getElementById('review-date').value || '', 0, fs * 1.0);
  ctx.restore();
}

function downloadStamped() {
  var pdfCanvas = document.getElementById('pdf-canvas');
  var stampCanvas = document.getElementById('stamp-canvas');
  var out = document.createElement('canvas');
  out.width = pdfCanvas.width; out.height = pdfCanvas.height;
  var ctx = out.getContext('2d');
  ctx.drawImage(pdfCanvas, 0, 0);
  if (approvalState) ctx.drawImage(stampCanvas, 0, 0);
  var link = document.createElement('a');
  link.download = (fileName || 'MTR').replace('.pdf', '') + '_STAMPED_' + approvalState + '.png';
  link.href = out.toDataURL('image/png');
  link.click();
}

// ===== CHEMICAL REPORT =====
function runChemReport() {
  var spec = SPECS[document.getElementById('spec-select').value];
  var wc = document.getElementById('weld-code').value;
  var fcm = document.getElementById('fcm-select').value === 'Y';
  var thick = parseFloat(document.getElementById('flange-thick').value) || 0;
  var zone = parseInt(document.getElementById('cvn-zone').value);
  var matLabel = document.getElementById('mat-type').options[document.getElementById('mat-type').selectedIndex].text;
  var R = [];
  var sn = 1;
  R.push('<div class="rpt-header-info"><strong>PO:</strong> '+(document.getElementById('po-number').value||'—')+'<br><strong>Mill:</strong> '+(document.getElementById('mill-name').value||'—')+'<br><strong>Type:</strong> '+matLabel+'<br><strong>Spec:</strong> '+spec.name+'<br><strong>Size:</strong> '+(document.getElementById('beam-type').value||'—')+'<br><strong>Heat:</strong> '+(document.getElementById('heat1').value||'—')+(document.getElementById('heat2').value?' / '+document.getElementById('heat2').value:'')+'<br><strong>Welding Code:</strong> '+(wc==='both'?'D1.1 & D1.5':wc==='none'?'N/A':'AWS '+wc)+'<br>'+(thick?'<strong>Thickness:</strong> '+thick+'"  ':'')+'<strong>FCM:</strong> '+(fcm?'Yes':'No')+'  <strong>CVN Zone:</strong> '+zone+'</div>');
  var allPass = true;
  R.push('<div class="rpt-section"><h2>'+sn++ +'. Chemical Composition — Heat 1</h2>');
  R.push('<table class="rpt-tbl"><tr><th>Element</th><th>Value %</th><th>Min</th><th>Max</th><th>Status</th></tr>');
  Object.keys(spec.elements).forEach(function(e) {
    var lim = spec.elements[e];
    var v = parseFloat(chem1[e]);
    var st = 'N/A', cls = '';
    if (!isNaN(v)) { st = 'PASS'; cls = 'rpt-pass'; if (lim.min!==null && v<lim.min) { st='FAIL — Below min'; cls='rpt-fail'; allPass=false; } if (lim.max!==null && v>lim.max) { st='FAIL — Exceeds max'; cls='rpt-fail'; allPass=false; } }
    R.push('<tr><td>'+lim.label+' ('+e+')</td><td>'+(chem1[e]||'—')+'</td><td>'+(lim.min||'—')+'</td><td>'+(lim.max||'—')+'</td><td class="'+cls+'">'+st+'</td></tr>');
  });
  var ce1 = calcCE(chem1);
  if (ce1) R.push('<tr><td>Carbon Equivalent</td><td>'+ce1+'</td><td>—</td><td>0.45*</td><td class="'+(+ce1<=0.45?'rpt-pass':'rpt-warn')+'">'+(+ce1<=0.45?'PASS':'INFO')+'</td></tr>');
  R.push('</table></div>');
  if (Object.keys(chem2).filter(function(k) { return chem2[k]; }).length > 0) {
    R.push('<div class="rpt-section"><h2>'+sn++ +'. Chemical Composition — Heat 2</h2>');
    R.push('<table class="rpt-tbl"><tr><th>Element</th><th>Value %</th><th>Min</th><th>Max</th><th>Status</th></tr>');
    Object.keys(spec.elements).forEach(function(e) {
      var lim = spec.elements[e];
      var v = parseFloat(chem2[e]);
      var st = 'N/A', cls = '';
      if (!isNaN(v)) { st = 'PASS'; cls = 'rpt-pass'; if (lim.min!==null && v<lim.min) { st='FAIL — Below min'; cls='rpt-fail'; allPass=false; } if (lim.max!==null && v>lim.max) { st='FAIL — Exceeds max'; cls='rpt-fail'; allPass=false; } }
      R.push('<tr><td>'+lim.label+' ('+e+')</td><td>'+(chem2[e]||'—')+'</td><td>'+(lim.min||'—')+'</td><td>'+(lim.max||'—')+'</td><td class="'+cls+'">'+st+'</td></tr>');
    });
    R.push('</table></div>');
  }
  R.push('<div class="rpt-summary '+(allPass?'pass':'fail')+'">'+(allPass?'All elements within spec limits.':'One or more elements OUT OF SPEC.')+'</div>');
  if (wc==='D1.5' || wc==='both') {
    var r15 = getPreheat(thick||0.68, fcm ? D15_FCM : D15_NONFCM);
    var c1 = parseFloat(chem1.C), ce1v = parseFloat(calcCE(chem1));
    var qStat = 'Enter carbon', qCls = 'rpt-pass';
    if (!isNaN(c1)) { if (c1>=0.15) qStat='C >= 0.15% — Qualifies all grades'; else if (c1>=0.12 && !isNaN(ce1v) && ce1v>=0.45) qStat='CE >= 0.45% & C >= 0.12% — All grades'; else if (c1>=0.12) { qStat='C >= 0.12% but CE < 0.45% — 50W only'; qCls='rpt-warn'; } else { qStat='C < 0.12% — WPS 50W ONLY'; qCls='rpt-fail'; } }
    var cvnR = fcm ? CVN_FCM[zone] : CVN_REQ[zone];
    R.push('<div class="rpt-section"><h2>'+sn++ +'. AWS D1.5 Cross-Reference</h2>');
    R.push('<table class="rpt-tbl"><tr><th>Parameter</th><th>Requirement</th><th>Detail</th></tr>');
    R.push('<tr><td>Min Preheat</td><td>'+r15.p+'F ('+r15.l+')</td><td>'+(fcm?'FCM':'Non-FCM')+', '+(thick||0.68)+'"</td></tr>');
    R.push('<tr class="'+qCls+'"><td>WPS Qual (Cl 5.4.2)</td><td>'+qStat+'</td><td>C: '+(chem1.C||'—')+'% | CE: '+(calcCE(chem1)||'—')+'</td></tr>');
    R.push('<tr><td>CVN Temp</td><td>'+cvnR.t+'F</td><td>Zone '+zone+'</td></tr>');
    R.push('</table></div>');
  }
  if (isWeathering()) {
    R.push('<div class="rpt-section"><h2>'+sn++ +'. Weathering Steel Check</h2>');
    var cu = parseFloat(chem1.Cu), cr = parseFloat(chem1.Cr), ni = parseFloat(chem1.Ni);
    var wOK = true;
    R.push('<table class="rpt-tbl"><tr><th>Element</th><th>Heat 1</th><th>Required</th><th>Status</th></tr>');
    if (!isNaN(cu)) { var ok = cu>=0.20; R.push('<tr><td>Cu</td><td>'+chem1.Cu+'%</td><td>min 0.20%</td><td class="'+(ok?'rpt-pass':'rpt-fail')+'">'+(ok?'PASS':'FAIL')+'</td></tr>'); if(!ok) wOK=false; }
    if (!isNaN(cr)) { var ok2 = cr>=0.40 && cr<=0.70; R.push('<tr><td>Cr</td><td>'+chem1.Cr+'%</td><td>0.40-0.70%</td><td class="'+(ok2?'rpt-pass':'rpt-fail')+'">'+(ok2?'PASS':'FAIL')+'</td></tr>'); if(!ok2) wOK=false; }
    R.push('</table>');
    R.push('<div class="rpt-summary '+(wOK?'pass':'fail')+'">'+(wOK?'Weathering chemistry confirmed.':'Weathering elements out of range.')+'</div></div>');
  }
  R.push('<div class="rpt-footer">* CE 0.45% per A709 for shapes <= 2".<br>** D1.5 Cl 5.4.2: C >= 0.15% OR (CE >= 0.45% AND C >= 0.12%).<br>Report: '+new Date().toLocaleString()+'</div>');
  document.getElementById('report-body').innerHTML = R.join('');
  document.getElementById('report-panel').classList.add('open');
}
function closeReport() { document.getElementById('report-panel').classList.remove('open'); }

// ===== APPROVAL =====
function submitApproval(status) {
  var reviewer = document.getElementById('reviewer-name').value.trim();
  if (!reviewer) { alert('Enter reviewer name before submitting approval.'); return; }
  if (!pdfDoc) { alert('Upload an MTR document first.'); return; }
  approvalState = status;
  var banner = document.getElementById('approval-status-area');
  var cls = status==='Approved' ? 'approved' : status==='Rejected' ? 'rejected' : 'revise';
  banner.innerHTML = '<div class="approval-banner '+cls+'">STATUS: '+status.toUpperCase()+' — '+reviewer+' — '+document.getElementById('review-date').value+'</div>';
  drawStamp();
  document.getElementById('btn-download').disabled = false;
  generateCertificate(status, reviewer);
  var records = JSON.parse(localStorage.getItem('mtr_records') || '[]');
  records.push({po:document.getElementById('po-number').value, heat:document.getElementById('heat1').value, type:document.getElementById('beam-type').value, spec:SPECS[document.getElementById('spec-select').value].name, status:status, reviewer:reviewer, date:document.getElementById('review-date').value, file:fileName, comments:document.getElementById('review-comments').value, timestamp:new Date().toISOString()});
  localStorage.setItem('mtr_records', JSON.stringify(records));
}

function generateCertificate(status, reviewer) {
  var spec = SPECS[document.getElementById('spec-select').value];
  var matLabel = document.getElementById('mat-type').options[document.getElementById('mat-type').selectedIndex].text;
  var w = window.open('', '_blank');
  var sc = status==='Approved' ? '#1a7a30' : status==='Rejected' ? '#c00' : '#c5a05e';
  w.document.write('<!DOCTYPE html><html><head><title>MTR Approval — '+status+'</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Times New Roman,Georgia,serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}.hdr{background:#1a3a5c;color:#fff;padding:16px 24px;border-bottom:3px solid #c5a05e;margin:-40px -40px 20px}.hdr h1{font-size:18px;font-family:Arial,sans-serif;letter-spacing:1px}.hdr .sub{font-size:11px;color:#b0c4d8;font-family:Arial,sans-serif;margin-top:2px}.stamp{text-align:center;margin:30px 0}.stamp-box{display:inline-block;border:4px solid '+sc+';padding:10px 30px;font-size:28px;font-weight:bold;font-family:Arial,sans-serif;text-transform:uppercase;color:'+sc+';transform:rotate(-3deg)}table{width:100%;border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;font-size:13px}table td{padding:6px 10px;border-bottom:1px solid #ddd}table td:first-child{font-weight:bold;color:#1a3a5c;width:35%}.sig{margin-top:40px;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:13px}.sig-line{border-top:1px solid #333;padding-top:4px;width:200px;text-align:center;margin-top:40px}.footer{margin-top:30px;padding-top:10px;border-top:1px solid #999;font-size:10px;color:#888;font-family:Arial,sans-serif}.comments{margin:16px 0;padding:12px;border-left:4px solid '+sc+';background:#fafafa;font-family:Arial,sans-serif;font-size:12px}</style></head><body><div class="hdr"><h1>MTR INSPECTION CERTIFICATE</h1><div class="sub">Material Test Report Verification & Approval</div></div><div class="stamp"><div class="stamp-box">'+status+'</div></div><table><tr><td>PO Number</td><td>'+(document.getElementById('po-number').value||'—')+'</td></tr><tr><td>Mill / Supplier</td><td>'+(document.getElementById('mill-name').value||'—')+'</td></tr><tr><td>Material Type</td><td>'+matLabel+'</td></tr><tr><td>Specification</td><td>'+spec.name+'</td></tr><tr><td>Size / Designation</td><td>'+(document.getElementById('beam-type').value||'—')+'</td></tr><tr><td>Quantity</td><td>'+(document.getElementById('quantity').value||'—')+'</td></tr><tr><td>Heat #1</td><td>'+(document.getElementById('heat1').value||'—')+'</td></tr><tr><td>Heat #2</td><td>'+(document.getElementById('heat2').value||'—')+'</td></tr><tr><td>File Name</td><td>'+(fileName||'—')+'</td></tr><tr><td>Welding Code</td><td>'+(document.getElementById('weld-code').value==='both'?'D1.1 & D1.5':document.getElementById('weld-code').value==='none'?'N/A':'AWS '+document.getElementById('weld-code').value)+'</td></tr></table>'+(document.getElementById('review-comments').value?'<div class="comments"><strong>Inspection Comments:</strong><br>'+document.getElementById('review-comments').value+'</div>':'')+'<div class="sig"><div><div class="sig-line">'+reviewer+'</div>Reviewed By (Qualified Personnel)</div><div><div class="sig-line">'+document.getElementById('review-date').value+'</div>Date</div></div><div class="footer">Certificate generated: '+new Date().toLocaleString()+'<br>This certificate verifies that the above MTR has been reviewed and '+status.toLowerCase()+' by qualified personnel.<br>Retain this certificate with the original MTR document for project records.</div><scr'+'ipt>window.onload=function(){setTimeout(function(){window.print()},500)}</scr'+'ipt></body></html>');
  w.document.close();
}

// ===== EVENTS =====
document.getElementById('weld-code').addEventListener('change', updatePreheat);
document.getElementById('fcm-select').addEventListener('change', updatePreheat);
document.getElementById('flange-thick').addEventListener('input', updatePreheat);
var dz = document.getElementById('drop-zone'), pw = document.getElementById('pdf-wrap');
['dragenter','dragover'].forEach(function(ev) { pw.addEventListener(ev, function(e) { e.preventDefault(); dz.classList.add('drag'); }); });
['dragleave','drop'].forEach(function(ev) { pw.addEventListener(ev, function(e) { e.preventDefault(); dz.classList.remove('drag'); }); });
pw.addEventListener('drop', async function(e) { var f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') { fileName = f.name; await loadPDF(f); } });

// INIT
onMaterialChange();
