const https = require('node:https')
const config = require('../config')
const { openRealm } = require('../database')

const MODEL = 'groq/compound'

function groqChat(messages, tools) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages,
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0.3,
      max_tokens: 2000
    })
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) reject(new Error(parsed.error.message || 'Groq API error'))
          else resolve(parsed)
        } catch { reject(new Error('فشل تحليل رد المساعد')) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const SYSTEM_PROMPT = `أنت خبير ومختص في تطبيق SMART X POS. اسمك "مساعد SMART X". التطبيق هو نظام نقاط بيع متكامل بالعربية.
مهمتك الأساسية: شرح أي ميزة أو إجراء في التطبيق بالتفصيل، وجلب البيانات الحقيقية عند الطلب.

=== دليل التطبيق الكامل ===

[الكاشير] واجهة البيع السريع. خطوات البيع: 1- ابحث عن المنتج واختاره 2- حدد الكمية 3- اختار العميل (اختياري) 4- اختار طريقة الدفع (نقدي/آجل/بطاقة ائتمان/شبكة/تحويل) 5- أضف خصم لو حابب 6- أضف ملاحظات 7- اضغط "دفع". بعد الدفع بتظهر رسالة بنجاح العملية وفاتورة للطباعة. الكاشير بيحتاج وردية نشطة عشان يبيع. لو ما فيش وردية، بيظهرله إنذار يفتح وردية أولاً. الفاتورة بتتطبع حسب الإعدادات (حراري أو A4). فيه إمكانية إضافة عميل جديد أثناء البيع.

[لوحة التحكم] ملخص فوري. بتظهر: إجمالي مبيعات اليوم، عدد فواتير اليوم، إجمالي الربح، مصروفات اليوم والشهر، عدد المنتجات منخفضة المخزون، المنتجات قرب انتهاء الصلاحية (خلال 30 يوم)، آخر 6 فواتير، أفضل 5 منتجات مبيعاً اليوم، القيمة الإجمالية للمخزون.

[الخزينة] إدارة الأموال. في خزينتين افتراضيتين: "الخزينة الرئيسية" (نقدي) و "البنك". تقدر تضيف خزائن جديدة. كل خزينة ليها سجل حركات. المميزات: إيداع أموال للخزينة، سحب أموال (شخصي أو تشغيلي — التشغيلي بيدخل مصروف)، تحويل بين الخزائن.

[المصروفات] تسجيل مصروفات المتجر. كل مصروف عنده: المبلغ، التصنيف (إيجار/كهرباء/رواتب/صيانة/تسويق/أخرى)، ملاحظات، طريقة الدفع، التاريخ. المصروف التشغيلي من الخزينة بيتسجل تلقائياً كمصروف.

[المنتجات] إدارة كاملة للمنتجات. الحقول: الاسم (مطلوب وممنوع التكرار)، SKU (رمز المنتج)، الباركود (ممنوع التكرار)، التصنيف، الوحدة (قطعة/كيلو/لتر/كرتونة/علبة/زوج)، سعر الشراء والتكلفة، أسعار البيع (قطاعي/نصف جملة/جملة)، المخزون، حد التنبيه، تاريخ الصلاحية. البحث متاح بالاسم أو SKU أو الباركود.

[المبيعات] سجل فواتير البيع. كل فاتورة فيها: رقم الفاتورة، الكاشير، العميل، المنتجات، الإجمالي، الخصم، الضريبة، المدفوع، طريقة الدفع. عند حذف فاتورة، النظام بيعكس كل شيء: يرجع المنتجات للمخزون ويسترجع المدفوعات من العملاء ويحذف الدفعات المرتبطة. تقدر تطبع الفاتورة تاني من هنا.

[المشتريات] فواتير شراء من الموردين. تضيف فاتورة شراء بالمنتجات والتكلفة. بتأثر على المخزون بنظام FIFO (أول وارد أول صادر). لو اخترت مورد وعليه مستحقات سابقة، بتظهر تلقائياً. طرق الدفع: نقدي/آجل/بطاقة/تحويل/شبكة. لو اخترت آجل، بتزود رصيد المورد المستحق.

[العملاء] إدارة العملاء والمديونية. الفواتير الآجلة بتزود totalDebt. الدفعات بتنقص totalDebt وتزود totalPaid. الرصيد المتبقي = totalDebt - totalPaid. تقدر تضيف عميل جديد، وتشوف سجل فواتيره ودفعاته.

[الموردين] إدارة الموردين. فواتير الشراء الآجلة بتزود totalPurchases. الدفعات للمورد بتنقص من المستحق. الرصيد المتبقي = totalPurchases - totalPaid.

[التقارير] لوحة التقارير الشاملة. أنواع التقارير: ملخص عام (مبيعات، أرباح، مصروفات)، مبيعات (حسب المنتج أو الفئة أو الكاشير)، مشتريات، أرباح (إجمالي الربح = المبيعات - التكلفة)، مصروفات، العملاء (المديونيات والدفعات)، الموردين، المخزون (قيمته وتوزيعه)، مرتجعات. كل تقرير بمدة زمنية مخصصة مع رسوم بيانية.

[المخزون] إدارة الجرد والتعديلات. ضبط مخزون (جرد): بتحدد الكمية الفعلية للمنتجات والفرق بينها وبين النظام، الفرق بيتحول لتعديل مخزون ومصروف فرق جرد. تعديلات المخزون: زيادة أو نقصان مع تحديد السبب. تقرير الـ batches (FIFO) لكل منتج.

[المرتجع] نوعين: مرتجع مبيعات (إرجاع من عميل): بتختار فاتورة بيع، تحددي المنتجات المرتجعة والسبب، المبلغ بيرجع للعميل. مرتجع مشتريات (إرجاع لمورد): بتختار فاتورة شراء، تحددي المنتجات المرتجعة.

[الورديات] كل وردية ليها كاشير واحد. فتح وردية: بتدخل المبلغ الابتدائي (بيتخصم من الخزينة الرئيسية لو أكتر من 0). قفل الوردية: بتدخل الرصيد النهائي كاش والرصيد النهائي كارد. الفرق بين المتوقع والفعلي بيتحسب تلقائياً. الرصيد النهائي بيرجع للخزينة الرئيسية (كاش) والبنك (كارد). لو في وردية نشطة لمستخدم تاني، النظام بيمنع فتح وردية جديدة.

[الموظفين] إدارة شؤون الموظفين. كل موظف عنده: الاسم، الوظيفة، القسم، الراتب، فترة الراتب (شهري/أسبوعي/يومي/ساعتين), ساعات العمل اليومية. السلف والخصومات: سلفة للموظف (بتزود رصيد السلف عليه)، خصم (بيتخصم من الراتب). الحضور والانصراف: تسجيل يدوي أو تلقائي عند تسجيل الدخول. المرتبات: صرف مرتب بالشهر والسنة، مع إضافة السلف والخصومات تلقائياً.

[تقارير الموظفين] تقارير الحضور (أيام الحضور والغياب) وتقارير المرتبات (المرتبات المصروفة).

[سجل النشاط] سجل زمني لكل الأحداث في التطبيق: إضافة/حذف/تعديل منتج، فاتورة بيع/شراء، مصروف، مرتجع، وردية، تعديل صلاحيات مستخدم، نسخ احتياطي. كل نشاط فيه: المستخدم، الإجراء، التفاصيل، الوقت.

[المستخدمين] إدارة حسابات الدخول. كل مستخدم عنده: اسم مستخدم، كلمة مرور، دور (مدير نظام/مدير عام/مشرف/كاشير/موظف)، صلاحيات مخصصة لكل قسم (عرض/إدارة/مخفي). تقدر تفعل/تعطل أي مستخدم.

[الإعدادات] كل إعدادات التطبيق في أقسام:
- بيانات المتجر: اسم، شعار، هاتف، إيميل، سجل تجاري، رقم ضريبي، عنوان
- التهيئة: المظهر (داكن/فاتح)، التقويم (ميلادي/هجري)، الوقت (12/24 ساعة)، 23 خط عربي (Cairo، Tajawal، Almarai، El Messiri، Rubik، وغيرهم)، العملة (EGP/SAR/AED/QAR/KWD/BHD/OMR/USD)، الضريبة (تفعيل/نسبة)
- الطباعة: طابعة افتراضية، مقاس الفاتورة (حراري/A4)، المقاس الحراري (57/58/76/80mm/مخصص)، طباعة تلقائية بعد الدفع، طباعة مباشرة بدون نافذة
- الباركود: طابعة باركود، مقاس اللاصقة (25x25 إلى 100x60mm)، إظهار اسم/سعر، سمك الخط، حجم الباركود
- الفاتورة: إظهار/إخفاء اسم المتجر، الشعار، الهاتف، الإيميل، العنوان، السجل التجاري، الرقم الضريبي، التذييل، جدول المنتجات، الإجماليات، المدفوع، الكاشير، الملاحظات، بيانات العميل/المورد، QR. معاينة حية للفاتورة
- الإشعارات: تفعيل/تعطيل تنبيه المخزون، إشعار المبيعات، المدفوعات، المرتجعات، النجاح، انتهاء الصلاحية
- البيانات: نسخ احتياطي يدوي، استعادة نسخة، إعادة تعيين، نسخ تلقائي (يومي/أسبوعي/شهري)، نسخ تليجرام
- التحديثات: التحقق من التحديثات وتحميلها
- الترخيص: حالة الترخيص وتاريخ انتهائه
- الدعم الفني: بيانات التواصل

=== الأدوات ===
لما يسألك عن بيانات حقيقية، استخدم الأداة المناسبة: get_dashboard_summary, search_products, get_active_shift, get_business_info, get_low_stock_products, search_customers, search_suppliers, search_employees, get_employee_attendance, get_employee_salary, get_employee_sales_today.

=== قواعد ===
- جاوب بالعربية الفصحى العامة
- كن ودوداً وواضحاً ومنظماً. استخدم أرقاماً أو نقاطاً للترتيب
- إذا سأل عن شرح لميزة، اشرح خطوة بخطوة
- إذا سأل عن بيانات، استخدم الأداة وجاوب بالنتيجة
- إذا سأل عن شيء خارج معرفتك، اعتذر بصراحة`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description: 'الحصول على ملخص لوحة التحكم: مبيعات اليوم، الأرباح، المصروفات، المنتجات منخفضة المخزون',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'البحث عن منتجات بالاسم أو الباركود',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث (اسم المنتج أو الباركود)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_active_shift',
      description: 'معرفة إذا كان هناك وردية نشطة للمستخدم الحالي',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_business_info',
      description: 'الحصول على معلومات المتجر (الاسم، الهاتف، العنوان، العملة)',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock_products',
      description: 'الحصول على قائمة المنتجات التي وصلت لحد الطلب',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: 'البحث عن عميل وعرض المديونية (المبلغ المستحق عليه)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'اسم العميل أو رقم الهاتف' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_suppliers',
      description: 'البحث عن مورد وعرض المستحق له (المبلغ المتبقي للمورد)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'اسم المورد أو رقم الهاتف' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'البحث عن موظف بالاسم وعرض بياناته الأساسية ورتبه',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'اسم الموظف' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_attendance',
      description: 'عرض حضور موظف في الشهر الحالي — عدد أيام الحضور والغياب',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الموظف بالكامل (كما هو مسجل في النظام)' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_salary',
      description: 'عرض معلومات مرتب موظف: الراتب الأساسي، آخر راتب تم صرفه، السلف والخصومات',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الموظف بالكامل (كما هو مسجل في النظام)' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_sales_today',
      description: 'عرض مبيعات موظف معين اليوم (عدد الفواتير وإجمالي المبيعات)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الموظف بالكامل (كما هو مسجل في النظام)' }
        },
        required: ['name']
      }
    }
  }
]

