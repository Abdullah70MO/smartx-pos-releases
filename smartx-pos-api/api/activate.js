import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateHwid(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

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
      return res.status(404).json({ error: 'مفتاح غير صالح' });
    }

    if (!licenseKey.is_active) {
      return res.status(403).json({ error: 'المفتاح معطل' });
    }

    if (licenseKey.current_activations >= licenseKey.max_activations) {
      const { data: existingActivations } = await supabase
        .from('activations')
        .select('*')
        .eq('key_id', licenseKey.id)
        .eq('hwid', hwid)
        .eq('is_active', true)
        .single();

      if (!existingActivations) {
        return res.status(403).json({ error: 'تم الوصول للحد الأقصى من التفعيلات' });
      }
    }

    let expiresAt = null;
    if (licenseKey.license_type !== 'lifetime') {
      const daysMap = {
        month: 30,
        quarter: 90,
        half_year: 180,
        year: 365
      };
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (daysMap[licenseKey.license_type] || 30));
    }

    const licenseFile = generateLicenseFile(licenseKey, hwid, expiresAt);

    const { error: activationError } = await supabase
      .from('activations')
      .upsert({
        key_id: licenseKey.id,
        hwid,
        device_name: req.body.device_name || 'Unknown',
        activated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        license_file: licenseFile
      }, {
        onConflict: 'key_id,hwid'
      });

    if (activationError) {
      return res.status(500).json({ error: 'فشل في تسجيل التفعيل' });
    }

    await supabase
      .from('license_keys')
      .update({ current_activations: licenseKey.current_activations + 1, updated_at: new Date().toISOString() })
      .eq('id', licenseKey.id);

    return res.status(200).json({
      success: true,
      licenseType: licenseKey.license_type,
      expiresAt: expiresAt?.toISOString(),
      licenseFile
    });
  } catch (error) {
    console.error('Activation error:', error);
    return res.status(500).json({ error: 'خطأ في السيرفر' });
  }
}