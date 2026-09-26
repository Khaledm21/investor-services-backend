-- Investor Services Center Management System
-- Seed Data

-- 1. Insert Default Admin User
-- Password: Admin@1234 (Bcrypt hash with 12 rounds)
INSERT INTO users (
    id, full_name, username, email, password_hash, role, is_active
) VALUES (
    '41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6',
    'مدير النظام',
    'admin',
    'admin@investor-services.local',
    '$2a$12$NpdJMEk7cI49p53FF6V0fOlKMpHIgUFQAJcHCxwuJ3KfDizZkWOju',
    'admin',
    TRUE
)
ON CONFLICT (username) DO UPDATE
SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = TRUE;

-- 2. Insert Default Services
INSERT INTO services (id, name, description, category, is_active)
VALUES 
    (
        'a1111111-1111-1111-1111-111111111111',
        'تأسيس شركات',
        'خدمات تأسيس الشركات بأنواعها المختلفة، صياغة عقود التأسيس، واستخراج السجل التجاري والبطاقة الضريبية.',
        'تأسيس',
        TRUE
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        'استشارات استثمارية',
        'تقديم دراسات الجدوى الاقتصادية، الاستشارات القانونية، والتوجيه المالي والتنظيمي للمشاريع الاستثمارية.',
        'استشارات',
        TRUE
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        'استخراج تراخيص وسجلات',
        'استخراج التراخيص الصناعية والتجارية، موافقات الحماية المدنية، والتصاريح البيئية للأنشطة المختلفة.',
        'تراخيص',
        TRUE
    )
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active;

-- 3. Insert Default Clients
INSERT INTO clients (id, full_name, national_id, phone, email, address, notes, is_active)
VALUES 
    (
        'b1111111-1111-1111-1111-111111111111',
        'أحمد محمد علي',
        '29001011234567',
        '01012345678',
        'ahmed.ali@example.com',
        'القاهرة - التجمع الخامس',
        'مستثمر في قطاع الصناعات الغذائية والتصدير',
        TRUE
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        'سارة محمود إبراهيم',
        '29502022345678',
        '01198765432',
        'sara.mahmoud@example.com',
        'الإسكندرية - سموحة',
        'رائدة أعمال ومؤسسة شركة تكنولوجيا معلومات',
        TRUE
    )
ON CONFLICT (national_id) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active;

-- 4. Insert Default Operations
INSERT INTO operations (id, client_id, service_id, status, priority, notes, created_by)
VALUES 
    (
        'c1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'in_progress',
        'high',
        '{"_amount": 15000, "_receipt": "REC-2026-001", "_notes": "جاري استكمال أوراق السجل التجاري لدى الغرفة التجارية"}',
        '41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6'
    ),
    (
        'c2222222-2222-2222-2222-222222222222',
        'b2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        'pending',
        'normal',
        '{"_amount": 5000, "_receipt": "REC-2026-002", "_notes": "طلب دراسة جدوى لمشروع تقني جديد"}',
        '41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6'
    ),
    (
        'c3333333-3333-3333-3333-333333333333',
        'b1111111-1111-1111-1111-111111111111',
        'a3333333-3333-3333-3333-333333333333',
        'completed',
        'urgent',
        '{"_amount": 8000, "_receipt": "REC-2026-003", "_notes": "تم إصدار رخصة التشغيل المؤقتة وتسليمها للمستثمر"}',
        '41ac7a4f-5c2b-4cb6-949f-5cf6a8a97cf6'
    )
ON CONFLICT (id) DO UPDATE
SET
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    notes = EXCLUDED.notes;
