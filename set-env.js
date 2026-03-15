const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// Safely pull the variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';
const scriptUrl = process.env.SCRIPT_URL || '';
const virusTotalKey = process.env.VIRUSTOTAL_API_KEY || ''; 
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'SafeTech@2026';

// Notice how we removed the single quotes and wrapped the variables in JSON.stringify()
const prodEnvConfigFile = `export const environment = {
  production: true,
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseKey: ${JSON.stringify(supabaseKey)},
  geminiApiKey: ${JSON.stringify(geminiKey)},
  googleScriptUrl: ${JSON.stringify(scriptUrl)},
  virusTotalApiKey: ${JSON.stringify(virusTotalKey)},
  adminUsername: ${JSON.stringify(adminUsername)},
  adminPassword: ${JSON.stringify(adminPassword)}
};`;

// Production builds should not overwrite the local development environment file.
fs.writeFileSync(path.join(envDir, 'environment.ts'), prodEnvConfigFile);

console.log('✅ Vercel Environment files generated successfully!');
