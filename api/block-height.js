import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  try {
    await initializeDatabase();
    const countResult = await sql`SELECT COUNT(*)::integer as height FROM blocks`;
    const height = countResult[0]?.height || 0;
    return res.status(200).json({ height });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Failed to fetch block height: ${err.message}` });
  }
}
