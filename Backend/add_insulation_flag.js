const db = require("./config/db");

const updateProductsTable = async () => {
  const query = `
    ALTER TABLE products 
    ADD COLUMN is_insulation_subfield BOOLEAN DEFAULT FALSE AFTER status
  `;

  try {
    await db.promise().query(query);
    console.log("Added is_insulation_subfield column to products table.");
  } catch (err) {
    console.error("Error updating products table:", err.message);
  }
  process.exit();
};

updateProductsTable();
