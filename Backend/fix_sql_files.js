const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath);
  // Detect encoding (UTF-16LE vs UTF-8)
  let encoding = 'utf8';
  if (content[0] === 0xff && content[1] === 0xfe) {
    encoding = 'utf16le';
  }
  
  let text = content.toString(encoding);
  let original = text;
  
  // Replace purchase_no VARCHAR(20) case-insensitively
  text = text.replace(/purchase_no\s+VARCHAR\(20\)/gi, 'purchase_no VARCHAR(100)');
  // Replace prefix VARCHAR(20) case-insensitively for branch_sequences
  text = text.replace(/prefix\s+VARCHAR\(20\)/gi, 'prefix VARCHAR(100)');
  
  if (text !== original) {
    console.log(`Updating: ${filePath} (${encoding})`);
    fs.writeFileSync(filePath, text, encoding);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.sql') || file.endsWith('.json')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'migrations'));
walkDir(path.join(__dirname, 'sql'));
// Also let's check schema.json
if (fs.existsSync(path.join(__dirname, 'schema.json'))) {
  processFile(path.join(__dirname, 'schema.json'));
}

console.log("SQL and JSON files scan and update completed.");
