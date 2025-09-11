import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { db } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await db.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created with Row Level Security enabled');
    
    // Insert default game presets
    await db.query(`
      INSERT INTO game_presets (id, coach_id, name, periods, period_minutes, has_overtime, overtime_minutes, is_default, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), NULL, 'Senior Game', 2, 25, true, 5, true, NOW(), NOW()),
        (uuid_generate_v4(), NULL, 'Junior Game', 2, 20, false, NULL, true, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Default game presets added');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();