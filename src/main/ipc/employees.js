const Realm = require('realm')
const crypto = require('node:crypto')

function listEmployees(realm) {
  return Array.from(realm.objects('Employee').filtered('active == true').sorted('name')).map(e => ({
    _id: e._id, name: e.name, phone: e.phone, email: e.email,
    address: e.address, photo: e.photo, idPhoto: e.idPhoto,
    idNumber: e.idNumber, idExpiryDate: e.idExpiryDate?.toISOString(),
    jobTitle: e.jobTitle, department: e.department,
    salary: e.salary, salaryPeriod: e.salaryPeriod,
    hireDate: e.hireDate?.toISOString(),
    emergencyContact: e.emergencyContact, emergencyPhone: e.emergencyPhone,
    notes: e.notes, workHours: e.workHours, active: e.active,
    createdAt: e.createdAt?.toISOString(), updatedAt: e.updatedAt?.toISOString()
  }))
}

function getEmployee(realm, id) {
  const e = realm.objectForPrimaryKey('Employee', id)
  if (!e) throw new Error('الموظف غير موجود')
  return {
    _id: e._id, name: e.name, phone: e.phone, email: e.email,
    address: e.address, photo: e.photo, idPhoto: e.idPhoto,
    idNumber: e.idNumber, idExpiryDate: e.idExpiryDate?.toISOString(),
    jobTitle: e.jobTitle, department: e.department,
    salary: e.salary, salaryPeriod: e.salaryPeriod,
    hireDate: e.hireDate?.toISOString(),
    emergencyContact: e.emergencyContact, emergencyPhone: e.emergencyPhone,
    notes: e.notes, workHours: e.workHours, active: e.active,
    createdAt: e.createdAt?.toISOString(), updatedAt: e.updatedAt?.toISOString()
  }
}

