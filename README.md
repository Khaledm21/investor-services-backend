# Investor Services Center Management System — Backend API
> **نظام إدارة مركز خدمات المستثمرين — واجهة برمجة التطبيقات (Backend API)**

واجهة برمجية متكاملة (Production-Ready REST API) مبنية باستخدام **Node.js** و **Express.js** وقاعدة بيانات **PostgreSQL**، مصممة خصيصاً لتتكامل بنسبة 100% وبدون أي تعارض مع تطبيق الفرونت إند الحالي (React + Vite + Axios).

---

## 🚀 المميزات الرئيسية
* **معمارية نظيفة ومنظمة:** فصل تام بين المسارات (Routes)، وحدات التحكم (Controllers)، الإعدادات (Config)، والوسطاء (Middlewares).
* **أمان متقدم:**
  - مصادقة عبر **JWT** (JSON Web Tokens).
  - تشفير كلمات المرور باستخدام **bcryptjs** (12 Salt Rounds).
  - حماية المسارات بنظام الصلاحيات والأدوار (Role-Based Access Control: `admin`, `employee`, `viewer`).
  - دعم كامل لـ **CORS** متوافق مع منفذ الفرونت إند (`http://localhost:5173`).
* **قاعدة بيانات PostgreSQL:**
  - توليد تلقائي لمفاتيح `UUID` عبر امتداد `pgcrypto`.
  - مشغلات (Triggers) لتحديث حقل `updated_at` تلقائياً.
  - استعلامات معقدة بـ `LEFT JOIN` لتضمين `client_name` و `service_name` في العمليات لسهولة العرض في الفرونت إند.
* **إعداد آلي بضغطة زر واحدة:** سكربت `setup-db.js` لإنشاء قاعدة البيانات، تطبيق الجداول (Schema)، وتعبئة البيانات الأولية (Seed) مع التحقق الفوري من صحة الهاش لكلمة سر المدير الافتراضي `Admin@1234`.

---

## 📁 هيكلية المشروع (Project Structure)
```text
investor-services-backend-new/
├── src/
│   ├── config/
│   │   └── db.js                 # إعدادات مجمع اتصالات PostgreSQL (pg.Pool)
│   ├── controllers/
│   │   ├── authController.js     # تسجيل الدخول وجلب الملف الشخصي
│   │   ├── userController.js     # إدارة المستخدمين (Admin)
│   │   ├── clientController.js   # إدارة المستثمرين والعملاء
│   │   ├── serviceController.js  # إدارة الخدمات الاستثمارية
│   │   └── operationController.js# إدارة العمليات وربطها بالعملاء والخدمات
│   ├── middlewares/
│   │   ├── auth.js               # التحقق من JWT والصلاحيات (Role Guard)
│   │   └── errorHandler.js       # اصطياد الأخطاء العام و 404
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── clientRoutes.js
│   │   ├── serviceRoutes.js
│   │   └── operationRoutes.js
│   └── utils/
│       └── responseHandler.js    # توحيد نسق ردود الـ API (Success / Error)
├── database/
│   ├── schema.sql                # مخطط الجداول والفهارس والمشغلات
│   └── seed.sql                  # البيانات الأولية الافتراضية
├── .env.example                  # نموذج المتغيرات البيئية
├── .env                          # المتغيرات البيئية النشطة
├── server.js                     # نقطة انطلاق السيرفر الرئيسية
├── setup-db.js                   # سكربت الإعداد التلقائي لقاعدة البيانات
├── test-api.js                   # فحص واختبار جميع الـ Endpoints
└── package.json
```

---

## ⚙️ متطلبات التشغيل (Prerequisites)
1. **Node.js:** الإصدار 18 فما فوق (تم اختباره على Node v24).
2. **PostgreSQL:** الإصدار 14 فما فوق (خادم PostgreSQL يعمل على المنفذ 5432).

---

## 🛠️ خطوات التثبيت والتشغيل (Quick Start)

### 1. تثبيت الحزم (Dependencies):
```bash
npm install
```

### 2. ضبط المتغيرات البيئية:
قم بمراجعة ملف `.env` للتأكد من بيانات الاتصال بقاعدة البيانات:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=investor_services_db
DB_USER=postgres
DB_PASSWORD=Khaled.2003

