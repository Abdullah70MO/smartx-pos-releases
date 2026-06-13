import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_DASHBOARD_KEY) return res.status(403).json({ error: 'Unauthorized' })

  const { data, error } = await supabase
    .from('license_keys')
    .select('*, activations(*)')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ keys: data })
}
