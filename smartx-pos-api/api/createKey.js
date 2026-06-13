import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateKey() {
  const parts = []
  for (let i = 0; i < 4; i++) {
    const chunk = Math.random().toString(36).substring(2, 8).toUpperCase()
    parts.push(chunk)
  }
  return 'SMARTX-' + parts.join('-')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_DASHBOARD_KEY) return res.status(403).json({ error: 'Unauthorized' })

  const { license_type, notes } = req.body
  const keyString = generateKey()

  const { data, error } = await supabase
    .from('license_keys')
    .insert({
      key_string: keyString,
      license_type: license_type || 'lifetime',
      max_activations: 1,
      notes: notes || ''
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, key: data })
}
