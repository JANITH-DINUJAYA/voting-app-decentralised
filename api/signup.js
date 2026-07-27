import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const { username, password, fullName, email, role } = req.body;

  if (!username || !password || !fullName || !email || !role) {
    return res.status(400).json({ error: 'Missing required credentials fields.' });
  }

  try {
    // 1. Initial schema sanity checks
    await initializeDatabase();

    // 2. Check if username exists
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${username.toLowerCase()}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // 3. Insert record
    const result = await sql`
      INSERT INTO users (username, password_hash, role, full_name, email)
      VALUES (${username.toLowerCase()}, ${password}, ${role}, ${fullName}, ${email})
      RETURNING username, role, full_name as "fullName", email
    `;

    return res.status(201).json(result[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: `Database signup failure: ${err.message}` });
  }
}
