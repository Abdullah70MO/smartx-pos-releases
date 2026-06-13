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
      .delete()
      .eq('key_id', licenseKey.id)
      .eq('hwid', hwid);

    if (error) {
      return res.status(500).json({ error: 'فشل في إلغاء التفعيل' });
    }

    // Recount active activations
    const { count } = await supabase
      .from('activations')
      .select('id', { count: 'exact', head: true })
      .eq('key_id', licenseKey.id)
      .eq('is_active', true)

    await supabase
      .from('license_keys')
      .update({
        current_activations: count,
        updated_at: new Date().toISOString()
      })
      .eq('id', licenseKey.id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Deactivate error:', error);
    return res.status(500).json({ error: 'خطأ في السيرفر' });
  }
}