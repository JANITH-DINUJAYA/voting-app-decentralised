export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }
  return res.status(200).json({
    productionMode: process.env.PRODUCTION_MODE === 'true'
  });
}
