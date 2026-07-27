import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  try {
    await initializeDatabase();

    const pending = await sql`
      SELECT 
        username, 
        role, 
        full_name as "fullName", 
        email, 
        wallet_address as "walletAddress", 
        nic_photo as "nicPhoto", 
        kyc_status as "kycStatus",
        bio
      FROM users 
      WHERE kyc_status = 'PENDING'
      ORDER BY id DESC
    `;

    return res.status(200).json(pending);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database fetch failure: ${err.message}` });
  }
}
