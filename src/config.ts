// src/config.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const env = process.env.NODE_ENV || 'development';

const envFiles = [
  `.env.${env}.local`, 
  `.env.${env}`,       
  '.env.local',        
  '.env',              
];

let envLoaded = false;
for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    console.log(`✅ Loaded env file: ${file}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ No .env file loaded. Ensure environment variables are set or a .env file exists.');
}