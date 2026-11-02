const db = require("./config/db");
const { initialSerialFromStartNumber } = require("./services/invoiceNo.service");

function defaultPrefixForType(sequenceType, branchCodeUpper) {
  switch (sequenceType) {
    case "quotation": return `SREE/{FY}/QO`;
    case "proforma": return `SREE -{SERIAL}/{FY_LONG}`;
    case "delivery_challan": return `SREE/{FY}/DC`;
    case "purchase": return `ShreePO -{SERIAL}/{FY_LONG}`;
    case "receipt": return `SREE/{FY}/`;
    case "sale":
    default: return `SREE/{FY}/`;
  }
}

async function revert() {
  try {
    const [branches] = await db.promise().query("SELECT id, branch_code FROM branches");
    
    for (const b of branches) {
      const code = b.branch_code ? String(b.branch_code).trim().toUpperCase() : `B${b.id}`;
      const types = ["sale", "quotation", "purchase", "receipt", "proforma", "delivery_challan"];
      
      for (const type of types) {
        const prefix = defaultPrefixForType(type, code);
        const startNum = 1;
        
        // Find existing invoice_no serial to sync last_number (optional but good for consistency)
        const [inv] = await db.promise().query("SELECT serial_no FROM invoice_no WHERE branch_id = ? AND bill_type = ?", [b.id, type]);
        let lastNum = 0;
        if (inv && inv.length > 0) {
          lastNum = Math.max(0, inv[0].serial_no);
        }

        await db.promise().query(
          `INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, start_number, last_number) VALUES (?, ?, ?, ?, ?)`,
          [b.id, type, prefix, startNum, lastNum]
        );
      }
    }
    
    console.log("Branch sequences successfully reverted and synced with current invoice_no states!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
revert();
