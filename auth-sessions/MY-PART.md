# العضو 3 · الـ Auth والـ Sessions (Red 1)

**Branch:** `feature/auth-sessions`

## ملفاتك
- `crypto.mjs`
- `auth.mjs`

## إيه اللي بتعمله
- تشفير الباسورد بـ scrypt مع salt عشوائي، والمقارنة بـ timingSafeEqual (crypto.mjs).
- الـ sessions (ID عشوائي 256 bit، متخزن كـ SHA-256 hash، مدة 30 دقيقة) والـ rotation عند تسجيل الدخول.
- الـ rate limiting (login per IP / per email، register، confirm) وحد الـ hashing المتزامن.
- التسجيل وكود التأكيد (استخدام واحد، صلاحية 30 دقيقة) والـ login والـ logout.

## Commit messages مقترحة
1. `Add scrypt password hashing and token helpers`
2. `Add sessions with rotation on login and rate limiting`
3. `Add registration, one-time confirmation, login and logout`

## أسئلة لازم تقدر تجاوب عليها في المناقشة
- إزاي Session fixation بيتمنع؟ (sessionFor عند الـ login)
- ليه الكود بيتمسح بعد الاستخدام ولو اتبعت مرتين؟ (Confirmation replay)
- إيه نقاط ضعف الـ rate limiter؟ (fixed window، lockout DoS، الذاكرة)

## قبل ما ترفع
- اقرا كل سطر في ملفاتك وشغّل المشروع (`node server.mjs --seed-demo` ثم `node server.mjs`).
- ارفع من حسابك على GitHub، وافتح Pull Request، وخلّي عضو تاني يراجعه.
