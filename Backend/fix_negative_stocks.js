const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");
db.query("UPDATE products SET qty = 0 WHERE qty < 0", (err, res1) => {
  if (err) console.error("Failed to fix products qty:", err);
  else console.log("Products reset count:", res1.affectedRows);
  
  db.query("UPDATE stocks SET quantity = 0 WHERE quantity < 0", (err, res2) => {
    if (err) console.error("Failed to fix stocks quantity:", err);
    else console.log("Stocks reset count:", res2.affectedRows);
    
    process.exit();
  });
});
