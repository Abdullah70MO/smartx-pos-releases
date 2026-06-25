const bcrypt = require('bcryptjs')
const crypto = require('node:crypto')

let sessions = new Map()

function comparePassword(inputPassword, storedHash) {
  if (!storedHash) return false
  try {
    return bcrypt.compareSync(String(inputPassword || ''), String(storedHash))
  } catch (err) {
    console.warn('Password hash comparison failed:', err?.message || err)
    return false
  }
}

function login(realm, { username, password }) {
  const user = realm.objects('User').filtered('username == $0', username.toLowerCase())[0]
  if (!user) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
  if (!user.active) throw new Error('هذا الحساب غير نشط')
  if (!comparePassword(password, user.passwordHash)) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')

  if (user.employeeId) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const existing = realm.objects('AttendanceLog').filtered('employeeId == $0 AND date == $1', user.employeeId, today)[0]
    if (!existing) {
      realm.write(() => {
        realm.create('AttendanceLog', {
          _id: crypto.randomUUID(),
          employeeId: user.employeeId,
          date: today,
          status: 'present',
          loginTime: new Date(),
          source: 'auto',
          note: ''
        })
      })
    }
  }
  const token = crypto.randomUUID()
  sessions.set(token, {
    userId: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    permissions: [...user.permissions],
    employeeId: user.employeeId || null
  })
  return { token, user: { _id: user._id, name: user.name, username: user.username, role: user.role, permissions: [...user.permissions], employeeId: user.employeeId || null } }
}

function getSession(token) {
  const session = sessions.get(token)
  if (!session) return null
  return session
}

function logout(token) {
  sessions.delete(token)
  return true
}

function requireUser(token, permission, realm) {
  const session = sessions.get(token)
  if (!session) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى')
  if (realm) {
    const user = realm.objectForPrimaryKey('User', session.userId)
    if (!user || !user.active) {
      sessions.delete(token)
      throw new Error('تم تعطيل هذا الحساب')
    }
  }
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    if (!perms.some(p => session.permissions.includes(p)) && session.role !== 'admin') {
      throw new Error('ليس لديك صلاحية للقيام بهذا الإجراء')
    }
  }
  return session
}

function getSecurityQuestion(realm, username) {
  const user = realm.objects('User').filtered('username == $0', (username || '').trim().toLowerCase())[0]
  if (!user || !user.securityQuestion) return null
  return { question: user.securityQuestion, hasHint: !!user.passwordHint, hint: user.passwordHint || '' }
}

function verifySecurityAnswer(realm, username, answer) {
  const user = realm.objects('User').filtered('username == $0', (username || '').trim().toLowerCase())[0]
  if (!user || !user.securityAnswerHash) return false
  return comparePassword(answer || '', user.securityAnswerHash)
}

function resetPassword(realm, username, newPassword, answer) {
  const user = realm.objects('User').filtered('username == $0', (username || '').trim().toLowerCase())[0]
  if (!user) throw new Error('المستخدم غير موجود')
  if (!user.securityAnswerHash) throw new Error('لم يتم إعداد سؤال الأمان لهذا الحساب')
  if (!comparePassword(answer || '', user.securityAnswerHash)) throw new Error('إجابة سؤال الأمان غير صحيحة')
  if (!newPassword || newPassword.length < 4) throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
  realm.write(() => {
    user.passwordHash = bcrypt.hashSync(newPassword, 12)
  })
  return true
}

module.exports = { login, getSession, logout, requireUser, getSecurityQuestion, verifySecurityAnswer, resetPassword }
