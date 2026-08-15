# Q.C. Quality Console

Automated MTR (Material Test Report) verification system for domestic steel compliance and welding code (AWS D1.1/D1.5) validation.

## Overview

Verifies Mill Test Reports against:
- **ASTM A588/A709 Grade 50W** — weathering steel chemistry limits
- **AWS D1.1/D1.5** — welding code requirements (CE limits, carbon caps)
- **Buy America / Build America** — domestic origin verification
- **Mandatory verbiage** — "Fully killed fine grain practice" + "No weld repair"

## Project Structure

```
qc-quality-console/
├── src/
│   ├── extraction/        # MTR extraction pipeline (AWS Textract + GPT-4o)
│   │   ├── process_mtr.py      # Main extraction processor
│   │   ├── highlight_scanned.py # Image enhancement & highlighting
│   │   ├── mtr_knowledge_base.js # MTR field definitions & specs
│   │   ├── check_inspection_items.js # Killed/weld repair verification
│   │   └── test_*.js           # Extraction test scripts
│   ├── functions/          # Backend functions (TypeScript)
│   │   ├── extractMtr.ts       # AWS Textract Custom Queries extraction
│   │   ├── extractMtrWithAI.ts # Textract + GPT-4o pipeline
│   │   ├── getMtrStatus.ts     # Record status checker
│   │   └── uploadMtrText.ts    # Text upload handler
│   └── skills/             # Reusable processing skills
├── html/                  # Frontend tools (standalone HTML)
│   ├── mtr_verifier.html       # 3-step MTR review tool
│   ├── qc_quality_console_template.html # Main console template
│   ├── qc_quality_console_dmac.html    # DMAC variant
│   ├── yard_tracker.html       # Yard tracking map
│   ├── yard_map.html           # Satellite yard map
│   └── mtr_upload_component.txt # File upload component code
├── data/                  # Extracted data & records
├── docs/                  # Documentation
└── samples/               # Sample MTR PDFs
```

## Tech Stack

- **AWS Textract** — OCR & Custom Queries for targeted field extraction
- **OpenAI GPT-4o** — Intelligence layer for field mapping & verification
- **AWS IAM** — textract-user with AmazonTextractFullAccess
- **Base44** — Database & entity storage (MtrRecord entity)

## Extraction Pipeline

1. PDF uploaded → AWS Textract AnalyzeDocument (QUERIES + TABLES + LAYOUT)
2. 25 MTR-specific Custom Queries extract: heat numbers, specs, grade, chemistry, CVN, etc.
3. Raw text scanned for mandatory verbiage (killed/fine grain, no weld repair)
4. Chemistry values parsed and cross-referenced against ASTM/AWS limits
5. Results saved to MtrRecord entity

## AWS Configuration

- **Region:** us-east-1
- **IAM User:** textract-user
- **Account ID:** 388094502765
- **Required Policy:** AmazonTextractFullAccess

## Environment Variables

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
OPENAI_API_KEY=sk-proj-...
```

## Verification Checks

| Check | Spec | Limit |
|-------|------|-------|
| Carbon (C) | D1.5 Cl 5.4.2 | ≤ 0.12% (restricts WPS to 50W) |
| Carbon Equivalent (CE) | D1.1/D1.5 | ≤ 0.47% |
| Phosphorus (P) | A588/A709 | ≤ 0.04% |
| Sulfur (S) | A588/A709 | ≤ 0.05% |
| Manganese (Mn) | A709 Table 4 | ≤ 1.25% (flange ≤ 3/4") |
| Killed/Fine Grain | Mandatory | Must state "fully killed fine grain practice" |
| No Weld Repair | Mandatory | Must state "no weld repair" |
| Country of Origin | Buy America | Must be USA/domestic |

## License

Proprietary — All rights reserved
