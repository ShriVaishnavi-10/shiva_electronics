const db = require("../config/db");

function initialSerialFromStartNumber(startNum) {
  const n = Math.max(1, Math.floor(Number(startNum)) || 1);
  return Math.max(0, n - 1);
}

function ensureInvoiceNoRow(branchId, billType, startNumber, cb) {
  const initial = initialSerialFromStartNumber(startNumber);
  db.query(
    `INSERT IGNORE INTO invoice_no (branch_id, bill_type, serial_no) VALUES (?, ?, ?)`,
    [branchId, billType, initial],
    cb,
  );
}

function defaultPrefixForType(sequenceType, branchCodeUpper) {
  switch (sequenceType) {
    case "non_gst_sale":
      return "";
    case "quotation":
      return `SE-QUO-`;
    case "proforma":
      return `SE-PRO-`;
    case "delivery_challan":
      return `SE-DC-`;
    case "purchase":
      return `SE-PUR-`;
    case "receipt":
      return `SE-REC-`;
    case "sale":
    default:
      return `SE-`;
  }
}

function emitPeek(prefix, start_number, inv_serial, type, cb) {
  const p = String(prefix || "").trim();
  const lastIssued = inv_serial != null ? Number(inv_serial) : 0;
  const lastUsed = Number.isFinite(lastIssued) ? Math.max(0, lastIssued) : 0;
  const startNum = Math.max(1, Number(start_number) || 1);
  const nextNum = Math.max(lastUsed + 1, startNum);
  
  if (type === "non_gst_sale") {
    const paddedSerial = String(nextNum).padStart(2, "0");
    return cb(null, {
      next_number: paddedSerial,
      raw: nextNum,
      prefix: "",
      suffix_length: 2,
      bill_type: "non_gst_sale",
    });
  }

  let padLen = type === "sale" ? 2 : 4;

  const d = new Date();
  const year = d.getFullYear();
  const isBeforeApril = d.getMonth() < 3; 
  const startYear = isBeforeApril ? year - 1 : year;
  const endYear = startYear + 1;
  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);
  
  const fy = `${startYY}-${endYY}`; 
  const fyLong = `${startYear}-${endYY}`; 
  
  const paddedSerial = String(nextNum).padStart(padLen, "0");
  
  let formatted = p;
  formatted = formatted.replace(/{FY}/g, fy);
  formatted = formatted.replace(/{FY_LONG}/g, fyLong);
  
  if (formatted.includes("{SERIAL}")) {
    formatted = formatted.replace(/{SERIAL}/g, paddedSerial);
  } else {
    formatted = formatted + paddedSerial;
  }

  cb(null, {
    next_number: formatted,
    raw: nextNum,
    prefix: p,
    suffix_length: padLen,
    bill_type: type,
  });
}

function seedBranchSequenceIfMissing(branchId, sequenceType, cb) {
  db.query("SELECT branch_code FROM branches WHERE id = ?", [branchId], (bErr, bRows) => {
    if (bErr) return cb(bErr);
    if (!bRows?.length) {
      return cb(new Error("Branch not found"));
    }
    const rawCode = bRows[0].branch_code;
    const code =
      rawCode != null && String(rawCode).trim()
        ? String(rawCode).trim().toUpperCase()
        : `B${branchId}`;
    const prefix = defaultPrefixForType(sequenceType, code);
    const startNum = 1;
    const initial = initialSerialFromStartNumber(startNum);
    db.query(
      `INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, start_number, last_number) VALUES (?, ?, ?, ?, 0)`,
      [branchId, sequenceType, prefix, startNum],
      (insErr) => {
        if (insErr) return cb(insErr);
        db.query(
          `INSERT IGNORE INTO invoice_no (branch_id, bill_type, serial_no) VALUES (?, ?, ?)`,
          [branchId, sequenceType, initial],
          (invErr) => cb(invErr),
        );
      },
    );
  });
}

