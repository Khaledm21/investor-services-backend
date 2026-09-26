# 🚀 دليل تكامل الفرونت إند مع الباك إند (Frontend Integration Guide)
### نظام إدارة مركز خدمات المستثمرين — Investor Services Center Management System

هذا الدليل موجه لمطور / مهندس الفرونت إند (أو وكيل الذكاء الاصطناعي الخاص بالفرونت إند) لتوصيل تطبيق **React + Vite + Axios** مع الـ **Backend API** الجديد بنسبة 100% وبدون أي تعارض أو مشاكل.

---

## 📌 1. معلومات السيرفر والاتصال (Server Connection)

* **Base URL:** `http://localhost:5000/api`
* **Health Check URL:** `http://localhost:5000/api/health`
* **Default Port:** `5000`
* **CORS Allowed Origins:** مفعّل ومضبوط للسماح بـ `http://localhost:5173`، `http://127.0.0.1:5173`، وأي منفذ محلي.
* **Content-Type:** دائماً `application/json` لجميع الطلبات ذات الـ Body.
* **Authentication Method:** JWT Token عبر ترويسة:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```

---

## 🔑 2. بيانات الدخول الافتراضية (Default Admin Credentials)

تم إعداد حساب مسؤول النظام الافتراضي في قاعدة البيانات بالبيانات التالية:
* **اسم المستخدم (Username):** `admin`
* **كلمة المرور (Password):** `Admin@1234`
* **الدور (Role):** `admin`
* **البريد الإلكتروني:** `admin@investor-services.local`

---

## 📐 3. الصيغة الموحدة للردود (Unified Response Schema)

جميع الـ Endpoints بدون استثناء تُعيد كائناً موحداً بالصيغة التالية:

### أ) عند النجاح (HTTP Status: 200, 201):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // محتوى البيانات المطلوبة هنا
  }
}
```

### ب) عند الخطأ (HTTP Status: 400, 401, 403, 404, 409, 500):
```json
{
  "success": false,
  "message": "رسالة الخطأ التوضيحية للمستخدم",
  "errors": [
    // تفاصيل إضافية إن وجدت
  ]
}
```

> **💡 نصيحة للفرونت:** يمكنك استخراج رسالة الخطأ لعرضها في الـ Toast هكذا:
> ```javascript
> const msg = err.response?.data?.message || err.message || 'حدث خطأ ما';
> toast.error(msg);
> ```

---

## 🛠️ 4. ضبط ملف المتغيرات البيئية في الفرونت إند (`.env`)

تأكد من وجود ملف `.env` داخل مجلد الفرونت إند يحتوي على:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📡 5. تفاصيل الـ Endpoints الكاملة (API Reference)

### 🟢 أولاً: المصادقة والمستخدمين (Authentication & Users)

#### 1. تسجيل الدخول:
* **Endpoint:** `POST /auth/login`
* **Auth:** غير مطلوب.
* **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "Admin@1234"
  }
  ```
  *(ملاحظة: يدعم أيضاً تسجيل الدخول بالبريد الإلكتروني بدلاً من اسم المستخدم).*
* **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6",
        "full_name": "مدير النظام",
        "username": "admin",
        "email": "admin@investor-services.local",
        "role": "admin",
        "is_active": true
      }
    }
  }
  ```

#### 2. جلب الملف الشخصي للمستخدم الحالي:
* **Endpoint:** `GET /auth/me`
* **Auth:** مطلوب (`Bearer token`).
* **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "full_name": "...", "role": "admin", ... }
    }
  }
  ```

#### 3. جلب قائمة المستخدمين (Admin Only):
* **Endpoint:** `GET /users?limit=100&page=1`
* **Auth:** مطلوب (Role: `admin`).
* **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "id": "41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6",
          "full_name": "مدير النظام",
          "username": "admin",
          "email": "admin@investor-services.local",
          "role": "admin",
          "is_active": true,
          "created_at": "2026-09-25T18:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 100
    }
  }
  ```

#### 4. إنشاء مستخدم جديد (Admin Only):
* **Endpoint:** `POST /users`
* **Auth:** مطلوب (Role: `admin`).
* **Request Body:**
  ```json
  {
    "full_name": "أحمد السعيد",
    "username": "ahmed_s",
    "email": "ahmed@example.com",
    "password": "Password@1234",
    "role": "employee" // 'admin' | 'employee' | 'viewer'
  }
  ```
