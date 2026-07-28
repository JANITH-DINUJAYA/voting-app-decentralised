import { sql, initializeDatabase } from './db.js';

export default async function handler(req, res) {
  await initializeDatabase();

  if (req.method === 'GET') {
    try {
      const blocks = await sql`
        SELECT 
          block_index as "index",
          timestamp,
          transactions,
          previous_hash as "previousHash",
          hash,
          nonce
        FROM blocks
        ORDER BY block_index ASC
      `;
      return res.status(200).json(blocks);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: `Failed to fetch blocks: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    const { index, timestamp, transactions, previousHash, hash, nonce } = req.body;

    if (index === undefined || !timestamp || !transactions || !previousHash || !hash || nonce === undefined) {
      return res.status(400).json({ error: 'Missing block payload details.' });
    }

    try {
      // Insert new block
      await sql`
        INSERT INTO blocks (block_index, timestamp, transactions, previous_hash, hash, nonce)
        VALUES (${index}, ${timestamp.toString()}, ${JSON.stringify(transactions)}, ${previousHash}, ${hash}, ${nonce})
        ON CONFLICT (block_index) DO NOTHING
      `;

      // Remove transactions from mempool that are included in this block
      if (transactions.length > 0) {
        for (const tx of transactions) {
          // Delete matching transaction from database mempool
          await sql`
            DELETE FROM mempool 
            WHERE LOWER(sender) = ${tx.sender.toLowerCase()} 
              AND nonce = ${tx.nonce}
          `;
        }
      }

      return res.status(200).json({ message: 'Block successfully registered on Neon cloud ledger.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: `Failed to save block: ${err.message}` });
    }
  }

  return res.status(455).json({ error: 'Method Not Allowed' });
}
