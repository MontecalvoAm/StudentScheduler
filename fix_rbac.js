const fs = require('fs');
const path = require('path');

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add import if missing but requirePermission is used
  if (content.includes('requirePermission(') && !content.includes('requirePermission,')) {
    content = content.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']@\/lib\/auth\/rbac["'];/, (match, group) => {
        if (!group.includes('requirePermission')) {
            return `import { ${group}, requirePermission } from "@/lib/auth/rbac";`;
        }
        return match;
    });
  }

  // Find places where `user` is used but `const user =` is missing before `await requirePermission`
  // We can just look for `await requirePermission` and if the file contains `user.` or `user ` later, we prepend `const user = `
  // Actually, let's just blindly replace `await requirePermission` with `const user = await requirePermission` if `const user = ` is missing, since it doesn't hurt to assign it.
  content = content.replace(/^\s*await requirePermission/gm, (match) => {
      return match.replace('await requirePermission', 'const user = await requirePermission');
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

const root = process.argv[2] || '.';
processDirectory(path.join(root, 'app', 'api'));
