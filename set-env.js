const fs = require('fs');
const path = require('path');

// 1. Ensure the environments folder exists
const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// 2. Build the environment string using Vercel's secure variables
const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL || ''}',
  supabaseKey: '${process.env.SUPABASE_KEY || ''}',
  geminiApiKey: '${process.env.GEMINI_API_KEY || ''}',
  googleScriptUrl: '${process.env.SCRIPT_URL || ''}'
};`;

// 3. Write the file safely before Angular boots up
fs.writeFileSync(path.join(envDir, 'environment.ts'), envConfigFile);
console.log('✅ Vercel Environment file generated successfully!');