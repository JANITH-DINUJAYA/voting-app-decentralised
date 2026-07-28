import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  await initializeDatabase();

  if (req.method === 'GET') {
    try {
      const txs = await sql`
        SELECT 
          sender,
          recipient,
          type,
          payload,
          nonce,
          timestamp,
          public_key as "publicKey",
          signature
        FROM mempool
        ORDER BY id ASC
      `;
      return res.status(200).json(txs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: `Failed to fetch mempool: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    const { sender, recipient, type, payload, nonce, timestamp, publicKey, signature } = req.body;

    if (!sender || !recipient || !type || !payload || nonce === undefined || !timestamp || !publicKey || !signature) {
      return res.status(400).json({ error: 'Missing transaction attributes.' });
    }

    try {
      // Check if transaction with this sender and nonce already exists in mempool
      const exist = await sql`
        SELECT id FROM mempool 
        WHERE LOWER(sender) = ${sender.toLowerCase()} AND nonce = ${nonce}
      `;
      
      if (exist.length > 0) {
        return res.status(200).json({ message: 'Transaction already queued in mempool.' });
      }

      await sql`
        INSERT INTO mempool (sender, recipient, type, payload, nonce, timestamp, public_key, signature)
        VALUES (${sender}, ${recipient}, ${type}, ${JSON.stringify(payload)}, ${nonce}, ${timestamp}, ${publicKey}, ${signature})
      `;

      return res.status(200).json({ message: 'Transaction successfully broadcasted to Neon cloud mempool.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: `Failed to insert mempool transaction: ${err.message}` });
    }
  }

  return res.status(455).json({ error: 'Method Not Allowed' });
}
