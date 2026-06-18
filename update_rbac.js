const fs = require('fs');
const path = require('path');

// Maps route path segments to their ModuleKey
const moduleMap = {
  'departments': 'departments',
  'courses': 'courses',
  'subjects': 'subjects', // for /api/courses/subjects
  'rooms': 'rooms',
  'classes': 'classes',
  'schedules': 'schedules',
  'users': 'users',
  'roles': 'users',
  'audit-logs': 'audit-logs',
};

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

  // Find the module key based on the directory path
  let moduleKey = null;
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('/api/courses/subjects')) {
     moduleKey = 'subjects';
  } else {
    for (const [key, value] of Object.entries(moduleMap)) {
      if (normalizedPath.includes(`/api/${key}`) || normalizedPath.includes(`/api/admin/${key}`)) {
        moduleKey = value;
      }
    }
  }

  // Determine if it needs replacement
  if (moduleKey && content.includes('requireRole(')) {
    // Determine HTTP method to map to action
    
    // Replace GET
    content = content.replace(/(export async function GET\([^)]*\)\s*\{[\s\S]*?(?:await\s+)?)(?:const \w+ = await )?requireRole\(req,\s*ROLES\.(?:ADMIN|SUPER_ADMIN)\);/g, '$1await requirePermission(req, "' + moduleKey + '", "CanRead");');

    // Replace POST
    content = content.replace(/(export async function POST\([^)]*\)\s*\{[\s\S]*?(?:await\s+)?)(?:const \w+ = await )?requireRole\(req,\s*ROLES\.(?:ADMIN|SUPER_ADMIN)\);/g, '$1await requirePermission(req, "' + moduleKey + '", "CanCreate");');

    // Replace PUT / PATCH
    content = content.replace(/(export async function (?:PUT|PATCH)\([^)]*\)\s*\{[\s\S]*?(?:await\s+)?)(?:const \w+ = await )?requireRole\(req,\s*ROLES\.(?:ADMIN|SUPER_ADMIN)\);/g, '$1await requirePermission(req, "' + moduleKey + '", "CanUpdate");');

    // Replace DELETE
    content = content.replace(/(export async function DELETE\([^)]*\)\s*\{[\s\S]*?(?:await\s+)?)(?:const \w+ = await )?requireRole\(req,\s*ROLES\.(?:ADMIN|SUPER_ADMIN)\);/g, '$1await requirePermission(req, "' + moduleKey + '", "CanDelete");');

    // Also replace `const user = await requireRole(...)` if we need the user. We'll just replace the whole statement to assign to `user` just in case.
    // Wait, the above regex strips `const user = await`. Let's be careful.
    
    // Better replacement strategy:
    content = content.replace(/requireRole\(req,\s*ROLES\.(?:ADMIN|SUPER_ADMIN)\)/g, (match, offset, str) => {
        // Look backwards to see if we are in GET, POST, PUT, DELETE
        const before = str.substring(0, offset);
        let action = "CanRead";
        if (before.lastIndexOf("export async function POST") > before.lastIndexOf("export async function GET")) action = "CanCreate";
        if (before.lastIndexOf("export async function PUT") > before.lastIndexOf("export async function GET")) action = "CanUpdate";
        if (before.lastIndexOf("export async function PATCH") > before.lastIndexOf("export async function GET")) action = "CanUpdate";
        if (before.lastIndexOf("export async function DELETE") > before.lastIndexOf("export async function GET")) action = "CanDelete";
        
        return `requirePermission(req, "${moduleKey}", "${action}")`;
    });

    // Ensure requirePermission is imported
    if (content !== original) {
      if (!content.includes('requirePermission')) {
        content = content.replace(/import\s+\{\s*(.*?requireRole.*?)\s*\}\s+from\s+["']@\/lib\/auth\/rbac["'];/g, (match, imports) => {
           return match.replace(imports, imports + ", requirePermission");
        });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath} (Module: ${moduleKey})`);
    }
  }
}

const root = process.argv[2] || '.';
processDirectory(path.join(root, 'app', 'api'));
console.log('Done replacing API routes.');
