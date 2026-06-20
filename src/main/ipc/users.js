const Realm = require('realm')
const bcrypt = require('bcryptjs')
const crypto = require('node:crypto')

const ALL_PERMISSIONS = [
  'dashboard.view',
  'cashier.access',
  'cashier.return',
  'products.view',
  'products.manage',
  'purchases.view',
  'purchases.create',
  'purchases.delete',
  'sales.view',
  'sales.create',
  'sales.delete',
  'returns.view',
  'returns.create',
  'expenses.view',
  'expenses.manage',
  'users.view',
  'users.manage',
  'customers.view',
  'customers.manage',
  'customers.payments',
  'suppliers.view',
  'suppliers.manage',
  'suppliers.payments',
  'inventory.view',
  'inventory.adjust',
  'shifts.view',
  'shifts.manage',
  'activity.view',
  'settings.view',
  'settings.manage',
  'reports.view',
  'backup.manage',
  'treasury.view',
  'treasury.manage',
  'treasury.transfer',
  'employees.view',
  'employees.manage',
  'employees.salaries'
]

const ROLES = {
  admin: {
    label: 'مدير النظام',
    permissions: [...ALL_PERMISSIONS]
  },
  general_manager: {
    label: 'مدير عام',
    permissions: [
      'dashboard.view', 'cashier.access', 'cashier.return',
      'products.view', 'products.manage',
      'purchases.view', 'purchases.create',
      'sales.view', 'sales.create',
      'returns.view', 'returns.create',
      'expenses.view', 'expenses.manage',
      'customers.view', 'customers.manage', 'customers.payments',
      'suppliers.view', 'suppliers.manage', 'suppliers.payments',
      'inventory.view', 'inventory.adjust',
      'shifts.view', 'shifts.manage', 'activity.view',
      'settings.view', 'reports.view',
      'treasury.view', 'treasury.manage', 'treasury.transfer',
      'employees.view', 'employees.manage', 'employees.salaries'
    ]
  },
  supervisor: {
    label: 'مشرف',
    permissions: [
      'dashboard.view', 'cashier.access',
      'products.view', 'purchases.view',
      'sales.view', 'sales.create',
      'returns.view', 'returns.create',
      'expenses.view',
      'customers.view', 'suppliers.view',
      'inventory.view', 'shifts.view', 'shifts.manage',
      'activity.view', 'reports.view',
      'treasury.view',
      'employees.view'
    ]
  },
  cashier: {
    label: 'كاشير',
    permissions: [
      'dashboard.view', 'cashier.access', 'cashier.return',
      'products.view',
      'sales.create', 'returns.create',
      'expenses.manage',
      'customers.view', 'shifts.view', 'shifts.manage'
    ]
  },
  employee: {
    label: 'موظف',
    permissions: [
      'dashboard.view',
      'products.view',
      'sales.view', 'returns.view',
      'customers.view'
    ]
  }
}

function listUsers(realm) {
  const users = realm.objects('User').sorted('createdAt', true)
  return Array.from(users).map(u => ({
    _id: u._id, name: u.name, username: u.username,
    role: u.role, permissions: [...u.permissions],
    active: u.active, employeeId: u.employeeId || '',
    securityQuestion: u.securityQuestion || '',
    hasSecurityAnswer: !!(u.securityAnswerHash),
    passwordHint: u.passwordHint || '',
    createdAt: u.createdAt?.toISOString()
  }))
}

function saveUser(realm, data) {
  if (data.employeeId) {
    const existingOwner = realm.objects('User').filtered('employeeId == $0 AND _id != $1', data.employeeId, data._id || '')[0]
    if (existingOwner) throw new Error('هذا الموظف مرتبط بالفعل بحساب مستخدم آخر (' + existingOwner.name + ')')
  }
  let user
  realm.write(() => {
    const existing = data._id ? realm.objectForPrimaryKey('User', data._id) : null
    const role = data.role || 'cashier'
    const roleDef = ROLES[role]
    const permissions = role === 'admin'
      ? [...ALL_PERMISSIONS]
      : (data.permissions && data.permissions.length > 0 ? data.permissions : (roleDef ? [...roleDef.permissions] : []))
    const passwordHash = data.password && data.password.length > 0
      ? bcrypt.hashSync(data.password, 12)
      : existing
        ? existing.passwordHash
        : bcrypt.hashSync('12345678', 12)

    const securityAnswerHash = data.securityAnswer && data.securityAnswer.length > 0
      ? bcrypt.hashSync(data.securityAnswer, 12)
      : existing
        ? existing.securityAnswerHash
        : ''

    user = realm.create('User', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      username: data.username.trim().toLowerCase(),
      passwordHash,
      role,
      permissions,
      active: data.active !== false,
      employeeId: data.employeeId || null,
      securityQuestion: data.securityQuestion || existing?.securityQuestion || '',
      securityAnswerHash: existing && !data.securityAnswer ? existing.securityAnswerHash : securityAnswerHash,
      passwordHint: data.passwordHint || existing?.passwordHint || '',
      createdAt: existing ? existing.createdAt : new Date()
    }, Realm.UpdateMode.Modified)
  })
  return { _id: user._id, name: user.name, username: user.username, role: user.role, permissions: [...user.permissions], active: user.active, employeeId: user.employeeId || '', securityQuestion: user.securityQuestion || '', hasSecurityAnswer: !!(user.securityAnswerHash), passwordHint: user.passwordHint || '', createdAt: user.createdAt?.toISOString() }
}

function toggleUserActive(realm, id) {
  const user = realm.objectForPrimaryKey('User', id)
  if (!user) throw new Error('المستخدم غير موجود')
  realm.write(() => { user.active = !user.active })
  return { _id: user._id, name: user.name, active: user.active }
}

module.exports = { listUsers, saveUser, toggleUserActive, ROLES, ALL_PERMISSIONS }