* **Success Response (201):** يعيد `{ success: true, data: { user: { ... } } }`.

#### 5. تبديل حالة المستخدم (تفعيل / تعطيل) (Admin Only):
* **Endpoint:** `PATCH /users/:id/toggle`
* **Success Response (200):** يعيد `{ success: true, data: { user: { ... } } }` بعد عكس `is_active`.

#### 6. حذف مستخدم (Admin Only):
* **Endpoint:** `DELETE /users/:id`
* **Success Response (200):** `{ "success": true, "data": { "id": "..." } }`.

---

### 🔵 ثانياً: العملاء والمستثمرين (Clients)

#### 1. استعراض العملاء والبحث:
* **Endpoint:** `GET /clients?page=1&limit=500&search=...`
* **Query Parameters:**
  - `page`: رقم الصفحة (افتراضي 1).
  - `limit`: عدد السجلات (افتراضي 500).
  - `search`: بحث مرن يبحث تلقائياً في (الاسم الكامل، الرقم القومي، رقم الهاتف، البريد).
* **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "clients": [
        {
          "id": "b1111111-1111-1111-1111-111111111111",
          "full_name": "أحمد محمد علي",
          "national_id": "29001011234567",
          "phone": "01012345678",
          "email": "ahmed.ali@example.com",
          "address": "القاهرة - التجمع الخامس",
          "notes": "مستثمر في قطاع الصناعات الغذائية",
          "is_active": true,
          "operations": [ ... ], // قائمة العمليات المرتبطة بالعميل
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "total": 2,
      "page": 1,
      "limit": 500
    }
  }
  ```

#### 2. جلب تفاصيل عميل محدد:
* **Endpoint:** `GET /clients/:id` (يقبل الـ UUID أو الـ `national_id`).
* **Success Response (200):** يعيد `{ success: true, data: { client: { ... } } }`.

#### 3. إنشاء عميل جديد:
* **Endpoint:** `POST /clients`
* **Request Body:**
  ```json
  {
    "full_name": "عميل تجريبي",
    "national_id": "29801011234567",
    "phone": "01099998888",
    "email": "client@investor.com",
    "address": "الجيزة، مصر",
    "notes": "ملاحظات إضافية",
    "is_active": true
  }
  ```
* **Success Response (201):** يعيد `{ success: true, data: { client: { ... } } }`.

#### 4. تعديل بيانات عميل:
* **Endpoint:** `PUT /clients/:id`
* **Request Body:** نفس حقول الإنشاء (يتم تحديث الحقول المرسلة).
* **Success Response (200):** يعيد `{ success: true, data: { client: { ... } } }`.

#### 5. حذف عميل:
* **Endpoint:** `DELETE /clients/:id`
* **Success Response (200):** يعيد `{ success: true, data: { id: "..." } }`.

---

### 🟣 ثالثاً: الخدمات الاستثمارية (Services)

#### 1. استعراض الخدمات:
* **Endpoint:** `GET /services?limit=100&is_active=true`
* **ميزة هامة:** الباك إند يقوم تلقائياً بحساب `operations_count` لكل خدمة عبر `LEFT JOIN` وإرجاعها جاهزة!
* **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "services": [
        {
          "id": "a1111111-1111-1111-1111-111111111111",
          "name": "تأسيس شركات",
          "description": "خدمات تأسيس الشركات بأنواعها المختلفة...",
          "category": "تأسيس",
          "is_active": true,
          "operations_count": 2,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "total": 3
    }
  }
  ```

#### 2. جلب تفاصيل خدمة:
* **Endpoint:** `GET /services/:id` -> `{ success: true, data: { service: { ... } } }`.

#### 3. إنشاء خدمة جديدة:
* **Endpoint:** `POST /services`
* **Request Body:**
  ```json
  {
    "name": "خدمة جديدة",
    "description": "وصف الخدمة...",
    "category": "تراخيص",
    "is_active": true
  }
  ```
* **Success Response (201):** يعيد `{ success: true, data: { service: { ... } } }`.

