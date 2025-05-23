import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 🧠 Dynamically load the correct .env.* file
const env = process.env.NODE_ENV || 'development';

const envFiles = [
  `.env.${env}.local`,
  `.env.${env}`,
  '.env.local',
  '.env',
];

for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    console.log(`✅ Loaded env file: ${file}`);
    break;
  }
}

import app from './app';

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
