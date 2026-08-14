# Q.C. Quality Console

Steel quality control platform for bridge & structural steel fabrication.
Live at: https://steel-grade-vault.base44.app

## What This Does

Automates MTR (Material Test Report) verification for domestic steel compliance:
- **Extraction**: AWS Textract + OpenAI GPT-4o vision pipeline reads MTR PDFs (text-based and scanned)
- **Review**: 3-step workflow — Review → Chemical Analysis → Approval/Stamping
- **Compliance**: Verifies against ASTM A588/A709 Grade 50W and AWS D1.1/D1.5 welding codes
- **Tracking**: Yard tracker with satellite imagery for material location tracking

## Project Structure

```
├── functions/                  # Backend functions (deployed on Base44)
│   ├── extractMtrWithAI.ts     # Main extraction function (Textract + GPT-4o)
│   ├── getMtrStatus.ts         # Status check endpoint
│   └── uploadMtrText.ts        # Text upload handler
├── skills/                     # Processing scripts
│   └── mtr-processor/
│       ├── process_mtr.py      # MTR extraction pipeline
│       └── highlight_scanned.py # Scan highlighting
├── mtr_knowledge_base.js       # Mill templates, steel specs, chemistry limits
├── mtr_upload_component.txt     # React component for MTR Review upload zone
├── qc_quality_console_template.html  # Console UI template
├── qc_quality_console_dmac.html # DMAC variant
├── mtr_verifier.html           # Original MTR verification tool
├── yard_tracker.html           # Yard tracking map
├── yard_map.html               # Yard map page
├── console_data.json           # Seed data for console
├── mtr_entity_records.json     # Entity records for database
├── mtr_all_results.json        # Full extraction results
├── mtr_results_batch1.json      # Batch 1 results
├── mtr_results_batch2.json     # Batch 2 results
├── mtr_updates.json            # Record updates
├── test_*.js                   # Test scripts for extraction pipeline
├── test_*.py                   # Python test scripts
├── converted_*.png             # Converted MTR scans (300dpi for OCR)
├── yard_satellite*.png         # Yard satellite imagery
└── *.pdf                       # Sample MTR documents
```

## Tech Stack

- **Platform**: Base44 (app builder, database, backend functions)
- **OCR**: AWS Textract (table/form extraction)
- **AI**: OpenAI GPT-4o (vision-based field extraction)
- **Frontend**: React (Base44 generated) + standalone HTML tools
- **Database**: MtrRecord entity on Base44

## Key MTR Fields (Priority Order)

1. Heat numbers (most critical — trace material to mill + chemistry)
2. Specifications (A588, A709, A36, A500, A992, etc.)
3. Dimensions/Size (W24x76, C8x18.75, HSS10SQx375, etc.)
4. Grades (50W, Grade B, etc.)
5. CVN (Charpy V-notch impact tests)
6. Country of Origin (Buy America / Build America compliance)

## Current Status

- ✅ Backend extraction pipeline working (18 MTRs processed)
- ✅ Dashboard live with 18 records
- ✅ Backend function `extractMtr` deployed
- ⬜ Frontend upload zone needs manual wiring (see mtr_upload_component.txt)
- ⬜ MTR archive search & compile system (planned)
- ⬜ Drawing review module (planned)

## To Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/qc-quality-console.git
git branch -M main
git push -u origin main
```
