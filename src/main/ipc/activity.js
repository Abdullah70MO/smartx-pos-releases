const crypto = require('node:crypto')

function logActivity(realm, session, { action, details }) {
  realm.write(() => {
    realm.create('ActivityLog', {
      _id: crypto.randomUUID(),
      userId: session.userId,
      userName: session.name,
      action: action,
      details: details || '',
      createdAt: new Date()
    })
  })
}

function listActivity(realm) {
  const logs = realm.objects('ActivityLog').sorted('createdAt', true)
  return Array.from(logs).map(l => ({
    _id: l._id, userId: l.userId, userName: l.userName,
    action: l.action, details: l.details,
    createdAt: l.createdAt?.toISOString()
  }))
}

module.exports = { logActivity, listActivity }
