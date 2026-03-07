const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// Ensure the variables aren't strictly undefined
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';
const scriptUrl = process.env.SCRIPT_URL || '';

const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  geminiApiKey: '${geminiKey}',
  googleScriptUrl: '${scriptUrl}'
};`;

// Write to BOTH files to bypass Angular's file replacement rules
fs.writeFileSync(path.join(envDir, 'environment.ts'), envConfigFile);
fs.writeFileSync(path.join(envDir, 'environment.development.ts'), envConfigFile);

console.log('✅ Vercel Environment files generated successfully!');
if (!supabaseUrl) {
  console.warn('⚠️ WARNING: SUPABASE_URL was empty during the build!');
}