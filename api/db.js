import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("WARNING: DATABASE_URL environment variable is missing. Connect Neon database in .env or Vercel dashboard.");
}

export const sql = neon(databaseUrl || "");

/**
 * Automatically creates tables and seeds default user profiles if not present.
 */
export async function initializeDatabase() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL variable is not configured. Please define it in your Vercel/local environment settings.");
  }

  // Create users schema table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      wallet_address VARCHAR(100),
      wallet_private_key TEXT,
      wallet_public_key TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Seed default admin, voter, and candidate users if empty
  const countRes = await sql`SELECT count(*) as count FROM users`;
  const userCount = parseInt(countRes[0].count, 10);

  if (userCount === 0) {
    console.log("Seeding Neon database with sandbox demo users...");
    
    // Seed Admin
    await sql`
      INSERT INTO users (username, password_hash, role, full_name, email, wallet_address, wallet_private_key, wallet_public_key)
      VALUES (
        'admin', 
        'admin', 
        'ADMIN', 
        'System Administrator', 
        'admin@votechain.net', 
        '0xe513658465d6997d28be6460851b77dc703bf13a',
        '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b020101042013c369ba077f7a330f47615b5e75248e53187fd49eed9df27205c24edf072b2aa14403420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9',
        '3059301306072a8648ce3d020106082a8648ce3d03010703420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9'
      )
    `;

    // Seed Voter
    await sql`
      INSERT INTO users (username, password_hash, role, full_name, email, wallet_address, wallet_private_key, wallet_public_key)
      VALUES (
        'voter', 
        'voter', 
        'VOTER', 
        'Demo Voter Profile', 
        'voter@votechain.net', 
        '0x5a54ae7355004c6834bb619bc411a2c1bb71fb91',
        '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b020101042037d182389d0763c9898910cef4b767b083c6a1588565021e32e022851608f2c6a14403420004dfb2a82844c4f6f6b0ce4c11bda1cdbd404201787f6ba69692ea9de98412e8ea7fd4ee32891c1e40ea89d9a3e2ed9314c21dcc3600ece8a527fb86e1d658d4d1',
        '3059301306072a8648ce3d020106082a8648ce3d03010703420004dfb2a82844c4f6f6b0ce4c11bda1cdbd404201787f6ba69692ea9de98412e8ea7fd4ee32891c1e40ea89d9a3e2ed9314c21dcc3600ece8a527fb86e1d658d4d1'
      )
    `;

    // Seed Candidate
    await sql`
      INSERT INTO users (username, password_hash, role, full_name, email, wallet_address, wallet_private_key, wallet_public_key)
      VALUES (
        'candidate', 
        'candidate', 
        'CANDIDATE', 
        'Demo Candidate platform', 
        'candidate@votechain.net', 
        '0x1fc1a0c3e8f4f0713ec2a921120765fca726cafb',
        '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420bbad54903c36aa68d8705d620444ee2e2ffacc4fc53fbf5fbd531573781ad342a14403420004fa6f63b3486b75e8ac8308008a2c78d4cefb55a946b83586c0c100259fc2798fdb8faaf9e88428856df4f594e224d008efc4b2208c840559cb754cb6a022aeb9',
        '3059301306072a8648ce3d020106082a8648ce3d03010703420004fa6f63b3486b75e8ac8308008a2c78d4cefb55a946b83586c0c100259fc2798fdb8faaf9e88428856df4f594e224d008efc4b2208c840559cb754cb6a022aeb9'
      )
    `;
  }
}
