const crypto = require('node:crypto')
const { paginate } = require('../database')

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

function listActivity(realm, filter, page, pageSize) {
  let results = realm.objects('ActivityLog').sorted('createdAt', true)
  if (filter?.from) {
    const from = new Date(filter.from + 'T00:00:00')
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapLog = l => ({
    _id: l._id, userId: l.userId, userName: l.userName,
    action: l.action, details: l.details,
    createdAt: l.createdAt?.toISOString()
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapLog) }
  }
  return Array.from(results).map(mapLog)
}

module.exports = { logActivity, listActivity }
