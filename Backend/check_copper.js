const db = require("./config/db");

async function check() {
  db.query("SELECT * FROM purchase_items WHERE product_id = 1", (err, pi) => {
    if (err) throw err;
    console.log("PURCHASE_ITEMS:", pi);

    db.query("SELECT * FROM transaction_sell_lines WHERE product_id = 1", (err, sl) => {
      console.log("SELL_LINES:", sl);
      
      db.query("SELECT * FROM stock_in WHERE product_id = 1", (err, sl2) => {
        console.log("STOCK_IN:", sl2);
        
        db.query("SELECT * FROM stocks WHERE product_id = 1", (err, sl3) => {
           console.log("STOCKS:", sl3);
           process.exit(0);
        });
      });
    });
  });
}

check();