JWT_SECRET=investor_services_jwt_secret_super_key_2026_secure
JWT_EXPIRES_IN=8h
```

### 3. تجهيز قاعدة البيانات تلقائياً (Database Setup):
قم بتشغيل السكربت الذي يتكفل بإنشاء قاعدة البيانات وتطبيق الجداول وحساب هاش كلمة المرور السليم:
```bash
npm run db:setup
```

### 4. تشغيل السيرفر (Start API):
* **وضع التطوير (مع التحديث التلقائي):**
  ```bash
  npm run dev
  ```
* **وضع الإنتاج:**
  ```bash
  npm start
  ```

السيرفر سيعمل على: `http://localhost:5000`

---

## 🔑 بيانات الدخول الافتراضية (Default Admin Credentials)
* **اسم المستخدم (Username):** `admin`
* **كلمة المرور (Password):** `Admin@1234`
* **الدور (Role):** `admin`
* **البريد الإلكتروني:** `admin@investor-services.local`

---

## 📡 جدول الـ Endpoints وتنسيق الردود

جميع الردود ترجع بالصيغة الموحدة:
* عند النجاح: `{ "success": true, "data": { ... }, "message": "..." }`
* عند الخطأ: `{ "success": false, "message": "...", "errors": [] }`

### 1. المصادقة والمستخدمين (Auth & Users)
| Method | Endpoint | Auth | Role | الوصف |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/auth/login` | ❌ | الجميع | تسجيل الدخول واستلام JWT وبيانات المستخدم |
| `GET` | `/api/auth/me` | ✅ | الجميع | استرجاع بيانات المستخدم الحالي المسجل |
| `GET` | `/api/users?limit=100` | ✅ | `admin` | استعراض قائمة المستخدمين مع الترقيم |
| `POST` | `/api/users` | ✅ | `admin` | إضافة مستخدم جديد وتشفير كلمة مروره |
| `PATCH` | `/api/users/:id/toggle` | ✅ | `admin` | تفعيل / تعطيل حساب مستخدم |
| `DELETE` | `/api/users/:id` | ✅ | `admin` | حذف مستخدم |

### 2. العملاء والمستثمرين (Clients)
| Method | Endpoint | Auth | Role | الوصف |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/clients?page=1&limit=500&search=...` | ✅ | الجميع | البحث والاستعلام عن العملاء |
| `GET` | `/api/clients/:id` | ✅ | الجميع | تفاصيل عميل بالمعرف أو الرقم القومي |
| `POST` | `/api/clients` | ✅ | `admin`, `employee` | إنشاء عميل جديد |
| `PUT` | `/api/clients/:id` | ✅ | `admin`, `employee` | تعديل بيانات عميل |
| `DELETE` | `/api/clients/:id` | ✅ | `admin` | حذف عميل |

### 3. الخدمات الاستثمارية (Services)
| Method | Endpoint | Auth | Role | الوصف |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/services?limit=100&is_active=true` | ✅ | الجميع | جلب الخدمات مع عدد العمليات المرتبطة |
| `GET` | `/api/services/:id` | ✅ | الجميع | جلب تفاصيل خدمة محددة |
| `POST` | `/api/services` | ✅ | `admin`, `employee` | إضافة خدمة استثمارية جديدة |
| `PUT` | `/api/services/:id` | ✅ | `admin`, `employee` | تعديل خدمة |
| `DELETE` | `/api/services/:id` | ✅ | `admin` | حذف خدمة (ممنوع في حال وجود عمليات مرتبطة) |

### 4. العمليات والطلبات (Operations)
| Method | Endpoint | Auth | Role | الوصف |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/operations?limit=500&status=...` | ✅ | الجميع | جلب العمليات مع `client_name` و `service_name` |
| `GET` | `/api/operations/:id` | ✅ | الجميع | جلب تفاصيل عملية محددة مع الربط |
| `POST` | `/api/operations` | ✅ | `admin`, `employee` | إنشاء طلب / عملية جديدة |
| `PUT` | `/api/operations/:id` | ✅ | `admin`, `employee` | تعديل بيانات العملية بالكامل |
| `PATCH` | `/api/operations/:id/status` | ✅ | `admin`, `employee` | تحديث حالة العملية فقط (`status`) |
| `DELETE` | `/api/operations/:id` | ✅ | `admin` | حذف عملية |

### 5. فحص حالة السيرفر (Health Check)
| Method | Endpoint | Auth | الوصف |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | ❌ | فحص سلامة عمل الـ API |

---

## 🧪 اختبار الـ API التلقائي (Automated Tests)
تم توفير سكربت اختبار شامل يمكن تشغيله للتأكد من جاهزية كل الـ Endpoints والاتصال بقاعدة البيانات:
```bash
node test-api.js
```
نتيجة الاختبار: **30 اختبار ناجح (30 passed, 0 failed)** بنسبة 100%.
