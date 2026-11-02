const db = require("../config/db");

async function updateSslToCtw() {
  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  try {
    // 1. Update branch_sequences prefixes to SE-
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-' WHERE sequence_type = 'sale' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-QUO-' WHERE sequence_type = 'quotation' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-PUR-' WHERE sequence_type = 'purchase' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-PRO-' WHERE sequence_type = 'proforma' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-DC-' WHERE sequence_type = 'delivery_challan' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = 'SE-REC-' WHERE sequence_type = 'receipt' AND (prefix LIKE '%CTW%' OR prefix LIKE '%SSL%')");
    await queryAsync("UPDATE branch_sequences SET prefix = REPLACE(prefix, 'CTW', 'SE') WHERE prefix LIKE '%CTW%'");
    await queryAsync("UPDATE branch_sequences SET prefix = REPLACE(prefix, 'SSL', 'SE') WHERE prefix LIKE '%SSL%'");

    console.log("Successfully migrated prefixes to SE in database!");
  } catch (err) {
    console.error("SE prefix migration note:", err.message);
  }
}

// Auto-run when required
updateSslToCtw().catch(() => {});

module.exports = { updateSslToCtw };

if (require.main === module) {
  updateSslToCtw()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
