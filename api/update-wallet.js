import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const { username, walletAddress, walletPrivateKey, walletPublicKey } = req.body;

  if (!username || !walletAddress || !walletPrivateKey || !walletPublicKey) {
    return res.status(400).json({ error: 'Missing required wallet parameters.' });
  }

  try {
    await initializeDatabase();

    // Check if another user is already using this wallet address
    const existing = await sql`
      SELECT username FROM users 
      WHERE wallet_address = ${walletAddress} AND LOWER(username) != ${username.toLowerCase()}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This blockchain address is already linked to another user profile.' });
    }

    await sql`
      UPDATE users 
      SET 
        wallet_address = ${walletAddress}, 
        wallet_private_key = ${walletPrivateKey}, 
        wallet_public_key = ${walletPublicKey} 
      WHERE LOWER(username) = ${username.toLowerCase()}
    `;

    return res.status(200).json({ message: 'Cryptographic wallet keys successfully bound to Neon database profile.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database update failure: ${err.message}` });
  }
}