#### 4. تعديل خدمة:
* **Endpoint:** `PUT /services/:id`
* **Success Response (200):** يعيد `{ success: true, data: { service: { ... } } }`.

#### 5. حذف خدمة:
* **Endpoint:** `DELETE /services/:id`
* *(ملاحظة أمان: يمنع الباك إند حذف الخدمة إذا كانت مرتبطة بعمليات نشطة ويُرجع رسالة توضيحية بدلاً من كراش).*

---

### 🟠 رابعاً: العمليات والطلبات (Operations)

> **⭐ ميزة حاسمة مدمجة في الباك إند:**
> جميع استعلامات العمليات (`GET` / `POST` / `PUT` / `PATCH`) تتضمن **LEFT JOIN** تلقائي يجلب:
> * `client_name`: اسم العميل المستثمر الحقيقي.
> * `service_name`: اسم الخدمة الحقيقي.
> * `assigned_to_name`: اسم الموظف المسؤول إن وجد.
> هذا يضمن عدم ظهور أي كلمة "Unknown" في جداول وبطاقات الفرونت إند!

#### 1. استعراض قائمة العمليات والفلترة:
* **Endpoint:** `GET /operations?limit=500&status=...&priority=...&search=...`
* **Query Parameters المدعومة:**
  - `limit`: عدد العمليات (افتراضي 500).
  - `page`: رقم الصفحة.
  - `status`: الفلترة حسب الحالة (`pending`, `in_progress`, `completed`, `rejected`, `cancelled`).
  - `priority`: الفلترة حسب الأولوية (`low`, `normal`, `high`, `urgent`).
  - `client_id`: فلترة لعميل معين.
  - `service_id`: فلترة لخدمة معينة.
  - `from_date` و `to_date`: فلترة نطاق زمني للتقارير.
  - `search`: بحث نصي في اسم العميل، اسم الخدمة، أو الملاحظات.
* **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "operations": [
        {
          "id": "c1111111-1111-1111-1111-111111111111",
          "client_id": "b1111111-1111-1111-1111-111111111111",
          "service_id": "a1111111-1111-1111-1111-111111111111",
          "assigned_to": null,
          "status": "in_progress",
          "priority": "high",
          "notes": "{\"_amount\":15000,\"_receipt\":\"REC-2026-001\",\"_notes\":\"جاري استكمال الأوراق...\"}",
          "client_name": "أحمد محمد علي",
          "service_name": "تأسيس شركات",
          "assigned_to_name": null,
          "started_at": "...",
          "completed_at": null,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "total": 3
    }
  }
  ```

#### 2. إنشاء عملية جديدة:
* **Endpoint:** `POST /operations`
* **Request Body:**
  ```json
  {
    "client_id": "b1111111-1111-1111-1111-111111111111",
    "service_id": "a1111111-1111-1111-1111-111111111111",
    "status": "pending",           // 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
    "priority": "normal",          // 'low' | 'normal' | 'high' | 'urgent'
    "notes": "{\"_amount\": 5000, \"_receipt\": \"REC-1002\", \"_notes\": \"وصف العملية\"}",
    "assigned_to": null            // اختياري: معرف الموظف المسند إليه
  }
  ```
* **Success Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "operation": {
        "id": "...",
        "client_name": "أحمد محمد علي",
        "service_name": "تأسيس شركات",
        ...
      }
    }
  }
  ```

#### 3. تعديل عملية بالكامل:
* **Endpoint:** `PUT /operations/:id`
* **Request Body:** نفس حقول الإنشاء.
* **Success Response (200):** يعيد `{ success: true, data: { operation: { ... } } }`.

#### 4. تحديث حالة العملية فقط (Status Patching):
* **Endpoint:** `PATCH /operations/:id/status`
* **Request Body:**
  ```json
  {
    "status": "in_progress" // 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  }
  ```
* **Success Response (200):** يعيد `{ success: true, data: { operation: { ... } } }`.

#### 5. حذف عملية:
* **Endpoint:** `DELETE /operations/:id`
* **Success Response (200):** يعيد `{ success: true, data: { id: "..." } }`.

---

## 📦 6. بروتوكول حقل الملاحظات والمبلغ ورقم الإيصال (`notes Envelope`)

