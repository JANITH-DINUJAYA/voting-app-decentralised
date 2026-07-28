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

    const result = await sql`
      UPDATE users 
      SET kyc_status = ${status}
      WHERE LOWER(wallet_address) = ${targetAddress.toLowerCase()}
      RETURNING username, role, full_name as "fullName", email, wallet_address as "walletAddress", kyc_status as "kycStatus", nic_photo as "nicPhoto", bio
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'No user found with that wallet address.' });
    }

    return res.status(200).json({ 
      message: 'KYC status successfully updated in Neon database profile.',
      user: result[0]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database update failure: ${err.message}` });
  }
}
