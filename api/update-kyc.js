import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const { username, nicPhoto, bio } = req.body;

  if (!username || !nicPhoto) {
    return res.status(400).json({ error: 'Missing required KYC parameters.' });
  }

  try {
    await initializeDatabase();

    await sql`
      UPDATE users 
      SET 
        nic_photo = ${nicPhoto}, 
        bio = ${bio || ''},
        kyc_status = 'PENDING'
      WHERE LOWER(username) = ${username.toLowerCase()}
    `;

    return res.status(200).json({ message: 'KYC registration successfully saved to Neon database profile.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database update failure: ${err.message}` });
  }
}
