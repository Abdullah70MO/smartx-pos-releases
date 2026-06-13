import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateLicenseFile(keyData, hwid, expiresAt) {
  const data = {
    key: keyData.key_string,
    hwid,
    licenseType: keyData.license_type,
    expiresAt: expiresAt?.toISOString() || null,
    activatedAt: new Date().toISOString(),
    signature: ''
  };
  data.signature = crypto
    .createHmac('sha256', process.env.LICENSE_SIGNING_KEY)
    .update(JSON.stringify(data))
    .digest('hex');
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, hwid } = req.body;
  if (!key || !hwid) {
    return res.status(400).json({ error: 'Missing key or hwid' });
  }

  try {
    const { data: licenseKey, error: keyError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('key_string', key)
      .single();

    if (keyError || !licenseKey) {
      return res.status(404).json({ valid: false, error: 'مفتاح غير صالح' });
    }

    if (!licenseKey.is_active) {
      return res.status(200).json({ valid: false, reason: 'revoked', error: 'تم إلغاء تفعيل المفتاح' });
    }

    const { data: activation } = await supabase
      .from('activations')
      .select('*')
      .eq('key_id', licenseKey.id)
      .eq('hwid', hwid)
      .eq('is_active', true)
      .single();

    if (!activation) {
      return res.status(200).json({ valid: false, reason: 'not_activated', error: 'هذا الجهاز غير مفعل بهذا المفتاح' });
    }

    const now = new Date();
    let expired = false;

    if (licenseKey.license_type !== 'lifetime' && licenseKey.expires_at) {
      expired = new Date(licenseKey.expires_at) < now;
    }

    if (expired) {
      return res.status(200).json({ valid: false, reason: 'expired', error: 'انتهت صلاحية الترخيص' });
    }

    let expiresAt = null;
    if (licenseKey.license_type !== 'lifetime' && licenseKey.expires_at) {
      expiresAt = new Date(licenseKey.expires_at);
    }

    const freshLicenseFile = generateLicenseFile(licenseKey, hwid, expiresAt);

    await supabase
      .from('activations')
      .update({ last_seen_at: new Date().toISOString(), license_file: freshLicenseFile })
      .eq('id', activation.id);

    return res.status(200).json({
      valid: true,
      licenseType: licenseKey.license_type,
      expiresAt: licenseKey.expires_at,
      licenseFile: freshLicenseFile
    });
  } catch (error) {
    console.error('Check error:', error);
    return res.status(500).json({ error: 'خطأ في السيرفر' });
  }
}