function peekFormatted(branchId, billType, cb) {
  const type = billType || "sale";
  db.query(
    `SELECT seq.prefix, seq.start_number, inv.serial_no AS inv_serial, b.branch_code
     FROM branch_sequences seq
     INNER JOIN branches b ON b.id = seq.branch_id
     LEFT JOIN invoice_no inv ON inv.branch_id = seq.branch_id AND inv.bill_type = seq.sequence_type
     WHERE seq.branch_id = ? AND seq.sequence_type = ?`,
    [branchId, type],
    (err, rows) => {
      if (err) return cb(err);
      if (!rows || !rows.length) {
        return seedBranchSequenceIfMissing(branchId, type, (seedErr) => {
          if (seedErr) return cb(seedErr);
          peekFormatted(branchId, billType, cb);
        });
      }
      const { prefix, start_number, inv_serial, branch_code } = rows[0];
      let p = prefix != null ? String(prefix).trim() : "";

      if (!p && type !== "non_gst_sale") {
        const code = (branch_code && String(branch_code).trim()) ? String(branch_code).trim().toUpperCase() : `B${branchId}`;
        const pDefault = defaultPrefixForType(type, code);
        return db.query(
          `UPDATE branch_sequences SET prefix = ? WHERE branch_id = ? AND sequence_type = ?`,
          [pDefault, branchId, type],
          (upErr) => {
            if (upErr) return cb(upErr);
            emitPeek(pDefault, start_number, inv_serial, type, cb);
          },
        );
      }

      emitPeek(p, start_number, inv_serial, type, cb);
    },
  );
}

function bumpSerialAtLeast(branchId, billType, numericValue, cb) {
  const n = Math.max(0, Math.floor(Number(numericValue)) || 0);
  db.query(
    `INSERT INTO invoice_no (branch_id, bill_type, serial_no) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE serial_no = GREATEST(COALESCE(serial_no, 0), ?)`,
    [branchId, billType, n, n],
    cb,
  );
}

function generateNextNonGstInvoiceNo(branchId, cb) {
  const bId = parseInt(branchId, 10) || 2;

  // Step 1: Ensure initial counter exists with serial_no = 0
  db.query(
    `INSERT IGNORE INTO invoice_no (branch_id, bill_type, serial_no) VALUES (?, 'non_gst_sale', 0)`,
    [bId],
    (seedErr) => {
      if (seedErr) return cb(seedErr);

      // Step 2: Atomic sequence allocation using LAST_INSERT_ID
      const tryAllocate = () => {
        db.query(
          `INSERT INTO invoice_no (branch_id, bill_type, serial_no)
           VALUES (?, 'non_gst_sale', 1)
           ON DUPLICATE KEY UPDATE serial_no = LAST_INSERT_ID(serial_no + 1)`,
          [bId],
          (incErr) => {
            if (incErr) return cb(incErr);

            db.query("SELECT LAST_INSERT_ID() AS serial_no", (selErr, selRows) => {
              if (selErr) return cb(selErr);
              const nextNum = (selRows && selRows[0] && selRows[0].serial_no) ? Number(selRows[0].serial_no) : 1;
              const formatted = String(nextNum).padStart(2, "0");

              // Step 3: Check against transactions table to ensure no conflicts exist
              db.query(
                "SELECT id FROM transactions WHERE branch_id = ? AND is_gst = 0 AND invoice_no = ? LIMIT 1",
                [bId, formatted],
                (chkErr, chkRows) => {
                  if (chkErr) return cb(chkErr);
                  if (chkRows && chkRows.length > 0) {
                    // Conflict found with existing manual entry, step counter and try next
                    return tryAllocate();
                  }

                  // Step 4: Keep branch_sequences in sync
                  db.query(
                    `INSERT INTO branch_sequences (branch_id, sequence_type, prefix, start_number, last_number)
                     VALUES (?, 'non_gst_sale', '', 1, ?)
                     ON DUPLICATE KEY UPDATE last_number = GREATEST(COALESCE(last_number, 0), ?)`,
                    [bId, nextNum, nextNum],
                    (seqErr) => {
                      if (seqErr) console.error("Error updating branch_sequences for non_gst_sale:", seqErr);
                      cb(null, {
                        invoice_no: formatted,
                        raw: nextNum,
                      });
                    }
                  );
                }
              );
            });
          }
        );
      };

      tryAllocate();
    }
  );
}

module.exports = {
  peekFormatted,
  bumpSerialAtLeast,
  ensureInvoiceNoRow,
  initialSerialFromStartNumber,
  generateNextNonGstInvoiceNo,
};
