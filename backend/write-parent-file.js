const fs = require('fs');
const path = require('path');

const targetRelativePath = process.argv[2];
const contentFilePath = process.argv[3];

if (!targetRelativePath || !contentFilePath) {
  console.error('Usage: node write-parent-file.js <targetRelativePath> <contentFilePath>');
  process.exit(1);
}

const targetPath = path.resolve(__dirname, targetRelativePath);
const content = fs.readFileSync(path.resolve(__dirname, contentFilePath), 'utf8');

// Ensure parent dir exists
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, 'utf8');
console.log(`Successfully wrote to ${targetPath}`);