async function callTool(name, args) {
  const realm = await openRealm()
  switch (name) {
    case 'get_dashboard_summary': {
      const { dashboardSummary } = require('./dashboard')
      const data = dashboardSummary(realm)
      return JSON.stringify({
        مبيعات_اليوم: data.todaySales,
        فواتير_اليوم: data.todayInvoices,
        إجمالي_الربح: data.grossProfit,
        مصروفات_اليوم: data.expensesToday,
        مصروفات_الشهر: data.expensesMonth,
        منتجات_منخفضة: data.lowStock,
        إجمالي_المنتجات: data.totalProducts,
        قيمة_المخزون: data.totalInventoryValue
      })
    }
    case 'search_products': {
      const { listProducts } = require('./products')
      const products = listProducts(realm, args.query, 10)
      return JSON.stringify(products.map(p => ({
        الاسم: p.name,
        المخزون: p.stock,
        سعر_البيع: p.priceRetail,
        سعر_الشراء: p.cost,
        الفئة: p.category,
        الباركود: p.barcode
      })))
    }
    case 'get_active_shift': {
      const { hasAnyActiveShift } = require('./shifts')
      const hasActive = hasAnyActiveShift(realm)
      return JSON.stringify({ وردية_نشطة: hasActive })
    }
    case 'get_business_info': {
      const { getSettings } = require('./settings')
      const s = getSettings(realm)
      if (!s) return JSON.stringify({})
      return JSON.stringify({
        اسم_المتجر: s.businessName,
        الهاتف: s.phone,
        العنوان: s.address,
        العملة: s.currency,
        السجل_التجاري: s.commercialRegistration,
        الرقم_الضريبي: s.taxNumber
      })
    }
    case 'get_low_stock_products': {
      const products = realm.objects('Product').filtered('active == true AND (stock <= reorderPoint OR stock == 0)')
      const lowStock = Array.from(products).map(p => ({
        الاسم: p.name,
        المخزون_الحالي: p.stock,
        حد_التنبيه: p.reorderPoint,
        الفئة: p.category
      }))
      return JSON.stringify(lowStock)
    }
    case 'search_customers': {
      let results = realm.objects('CreditCustomer').sorted('updatedAt', true)
      if (args.query) results = results.filtered('name CONTAINS[c] $0', args.query)
      const customers = Array.from(results.slice(0, 10)).map(c => ({
        الاسم: c.name,
        الهاتف: c.phone,
        إجمالي_المديونية: c.totalDebt,
        إجمالي_المدفوع: c.totalPaid,
        المبلغ_المتبقي: c.totalDebt - c.totalPaid
      }))
      return JSON.stringify(customers)
    }
    case 'search_suppliers': {
      let results = realm.objects('Supplier').sorted('updatedAt', true)
      if (args.query) results = results.filtered('name CONTAINS[c] $0', args.query)
      const suppliers = Array.from(results.slice(0, 10)).map(s => ({
        الاسم: s.name,
        الهاتف: s.phone,
        إجمالي_المشتريات: s.totalPurchases,
        إجمالي_المدفوع: s.totalPaid,
        المبلغ_المتبقي: s.totalPurchases - s.totalPaid
      }))
      return JSON.stringify(suppliers)
    }
    case 'search_employees': {
      let results = realm.objects('Employee').filtered('active == true').sorted('name')
      if (args.query) results = results.filtered('name CONTAINS[c] $0', args.query)
      return JSON.stringify(Array.from(results.slice(0, 10)).map(e => ({
        الاسم: e.name,
        الوظيفة: e.jobTitle,
        القسم: e.department,
        الراتب: e.salary,
        فترة_الراتب: e.salaryPeriod,
        ساعات_العمل: e.workHours,
        الهاتف: e.phone,
        تاريخ_التعيين: e.hireDate?.toISOString().slice(0, 10)
      })))
    }
    case 'get_employee_attendance': {
      const emp = realm.objects('Employee').filtered('name == $0', args.name)[0]
      if (!emp) return JSON.stringify({ خطأ: 'لم يتم العثور على موظف بهذا الاسم' })
      const now = new Date()
      const records = require('./employees').listAttendance(realm, emp._id, now.getMonth() + 1, now.getFullYear())
      const present = records.filter(r => r.status === 'present').length
      const absent = records.filter(r => r.status === 'absent').length
      return JSON.stringify({
        الموظف: emp.name,
        الشهر: now.getMonth() + 1,
        السنة: now.getFullYear(),
        أيام_الحضور: present,
        أيام_الغياب: absent,
        إجمالي_الأيام: records.length,
        آخر_تسجيل: records[0] ? { تاريخ: records[0].date, الحالة: records[0].status, وقت_الدخول: records[0].loginTime } : null
      })
    }
    case 'get_employee_salary': {
      const emp = realm.objects('Employee').filtered('name == $0', args.name)[0]
      if (!emp) return JSON.stringify({ خطأ: 'لم يتم العثور على موظف بهذا الاسم' })
      const lr = require('./employees').listSalaryPayments(emp._id)
      const lastPayment = lr[0] || null
      const advances = require('./employees').listAdvances(emp._id)
      const totalAdvances = advances.filter(a => a.type === 'advance' && !a.deducted).reduce((s, a) => s + a.amount, 0)
      const totalDeductions = advances.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0)
      return JSON.stringify({
        الموظف: emp.name,
        الراتب_الأساسي: emp.salary,
        فترة_الراتب: emp.salaryPeriod,
        إجمالي_السلف_غير_المسددة: totalAdvances,
        إجمالي_الخصومات: totalDeductions,
        آخر_راتب: lastPayment ? {
          الشهر: lastPayment.month,
          السنة: lastPayment.year,
          الصافي: lastPayment.netAmount,
          تاريخ_الصرف: lastPayment.paymentDate?.slice(0, 10),
          طريقة_الدفع: lastPayment.paymentMethod
        } : null
      })
    }
    case 'get_employee_sales_today': {
      const emp = realm.objects('Employee').filtered('name == $0', args.name)[0]
      if (!emp) return JSON.stringify({ خطأ: 'لم يتم العثور على موظف بهذا الاسم' })
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
      const sales = realm.objects('Sale').filtered('employeeId == $0 AND createdAt >= $1', emp._id, startOfDay)
      const total = sales.reduce((s, sale) => s + (sale.total || 0), 0)
      return JSON.stringify({
        الموظف: emp.name,
        عدد_فواتير_اليوم: sales.length,
        إجمالي_مبيعات_اليوم: total
      })
    }
    default:
      return JSON.stringify({ error: 'أداة غير معروفة' })
  }
}

async function chat(messages) {
  const msgs = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
  const response = await groqChat(msgs, TOOLS)
  const choice = response.choices?.[0]
  if (!choice) throw new Error('لم يتم الحصول على رد')

  if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
    const toolResults = []
    for (const tc of choice.message.tool_calls) {
      const fn = tc.function
      const args = JSON.parse(fn.arguments || '{}')
      const result = await callTool(fn.name, args)
      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
    const secondMsgs = [...msgs, choice.message, ...toolResults]
    const secondResponse = await groqChat(secondMsgs)
    return secondResponse.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من معالجة الطلب'
  }

  return choice.message?.content || 'عذراً، لم أتمكن من معالجة الطلب'
}

module.exports = { chat }
