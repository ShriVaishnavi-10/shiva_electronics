const db = require("../config/db");
const {
  peekFormatted,
  bumpSerialAtLeast,
  ensureInvoiceNoRow,
  initialSerialFromStartNumber,
} = require("../services/invoiceNo.service");

function syncInvoiceNoRowsAfterBranchSave(branchId, body, res) {
  const starts = {
    sale: body.sale_start,
    quotation: body.quotation_start,
    purchase: body.purchase_start,
    receipt: body.receipt_start,
    proforma: body.proforma_start,
    delivery_challan: body.delivery_challan_start,
  };
  const types = ["sale", "quotation", "purchase", "receipt", "proforma", "delivery_challan"];
  let pending = types.length;
  let finished = false;
  const done = (err) => {
    if (finished) return;
    if (err) {
      finished = true;
      return res.status(500).json({ message: err.message || "Failed to sync invoice_no" });
    }
    pending -= 1;
    if (pending === 0) {
      finished = true;
      res.json({ message: "Branch updated" });
    }
  };
  types.forEach((t) => {
    const raw = starts[t];
    const startVal = raw !== undefined && raw !== "" && raw !== null ? raw : 1;
    ensureInvoiceNoRow(branchId, t, startVal, done);
  });
}

exports.getAll = (req, res) => {
  db.query("SELECT * FROM branches ORDER BY branch_name", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });

    if (!rows || !rows.length) return res.json([]);

    const branchIds = rows.map((b) => b.id);
    db.query(
      "SELECT * FROM branch_sequences WHERE branch_id IN (?)",
      [branchIds],
      (seqErr, seqRows) => {
        const seqMap = {};
        (seqRows || []).forEach((s) => {
          if (!seqMap[s.branch_id]) seqMap[s.branch_id] = {};
          seqMap[s.branch_id][s.sequence_type] = {
            prefix: s.prefix,
            last_number: s.last_number,
            start_number: s.start_number || 1,
          };
        });

        const result = rows.map((b) => ({
          ...b,
          sequences: seqMap[b.id] || {},
        }));
        res.json(result);
      },
    );
  });
};

exports.getById = (req, res) => {
  db.query("SELECT * FROM branches WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.json(null);

    const branch = rows[0];
    db.query(
      "SELECT * FROM branch_sequences WHERE branch_id = ?",
      [branch.id],
      (seqErr, seqRows) => {
        branch.sequences = {};
        (seqRows || []).forEach((s) => {
          branch.sequences[s.sequence_type] = {
            prefix: s.prefix,
            last_number: s.last_number,
            start_number: s.start_number || 1,
          };
        });
        res.json(branch);
      },
    );
  });
};

