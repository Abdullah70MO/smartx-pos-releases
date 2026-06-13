import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, hwid } = req.body;
  if (!key || !hwid) {
    return res.status(400).json({ error: 'Missing key or hwid' });
  }

  try {
    const { data: licenseKey } = await supabase
      .from('license_keys')
      .select('id')
      .eq('key_string', key)
      .single();

    if (!licenseKey) {
      return res.status(404).json({ error: 'مفتاح غير صالح' });
    }

    const { error } = await supabase
      .from('activations')
      .update({ is_active: false })
      .eq('key_id', licenseKey.id)
      .eq('hwid', hwid);

    if (error) {
      return res.status(500).json({ error: 'فشل في إلغاء التفعيل' });
    }

    await supabase
      .from('license_keys')
      .update({ 
        current_activations: Math.max(0, (await supabase.from('license_keys').select('current_activations').eq('id', licenseKey.id).single()).data?.current_activations - 1 || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', licenseKey.id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Deactivate error:', error);
    return res.status(500).json({ error: 'خطأ في السيرفر' });
  }
}