لتخزين المبلغ (`amount`) ورقم الإيصال (`receiptNumber`) مع الحفاظ على مرونة الباك إند، يعتمد الفرونت إند والباك إند النسق التالي داخل حقل `notes`:

```javascript
// التشفير عند الإرسال للباك إند:
const encodeNotes = ({ amount, receiptNumber, notes }) =>
  JSON.stringify({
    _amount: parseFloat(amount) || 0,
    _receipt: receiptNumber || '',
    _notes: notes || '',
  });

// فك التشفير عند الاستلام من الباك إند:
const decodeNotes = (raw) => {
  try {
    const p = JSON.parse(raw || '{}');
    if (p._amount !== undefined) {
      return {
        amount: p._amount,
        receiptNumber: p._receipt,
        notes: p._notes,
      };
    }
  } catch {}
  return { amount: 0, receiptNumber: '', notes: raw || '' };
};
```

---

## 🔄 7. تحويل الحالات بين الفرونت إند والباك إند (Status Mapping)

| حالة الفرونت إند (Display) | حالة الباك إند (Database / API) |
| :--- | :--- |
| `Pending` | `pending` |
| `In Progress` | `in_progress` |
| `Completed` | `completed` |
| `Rejected` | `rejected` |
| `Canceled` | `cancelled` |

دوال التحويل البسيطة:
```javascript
export const capitalizeStatus = (s = '') =>
  ({
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Canceled',
  }[s] || s);

export const backendStatus = (s = '') =>
  ({
    Pending: 'pending',
    'In Progress': 'in_progress',
    Completed: 'completed',
    Rejected: 'rejected',
    Canceled: 'cancelled',
  }[s] || s.toLowerCase());
```

---

## 💻 8. ملفات الخدمات الجاهزة للفرونت إند (Drop-in Code)

### أ) `src/services/apiClient.js`
```javascript
// src/services/apiClient.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// حقن توكن الـ JWT تلقائياً في كل الطلبات
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('inv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// التعامل مع انتهاء الجلسة 401 وإعادة التوجيه لصفحة الدخول
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('inv_token');
      localStorage.removeItem('inv_dashboard_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
```

### ب) `src/services/auth.js`
```javascript
// src/services/auth.js
import apiClient from './apiClient';

const toInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const mapUser = (u) => ({
  id: u.id,
  name: u.full_name,
  username: u.username,
  email: u.email,
  role: u.role,
  is_active: u.is_active,
  initials: toInitials(u.full_name),
});

export const authApi = {
  login: async (username, password) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    localStorage.setItem('inv_token', data.data.token);
    return mapUser(data.data.user);
  },

  getUsers: async () => {
    const { data } = await apiClient.get('/users?limit=100');
    return (data.data.users || []).map(mapUser);
  },

  addUser: async (userData) => {
    const payload = {
      full_name: userData.name,
      username: userData.username || userData.email.split('@')[0],
      email: userData.email,
      password: userData.password,
      role: userData.role,
    };
    const { data } = await apiClient.post('/users', payload);
    return mapUser(data.data.user);
  },

  deleteUser: async (id) => {
    await apiClient.delete(`/users/${id}`);
    return true;
  },

  toggleUser: async (id) => {
    const { data } = await apiClient.patch(`/users/${id}/toggle`);
    return mapUser(data.data.user);
  },
};
```

---

## ✅ 9. قائمة التحقق السريعة (Integration Checklist)

1. [x] السيرفر شغال على المنفذ `5000`: `http://localhost:5000/api/health`.
2. [x] قاعدة البيانات تحتوي على حساب المدير: `admin` / `Admin@1234`.
3. [x] تأكد أن الفرونت إند يقرأ المتغير `VITE_API_URL=http://localhost:5000/api`.
4. [x] عند إنشاء عملية جديدة في `AddOperationModal`:
   - إرسال `client_id` (معرف الـ UUID الحقيقي للعميل).
   - إرسال `service_id` (معرف الـ UUID الحقيقي للخدمة).
   - إرسال `notes` كـ JSON مشفر يحتوي على `_amount` و `_receipt`.
5. [x] الردود تحتوي دائماً على أسماء العملاء والخدمات مباشرة (`client_name`, `service_name`).

---
🎉 **نظام الباك إند جاهز ويعمل بكفاءة بنسبة 100%!**
