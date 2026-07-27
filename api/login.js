import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password input parameters.' });
  }

  try {
    // 1. Initial schema sanity checks
    await initializeDatabase();

    // 2. Fetch credentials
    const result = await sql`
      SELECT 
        username, 
        role, 
        full_name as "fullName", 
        email, 
        wallet_address as "walletAddress", 
        wallet_private_key as "walletPrivateKey", 
        wallet_public_key as "walletPublicKey",
        nic_photo as "nicPhoto",
        kyc_status as "kycStatus",
        bio
      FROM users 
      WHERE LOWER(username) = ${username.toLowerCase()} AND password_hash = ${password}
    `;

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password credentials.' });
    }

    return res.status(200).json(result[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database login failure: ${err.message}` });
  }
}
