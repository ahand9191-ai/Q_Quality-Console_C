// Scan all MTR records for "fully killed fine grain practice" and "no weld repair" statements
const records = [
  // We'll search the rawText field of each record
];

// Read all MTR records from the database
const fs = require('fs');

// Keywords to search for
const keywords = {
  'fullyKilledFineGrain': [
    'fully killed',
    'fine grain',
    'fine grained',
    'killed steel',
    'fully deoxidized',
    'FKFP',
    'fine grain practice',
    'grain refined'
  ],
  'noWeldRepair': [
    'no weld repair',
    'no welding repair',
    'no repair welding',
    'without weld repair',
    'no weld repairs',
    'weld repair: none',
    'repair: none'
  ]
};

console.log('Inspection Items Check:');
console.log('Looking for: "Fully Killed Fine Grain Practice" and "No Weld Repair"');
console.log('='.repeat(60));
