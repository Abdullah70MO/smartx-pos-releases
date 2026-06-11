const bcrypt = require('bcryptjs')
const crypto = require('node:crypto')

let sessions = new Map()

function login(realm, { username, password }) {
  const user = realm.objects('User').filtered('username == $0', username.toLowerCase())[0]
  if (!user) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
  if (!user.active) throw new Error('هذا الحساب غير نشط')
  if (!bcrypt.compareSync(password, user.passwordHash)) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')

  const token = crypto.randomUUID()
  sessions.set(token, {
    userId: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    permissions: [...user.permissions]
  })
  return { token, user: { _id: user._id, name: user.name, username: user.username, role: user.role, permissions: [...user.permissions] } }
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

function requireUser(token, permission) {
  const session = sessions.get(token)
  if (!session) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى')
  if (permission && !session.permissions.includes(permission) && session.role !== 'admin') {
    throw new Error('ليس لديك صلاحية للقيام بهذا الإجراء')
  }
  return session
}

module.exports = { login, getSession, logout, requireUser }
