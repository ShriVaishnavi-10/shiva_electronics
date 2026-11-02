const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'purchase.controller.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. UPDATE deletePurchase
const deleteOld = `        "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
        [purchaseId],
        (loadErr, oldItems) => {
          if (loadErr) return rollback(loadErr);

          const adjustPromises = [];
          oldItems
            .filter((r) => r.product_id)
            .forEach((r) => {`;

const deleteNew = `        "SELECT status FROM purchases WHERE id = ?",
        [purchaseId],
        (statErr, statRows) => {
          if (statErr) return rollback(statErr);
          if (!statRows.length) return rollback(new Error("Purchase not found"));
          const currentStatus = statRows[0].status || 'Received';

          conn.query(
            "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
            [purchaseId],
            (loadErr, oldItems) => {
              if (loadErr) return rollback(loadErr);

              const adjustPromises = [];
              if (currentStatus === 'Received') {
                oldItems
                  .filter((r) => r.product_id)
                  .forEach((r) => {`;

let deleteEndOld = `              adjustPromises.push(
                new Promise((resolve, reject) => {
                  conn.query(
                    "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                    [q, r.product_id],
                    (e1) => {
                      if (e1) return reject(e1);
                      conn.query(
                        "UPDATE products SET qty = COALESCE(qty, 0) - ? WHERE id = ?",
                        [q, r.product_id],
                        (e2) => (e2 ? reject(e2) : resolve())
                      );
                    }
                  );
                })
              );
            });

          Promise.all(adjustPromises)
            .then(() => {
              // Remove related stock_in rows explicitly
              conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                if (delStockErr) return rollback(delStockErr);

                // Delete purchase (purchase_items will cascade if FK is configured)
                conn.query("DELETE FROM purchases WHERE id = ?", [purchaseId], (delPurErr, result) => {
                  if (delPurErr) return rollback(delPurErr);
                  if (result.affectedRows === 0) {
                    return rollback(new Error("Purchase not found"));
                  }
                  conn.commit((commitErr) => {
                    if (commitErr) return rollback(commitErr);
                    conn.release();
                    res.json({ message: "Purchase deleted successfully" });
                  });
                });
              });
            })
            .catch((adjErr) => rollback(adjErr));
        }
      );
    });
  });
};`;

const deleteEndNew = `                  adjustPromises.push(
                    new Promise((resolve, reject) => {
                      conn.query(
                        "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                        [q, r.product_id],
                        (e1) => {
                          if (e1) return reject(e1);
                          conn.query(
                            "UPDATE products SET qty = COALESCE(qty, 0) - ? WHERE id = ?",
                            [q, r.product_id],
                            (e2) => (e2 ? reject(e2) : resolve())
                          );
                        }
                      );
                    })
                  );
                });
              }

              Promise.all(adjustPromises)
                .then(() => {
                  // Remove related stock_in rows explicitly
                  conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                    if (delStockErr) return rollback(delStockErr);

                    // Delete purchase items explicitly just in case FK is missing
                    conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId], (delItemsErr) => {
                      if (delItemsErr) return rollback(delItemsErr);

                      // Delete purchase
                      conn.query("DELETE FROM purchases WHERE id = ?", [purchaseId], (delPurErr, result) => {
                        if (delPurErr) return rollback(delPurErr);
                        if (result.affectedRows === 0) {
                          return rollback(new Error("Purchase not found"));
                        }
                        conn.commit((commitErr) => {
                          if (commitErr) return rollback(commitErr);
                          conn.release();
                          res.json({ message: "Purchase deleted successfully" });
                        });
                      });
                    });
                  });
                })
                .catch((adjErr) => rollback(adjErr));
            }
          );
        }
      );
    });
  });
};`;

code = code.replace(deleteOld, deleteNew);
code = code.replace(deleteEndOld, deleteEndNew);

// 2. UPDATE updatePurchase
const updateStartOld = `exports.updatePurchase = (req, res) => {
  const purchaseId = req.params.id;
  const { vendor_id, payment_type, purchase_date, items, grandTotal: bodyGrandTotal } = req.body;`;

const updateStartNew = `exports.updatePurchase = (req, res) => {
  const purchaseId = req.params.id;
  const { vendor_id, payment_type, purchase_date, items, grandTotal: bodyGrandTotal, status } = req.body;
  const newStatus = status || 'Received';`;

const updateMidOld = `          const purchaseBranchId =
            brRows[0].branch_id != null ? brRows[0].branch_id : branchIdForInsert(req);

          // Load existing quantities to reverse stock impact
          conn.query(
            "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
            [purchaseId],
            (loadErr, oldItems) => {
              if (loadErr) return rollback(loadErr);

              const adjustPromises = [];

          oldItems
            .filter((r) => r.product_id)
            .forEach((r) => {`;

