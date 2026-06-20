const fs = require('fs');

const content = fs.readFileSync('C:/Users/Administrator/OneDrive/Desktop/SMART X V3/src/renderer/src/pages/SettingsPage.jsx', 'utf8');

const searchStr = "              )}\n\n              {selectedSection === 'data' && canManage && (";

const idx = content.indexOf(searchStr);

if (idx === -1) {
  console.log('NOT FOUND');
  process.exit(1);
}

const insertCode = `
              {selectedSection === 'notifications' && canManage && (
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text)',
                    marginBottom: '16px'
                  }}>تفعيل/تعطيل أنواع الإشعارات</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px'
                  }}>
                    {NOTIFICATION_TYPES.map(t => (
                      <div key={t.key} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: 'var(--bg)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--outline)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--bg2)',
                            color: 'var(--accent)'
                          }}>
                            {t.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: 'var(--text)'
                            }}>{t.label}</div>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text2)'
                            }}>{t.description}</div>
                          </div>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={notificationSettings[t.key === 'shifts' ? 'shifts' : t.key] || false}
                              onChange={e => setNotificationSettings(ns => ({
                                ...ns,
                                [t.key === 'shifts' ? 'shifts' : t.key]: e.target.checked
                              }))}
                              style={{
                                width: '20px',
                                height: '20px',
                                accentColor: 'var(--accent)'
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}\n`;

const newContent = content.slice(0, idx + searchStr.length) + '\n' + insertCode + content.slice(idx + searchStr.length);

fs.writeFileSync('C:/Users/Administrator/OneDrive/Desktop/SMART X V3/src/renderer/src/pages/SettingsPage.jsx', newContent, 'utf8');
console.log('Done!');