function saveEmployee(realm, data) {
  let emp
  realm.write(() => {
    const existing = data._id ? realm.objectForPrimaryKey('Employee', data._id) : null
    emp = realm.create('Employee', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      photo: data.photo || '',
      idPhoto: data.idPhoto || '',
      idNumber: data.idNumber || '',
      idExpiryDate: data.idExpiryDate ? new Date(data.idExpiryDate) : undefined,
      jobTitle: data.jobTitle || '',
      department: data.department || '',
      salary: Number(data.salary) || 0,
      salaryPeriod: data.salaryPeriod || 'شهري',
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      emergencyContact: data.emergencyContact || '',
      emergencyPhone: data.emergencyPhone || '',
      notes: data.notes || '',
      workHours: Number(data.workHours) || 12,
      active: data.active != null ? data.active : true,
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return {
    _id: emp._id, name: emp.name, phone: emp.phone, jobTitle: emp.jobTitle,
    salary: emp.salary, salaryPeriod: emp.salaryPeriod, active: emp.active
  }
}

function removeEmployee(realm, id) {
  realm.write(() => {
    const emp = realm.objectForPrimaryKey('Employee', id)
    if (emp) {
      emp.active = false
      emp.updatedAt = new Date()
    }
  })
  return true
}

function listAdvances(realm, employeeId) {
  let items = employeeId
    ? realm.objects('Advance').filtered('employeeId == $0', employeeId)
    : realm.objects('Advance')
  return Array.from(items.sorted('date', true)).map(a => ({
    _id: a._id, employeeId: a.employeeId, employeeName: a.employeeName,
    amount: a.amount, type: a.type || 'advance', date: a.date?.toISOString(), note: a.note,
    deducted: a.deducted, createdBy: a.createdBy, createdAt: a.createdAt?.toISOString()
  }))
}

function saveAdvance(realm, data, session) {
  let adv
  const amount = Number(data.amount) || 0
  if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')
  const isAdvance = data.type !== 'deduction'
  realm.write(() => {
    adv = realm.create('Advance', {
      _id: data._id || crypto.randomUUID(),
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      amount,
      type: data.type || 'advance',
      date: data.date ? new Date(data.date) : new Date(),
      note: data.note || '',
      deducted: false,
      createdBy: session.name || 'system',
      createdAt: new Date()
    })
    if (isAdvance) {
      const pm = data.paymentMethod || 'cash'
      const treasuryType = pm === 'card' ? 'bank' : 'main'
      const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
      if (treasury) {
        if (treasury.balance < amount) throw new Error('الرصيد غير كافٍ في الخزينة')
        treasury.balance -= amount
        treasury.updatedAt = new Date()
        realm.create('TreasuryTransaction', {
          _id: crypto.randomUUID(),
          treasuryId: treasury._id, treasuryName: treasury.name,
          type: 'withdraw', amount: -amount,
          note: 'سلفة ' + (data.employeeName || 'موظف'),
          refType: 'advance', refId: adv._id,
          paymentMethod: 'cash',
          createdBy: session.name || 'system', createdAt: new Date()
        })
      }
    }
    const emp = realm.objectForPrimaryKey('Employee', data.employeeId)
    if (emp) {
      emp.updatedAt = new Date()
    }
  })
  return { _id: adv._id, employeeId: adv.employeeId, amount: adv.amount, type: adv.type, date: adv.date?.toISOString() }
}

function listAttendance(realm, employeeId, month, year) {
  let items = realm.objects('AttendanceLog').filtered('employeeId == $0', employeeId)
  if (month != null && year != null) {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
    items = items.filtered('date >= $0 AND date <= $1', start, end)
  }
  const seen = new Set()
  return Array.from(items.sorted('date', true)).filter(a => {
    const key = a.employeeId + '|' + (a.date?.toISOString().slice(0, 10) || '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map(a => ({
    _id: a._id, employeeId: a.employeeId,
    date: a.date?.toISOString().slice(0, 10),
    status: a.status, loginTime: a.loginTime?.toISOString(),
    source: a.source, note: a.note
  }))
}

function saveAttendance(realm, data) {
  realm.write(() => {
    const dayStart = new Date(data.date)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 86400000)
    const existing = realm.objects('AttendanceLog').filtered(
      'employeeId == $0 AND date >= $1 AND date < $2', data.employeeId, dayStart, dayEnd
    )[0]
    if (existing) {
      existing.status = data.status
      existing.source = 'manual'
      if (data.note) existing.note = data.note
    } else {
      realm.create('AttendanceLog', {
        _id: crypto.randomUUID(),
        employeeId: data.employeeId,
        date: dayStart,
        status: data.status || 'present',
        source: 'manual',
        note: data.note || ''
      })
    }
  })
  return true
}

function removeAttendance(realm, data) {
  realm.write(() => {
    const dayStart = new Date(data.date)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 86400000)
    const existing = realm.objects('AttendanceLog').filtered(
      'employeeId == $0 AND date >= $1 AND date < $2', data.employeeId, dayStart, dayEnd
    )[0]
    if (existing) {
      realm.delete(existing)
    }
  })
  return true
}

function paySalary(realm, data, session) {
  const amount = Number(data.netAmount) || 0
  if (amount <= 0) throw new Error('صافي الراتب يجب أن يكون أكبر من صفر')
  let payment
  realm.write(() => {
    const treasuryType = (data.paymentMethod === 'card' || data.paymentMethod === 'transfer') ? 'bank' : 'main'
    const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
    if (treasury) {
      if (treasury.balance < amount) throw new Error('الرصيد غير كافٍ في الخزينة')
      treasury.balance -= amount
      treasury.updatedAt = new Date()
      realm.create('TreasuryTransaction', {
        _id: crypto.randomUUID(),
        treasuryId: treasury._id, treasuryName: treasury.name,
        type: 'withdraw', amount: -amount,
        note: 'راتب ' + data.employeeName + ' - ' + (data.note || ''),
        refType: 'salary', refId: data.employeeId,
        paymentMethod: data.paymentMethod || 'cash',
        createdBy: session.name || 'system', createdAt: new Date()
      })
    }
    payment = realm.create('SalaryPayment', {
      _id: crypto.randomUUID(),
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      baseSalary: Number(data.baseSalary) || 0,
      totalDeductions: Number(data.totalDeductions) || 0,
      totalAdditions: Number(data.totalAdditions) || 0,
      netAmount: amount,
      month: Number(data.month) || new Date().getMonth() + 1,
      year: Number(data.year) || new Date().getFullYear(),
      paymentDate: new Date(),
      paymentMethod: data.paymentMethod || 'cash',
      note: data.note || '',
      createdBy: session.name || 'system',
      createdAt: new Date()
    })
    const emp = realm.objectForPrimaryKey('Employee', data.employeeId)
    if (emp) emp.updatedAt = new Date()
    const pendingAdvances = realm.objects('Advance').filtered('employeeId == $0 AND deducted == false', data.employeeId)
    for (const adv of pendingAdvances) {
      adv.deducted = true
    }
  })
  return {
    _id: payment._id, employeeId: payment.employeeId,
    employeeName: payment.employeeName, netAmount: payment.netAmount,
    month: payment.month, year: payment.year
  }
}

function listSalaryPayments(realm, employeeId) {
  let items = employeeId
    ? realm.objects('SalaryPayment').filtered('employeeId == $0', employeeId)
    : realm.objects('SalaryPayment')
  return Array.from(items.sorted('paymentDate', true)).map(p => ({
    _id: p._id, employeeId: p.employeeId, employeeName: p.employeeName,
    baseSalary: p.baseSalary, totalDeductions: p.totalDeductions,
    totalAdditions: p.totalAdditions, netAmount: p.netAmount,
    month: p.month, year: p.year,
    paymentDate: p.paymentDate?.toISOString(),
    paymentMethod: p.paymentMethod, note: p.note,
    createdBy: p.createdBy, createdAt: p.createdAt?.toISOString()
  }))
}

module.exports = {
  listEmployees, getEmployee, saveEmployee, removeEmployee,
  listAdvances, saveAdvance,
  listAttendance, saveAttendance, removeAttendance,
  paySalary, listSalaryPayments
}