const updateMidNew = `          const purchaseBranchId =
            brRows[0].branch_id != null ? brRows[0].branch_id : branchIdForInsert(req);
          const oldStatus = brRows[0].status || 'Received';

          // Load existing quantities to reverse stock impact
          conn.query(
            "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
            [purchaseId],
            (loadErr, oldItems) => {
              if (loadErr) return rollback(loadErr);

              const adjustPromises = [];

              if (oldStatus === 'Received') {
                oldItems
                  .filter((r) => r.product_id)
                  .forEach((r) => {`;

const updateMid2Old = `              adjustPromises.push(
                new Promise((resolve, reject) => {
                  conn.query(
                    "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                    [q, r.product_id],
                    (e1) => {
                      if (e1) return reject(e1);
                      conn.query(
                        "UPDATE products SET qty = COALESCE(qty, 0) - ? WHERE id = ?",
                        [q, r.product_id],
                        (e2) => (e2 ? reject(e2) : resolve())
                      );
                    }
                  );
                })
              );
            });

          Promise.all(adjustPromises)
            .then(() => {
              // Delete old line items and stock_in rows
              conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                if (delStockErr) return rollback(delStockErr);

                conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId], (delItemsErr) => {
                  if (delItemsErr) return rollback(delItemsErr);

                  // Update purchase header
                  conn.query(
                    "UPDATE purchases SET vendor_id = ?, payment_type = ?, purchase_date = ? WHERE id = ?",
                    [vendor_id, payment_type, purchaseDateVal, purchaseId],`;

const updateMid2New = `                  adjustPromises.push(
                    new Promise((resolve, reject) => {
                      conn.query(
                        "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                        [q, r.product_id],
                        (e1) => {
                          if (e1) return reject(e1);
                          conn.query(
                            "UPDATE products SET qty = COALESCE(qty, 0) - ? WHERE id = ?",
                            [q, r.product_id],
                            (e2) => (e2 ? reject(e2) : resolve())
                          );
                        }
                      );
                    })
                  );
                });
              }

          Promise.all(adjustPromises)
            .then(() => {
              // Delete old line items and stock_in rows
              conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                if (delStockErr) return rollback(delStockErr);

                conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId], (delItemsErr) => {
                  if (delItemsErr) return rollback(delItemsErr);

                  // Update purchase header
                  conn.query(
                    "UPDATE purchases SET vendor_id = ?, payment_type = ?, purchase_date = ?, status = ? WHERE id = ?",
                    [vendor_id, payment_type, purchaseDateVal, newStatus, purchaseId],`;

const updateEndOld = `                            if (itemErr) return rollback(itemErr);

                            if (product_id) {
                              const insertStockInSql = \`
                                INSERT INTO stock_in (product_id, qty, purchase_price, total_purchase_price, selling_price, purchase_id, purchase_date, branch_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                              \`;`;

const updateEndNew = `                            if (itemErr) return rollback(itemErr);

                            if (product_id) {
                              if (newStatus === 'Ordered') {
                                completed++;
                                if (completed === totalItems) {
                                  conn.commit((commitErr) => {
                                    if (commitErr) return rollback(commitErr);
                                    conn.release();
                                    res.json({ message: "Purchase updated successfully", id: purchaseId });
                                  });
                                }
                              } else {
                              const insertStockInSql = \`
                                INSERT INTO stock_in (product_id, qty, purchase_price, total_purchase_price, selling_price, purchase_id, purchase_date, branch_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                              \`;`;

const updateVeryEndOld = `                                        (prodErr) => {
                                          if (prodErr) return rollback(prodErr);
                                          completed++;
                                          if (completed === totalItems) {
                                            conn.commit((commitErr) => {
                                              if (commitErr) return rollback(commitErr);
                                              conn.release();
                                              res.json({ message: "Purchase updated successfully", id: purchaseId });
                                            });
                                          }
                                        }
                                      );
                                    }
                                  );
                                }
                              );
                            } else {
                              completed++;`;

const updateVeryEndNew = `                                        (prodErr) => {
                                          if (prodErr) return rollback(prodErr);
                                          completed++;
                                          if (completed === totalItems) {
                                            conn.commit((commitErr) => {
                                              if (commitErr) return rollback(commitErr);
                                              conn.release();
                                              res.json({ message: "Purchase updated successfully", id: purchaseId });
                                            });
                                          }
                                        }
                                      );
                                    }
                                  );
                                }
                              );
                              }
                            } else {
                              completed++;`;

// Also fix the select branch_id in updatePurchase to include status
const selectBranchOld = `"SELECT branch_id FROM purchases WHERE id = ?",`;
const selectBranchNew = `"SELECT branch_id, status FROM purchases WHERE id = ?",`;


code = code.replace(updateStartOld, updateStartNew);
code = code.replace(selectBranchOld, selectBranchNew);
code = code.replace(updateMidOld, updateMidNew);
code = code.replace(updateMid2Old, updateMid2New);
code = code.replace(updateEndOld, updateEndNew);
code = code.replace(updateVeryEndOld, updateVeryEndNew);


fs.writeFileSync(filePath, code);
console.log('Update Complete');