exports.create = (req, res) => {
  const {
    branch_name, branch_code, address, city, state, pincode,
    phone, email, gst_no, status,
    sale_prefix, quotation_prefix, purchase_prefix, receipt_prefix, proforma_prefix, delivery_challan_prefix,
    sale_start, quotation_start, purchase_start, receipt_start, proforma_start, delivery_challan_start,
  } = req.body;

  if (!branch_name?.trim()) return res.status(400).json({ message: "Branch name is required" });
  if (!branch_code?.trim()) return res.status(400).json({ message: "Branch code is required" });

  const code = branch_code.trim().toUpperCase();

  db.query(
    `INSERT INTO branches (branch_name, branch_code, address, city, state, pincode, phone, email, gst_no, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [branch_name.trim(), code, address || null, city || null, state || null, pincode || null, phone || null, email || null, gst_no || null, status || "Active"],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Branch code already exists" });
        return res.status(500).json({ message: err.message });
      }

      const branchId = result.insertId;
      const saleP = (sale_prefix || `SE-`).trim();
      const quoP = (quotation_prefix || `SE-QUO-`).trim();
      const purP = (purchase_prefix || `SE-PUR-`).trim();
      const recP = (receipt_prefix || `SE-REC-`).trim();
      const profP = (proforma_prefix || `SE-PRO-`).trim();
      const dcP = (delivery_challan_prefix || `SE-DC-`).trim();

      const seqVals = [
        [branchId, "sale",             saleP, parseInt(sale_start, 10) || 1,             0],
        [branchId, "quotation",        quoP,  parseInt(quotation_start, 10) || 1,        0],
        [branchId, "purchase",         purP,  parseInt(purchase_start, 10) || 1,         0],
        [branchId, "receipt",          recP,  parseInt(receipt_start, 10) || 1,          0],
        [branchId, "proforma",         profP, parseInt(proforma_start, 10) || 1,         0],
        [branchId, "delivery_challan", dcP,   parseInt(delivery_challan_start, 10) || 1, 0],
      ];

      const saleN = parseInt(sale_start, 10);
      const quoN = parseInt(quotation_start, 10);
      const purN = parseInt(purchase_start, 10);
      const recN = parseInt(receipt_start, 10);
      const profN = parseInt(proforma_start, 10);
      const dcN = parseInt(delivery_challan_start, 10);
      
      const invVals = [
        [branchId, "sale",             initialSerialFromStartNumber(Number.isFinite(saleN) ? saleN : 1)],
        [branchId, "quotation",        initialSerialFromStartNumber(Number.isFinite(quoN) ? quoN : 1)],
        [branchId, "purchase",         initialSerialFromStartNumber(Number.isFinite(purN) ? purN : 1)],
        [branchId, "receipt",          initialSerialFromStartNumber(Number.isFinite(recN) ? recN : 1)],
        [branchId, "proforma",         initialSerialFromStartNumber(Number.isFinite(profN) ? profN : 1)],
        [branchId, "delivery_challan", initialSerialFromStartNumber(Number.isFinite(dcN) ? dcN : 1)],
      ];
      db.query(
        `INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, start_number, last_number) VALUES ?`,
        [seqVals],
        (seqErr) => {
          if (seqErr) {
            return res.status(500).json({ message: seqErr.message || "Failed to create branch sequences" });
          }
          db.query(
            `INSERT INTO invoice_no (branch_id, bill_type, serial_no) VALUES ?`,
            [invVals],
            (invErr) => {
              if (invErr) {
                return res.status(500).json({ message: invErr.message || "Failed to create invoice counters" });
              }
              res.json({ message: "Branch created", id: branchId });
            },
          );
        },
      );
    },
  );
};

exports.update = (req, res) => {
  const { id } = req.params;
  const {
    branch_name, branch_code, address, city, state, pincode,
    phone, email, gst_no, status,
    sale_prefix, quotation_prefix, purchase_prefix, receipt_prefix, proforma_prefix, delivery_challan_prefix,
    sale_start, quotation_start, purchase_start, receipt_start, proforma_start, delivery_challan_start,
  } = req.body;

  db.query(
    `UPDATE branches SET branch_name=?, branch_code=?, address=?, city=?, state=?, pincode=?, phone=?, email=?, gst_no=?, status=? WHERE id=?`,
    [branch_name, branch_code?.toUpperCase(), address || null, city || null, state || null, pincode || null, phone || null, email || null, gst_no || null, status || "Active", id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Branch code already exists" });
        return res.status(500).json({ message: err.message });
      }

      const updates = [
        { type: "sale",             prefix: sale_prefix,             start: sale_start },
        { type: "quotation",        prefix: quotation_prefix,        start: quotation_start },
        { type: "purchase",         prefix: purchase_prefix,         start: purchase_start },
        { type: "receipt",          prefix: receipt_prefix,          start: receipt_start },
        { type: "proforma",         prefix: proforma_prefix,         start: proforma_start },
        { type: "delivery_challan", prefix: delivery_challan_prefix, start: delivery_challan_start },
      ];

      const seqJobs = updates.filter((u) => u.prefix !== undefined || u.start !== undefined);
      const finishSequences = () => {
        syncInvoiceNoRowsAfterBranchSave(id, req.body, res);
      };

      if (!seqJobs.length) {
        return finishSequences();
      }

      let left = seqJobs.length;
      seqJobs.forEach(({ type, prefix, start }) => {
        const sets = [];
        const vals = [];
        if (prefix !== undefined) {
          sets.push("prefix = ?");
          vals.push(prefix);
        }
        if (start !== undefined) {
          sets.push("start_number = ?");
          vals.push(parseInt(start, 10) || 1);
        }

        db.query(
          "SELECT id FROM branch_sequences WHERE branch_id = ? AND sequence_type = ?",
          [id, type],
          (selErr, selRows) => {
            if (selErr) {
              return res.status(500).json({ message: selErr.message || "Failed to check branch sequences" });
            }
            if (selRows && selRows.length > 0) {
              const updVals = [...vals, id, type];
              db.query(
                `UPDATE branch_sequences SET ${sets.join(", ")} WHERE branch_id = ? AND sequence_type = ?`,
                updVals,
                (qErr) => {
                  if (qErr) {
                    return res.status(500).json({ message: qErr.message || "Failed to update branch sequences" });
                  }
                  left -= 1;
                  if (left === 0) finishSequences();
                }
              );
            } else {
              db.query(
                "INSERT INTO branch_sequences (branch_id, sequence_type, prefix, start_number, last_number) VALUES (?, ?, ?, ?, 0)",
                [id, type, prefix || "", parseInt(start, 10) || 1],
                (insErr) => {
                  if (insErr) {
                    return res.status(500).json({ message: insErr.message || "Failed to insert branch sequences" });
                  }
                  left -= 1;
                  if (left === 0) finishSequences();
                }
              );
            }
          }
        );
      });
    },
  );
};

exports.remove = (req, res) => {
  db.query("DELETE FROM branches WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Branch deleted" });
  });
};

exports.getNextNumber = (req, res) => {
  const branchId = req.branchId || req.query.branch_id;
  let type = req.query.type || "sale";
  if (req.isNonUser && (!req.query.type || req.query.type === "sale")) {
    type = "non_gst_sale";
  }

  if (!branchId) return res.status(400).json({ message: "Branch is required" });

  peekFormatted(branchId, type, (peekErr, data) => {
    if (peekErr) return res.status(400).json({ message: peekErr.message || "Could not compute next number" });
    if (!data?.next_number) return res.status(400).json({ message: "Branch sequence not configured" });
    bumpSerialAtLeast(branchId, type, data.raw, (bumpErr) => {
      if (bumpErr) return res.status(500).json({ message: bumpErr.message });
      db.query(
        `UPDATE branch_sequences SET last_number = GREATEST(COALESCE(last_number, 0), ?) WHERE branch_id = ? AND sequence_type = ?`,
        [data.raw, branchId, type],
        () => res.json(data),
      );
    });
  });
};

exports.peekNextNumber = (req, res) => {
  const branchId = req.branchId || req.query.branch_id;
  let type = req.query.type || "sale";
  if (req.isNonUser && (!req.query.type || req.query.type === "sale")) {
    type = "non_gst_sale";
  }

  if (!branchId) return res.status(400).json({ message: "Branch is required" });

  peekFormatted(branchId, type, (err, data) => {
    if (err) return res.status(400).json({ message: err.message || "Could not peek next number" });
    res.json(data);
  });
};

exports.syncSequenceAfterSave = (branchId, sequenceType, documentNo, cb) => {
  const done = typeof cb === "function" ? cb : () => {};
  if (!branchId || documentNo == null || documentNo === "") return done();
  const doc = String(documentNo).trim();
  db.query(
    "SELECT prefix, last_number FROM branch_sequences WHERE branch_id = ? AND sequence_type = ?",
    [branchId, sequenceType],
    (err, rows) => {
      if (err || !rows || !rows.length) return done();
      const { prefix, last_number } = rows[0];
      const cleanDoc = doc.replace(/(\d{4}-\d{2})|(\d{2}-\d{2})/g, "");
      const digits = cleanDoc.replace(/\D/g, "");
      const num = parseInt(digits || "0", 10);
      if (!Number.isFinite(num) || num < 1) return done();
      const prev = Number(last_number) || 0;
      const newLast = Math.max(prev, num);
      const afterSeq = () => {
        bumpSerialAtLeast(branchId, sequenceType, num, () => done());
      };
      if (newLast === prev) return afterSeq();
      db.query(
        "UPDATE branch_sequences SET last_number = ? WHERE branch_id = ? AND sequence_type = ?",
        [newLast, branchId, sequenceType],
        afterSeq,
      );
    },
  );
};

exports.syncSequenceEndpoint = (req, res) => {
  const { branch_id, type, document_no } = req.body;
  const branchId = branch_id || req.branchId;
  if (!branchId || !type || !document_no) {
    return res.status(400).json({ message: "branch_id, type, and document_no are required" });
  }
  exports.syncSequenceAfterSave(branchId, type, document_no, (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Sequence synced successfully" });
  });
};
