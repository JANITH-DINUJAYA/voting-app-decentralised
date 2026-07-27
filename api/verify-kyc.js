import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const { targetAddress, approved } = req.body;

  if (!targetAddress) {
    return res.status(400).json({ error: 'Missing required target address parameter.' });
  }

  try {
    await initializeDatabase();

    const status = approved ? 'VERIFIED' : 'REJECTED';

    await sql`
      UPDATE users 
      SET 
        kyc_status = ${status}
      WHERE LOWER(wallet_address) = ${targetAddress.toLowerCase()}
    `;

    return res.status(200).json({ message: 'KYC status successfully updated in Neon database profile.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database update failure: ${err.message}` });
  }
}
