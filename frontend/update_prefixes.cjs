const db = require('./backend/config/db');

const updates = [
  { type: 'sale', prefix: 'PBH-SAL-' },
  { type: 'purchase', prefix: 'PBH-PUR-' },
  { type: 'quotation', prefix: 'PBH-QUO-' },
  { type: 'receipt', prefix: 'PBH-REC-' },
  { type: 'proforma', prefix: 'PBH-PRO-' },
  { type: 'delivery_challan', prefix: 'PBH-DC-' }
];

let pending = updates.length;

updates.forEach(u => {
  db.query(`UPDATE branch_sequences SET prefix = ? WHERE sequence_type = ?`, [u.prefix, u.type], (err) => {
    if (err) console.error(err);
    pending--;
    if (pending === 0) {
      console.log("Finished updating existing branch sequences.");
      process.exit(0);
    }
  });
});
