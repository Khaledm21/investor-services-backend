// setup-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Khaled.2003',
};

const targetDbName = process.env.DB_NAME || 'investor_services_db';

async function setupDatabase() {
  console.log('====================================================');
  console.log('🚀 Initializing Investor Services Database Setup...');
  console.log('====================================================');

  let targetClient;

  if (process.env.DATABASE_URL) {
    console.log('📡 Using DATABASE_URL connection string...');
    targetClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    // Step 1: Connect to default postgres DB to ensure target DB exists
    const rootClient = new Client({
      ...dbConfig,
      database: 'postgres',
    });

    try {
      console.log(`📡 Connecting to PostgreSQL host: ${dbConfig.host}:${dbConfig.port}...`);
      await rootClient.connect();

      const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
      const res = await rootClient.query(checkDbQuery, [targetDbName]);

      if (res.rowCount === 0) {
        console.log(`📦 Database "${targetDbName}" does not exist. Creating...`);
        await rootClient.query(`CREATE DATABASE "${targetDbName}";`);
        console.log(`✅ Database "${targetDbName}" created successfully!`);
      } else {
        console.log(`ℹ️  Database "${targetDbName}" already exists.`);
      }
    } catch (err) {
      console.error('❌ Error checking/creating database:', err.message);
      process.exit(1);
    } finally {
      await rootClient.end();
    }

    targetClient = new Client({
      ...dbConfig,
      database: targetDbName,
    });
  }

  try {
    await targetClient.connect();
    console.log(`🔗 Connected directly to target database.`);


    // Step 3: Run Schema SQL
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Executing database/schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await targetClient.query(schemaSql);
      console.log('✅ Tables, triggers, and indexes created successfully!');
    } else {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    // Step 4: Run Seed SQL
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Executing database/seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await targetClient.query(seedSql);
      console.log('✅ Seed data inserted successfully!');
    } else {
      throw new Error(`Seed file not found at ${seedPath}`);
    }

    // Step 5: Verify Admin User and Password Hash
    const adminCheck = await targetClient.query(
      `SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = 'admin';`
    );

    if (adminCheck.rowCount > 0) {
      const admin = adminCheck.rows[0];
      const isPasswordValid = bcrypt.compareSync('Admin@1234', admin.password_hash);

      if (isPasswordValid) {
        console.log('🔒 Admin user verified successfully:');
        console.log(`   - Username: ${admin.username}`);
        console.log(`   - Role: ${admin.role}`);
        console.log(`   - Password: Admin@1234 (Verified bcrypt hash match)`);
      } else {
        console.log('⚠️  Password hash mismatch! Re-hashing password with bcrypt (rounds: 12)...');
        const freshHash = bcrypt.hashSync('Admin@1234', 12);
        await targetClient.query(
          `UPDATE users SET password_hash = $1 WHERE username = 'admin'`,
          [freshHash]
        );
        console.log('✅ Admin password updated with validated bcrypt hash!');
      }
    } else {
      console.warn('⚠️ Admin user not found after seeding!');
    }

    // Print summary stats
    const usersCount = (await targetClient.query('SELECT count(*) FROM users;')).rows[0].count;
    const clientsCount = (await targetClient.query('SELECT count(*) FROM clients;')).rows[0].count;
    const servicesCount = (await targetClient.query('SELECT count(*) FROM services;')).rows[0].count;
    const opsCount = (await targetClient.query('SELECT count(*) FROM operations;')).rows[0].count;

    console.log('====================================================');
    console.log('🎉 Database Setup Completed Successfully!');
    console.log(`   - Users:      ${usersCount}`);
    console.log(`   - Clients:    ${clientsCount}`);
    console.log(`   - Services:   ${servicesCount}`);
    console.log(`   - Operations: ${opsCount}`);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error executing schema/seed:', err.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

setupDatabase();
