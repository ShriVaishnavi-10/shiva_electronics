const db = require("./config/db");

async function run() {
  try {
    const [branches] = await db.promise().query("SELECT id FROM branches");
    console.log("Found branches:", branches);
    
    // Types of sequences: sale, purchase, quotation, service, expense (maybe? let's check branch_sequences schema)
    // Actually, I can just find the maximum invoice numbers in the `transactions` table.
    
    // Let's first see what's in branch_sequences if it's not totally gone, or look at the schema.
    const [schema] = await db.promise().query("DESCRIBE branch_sequences");
    console.log("branch_sequences schema:", schema);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
