# العضو 2 · الـ Request pipeline

**Branch:** `feature/request-hardening`

## ملفاتك
- `request.mjs`
- `server.mjs`

## إيه اللي بتعمله
- الـ Security headers (CSP, X-Frame-Options, nosniff...) في request.mjs.
- التحقق من المدخلات (str, number, email, code) وقراءة الفورم بحد 8KB ورفض الحقول المكررة.
- `activeUser` و `requireUser` للتحقق من الصلاحيات.
- في server.mjs: فحص الـ Host، الـ rate limit العام، قراءة الجلسة، فحص CSRF والـ Origin، والـ routing ومعالج الأخطاء.

## Commit messages مقترحة
1. `Add security headers and input validation helpers`
2. `Add request pipeline with CSRF and origin checks`
3. `Add routing and centralized error handling`

## أسئلة لازم تقدر تجاوب عليها في المناقشة
- إزاي CSRF بيتمنع هنا (Origin + token)؟
- ليه الـ routes في allowlist (readRoutes / writeRoutes)؟
- إيه فايدة الـ CSP والـ frame-ancestors؟

## قبل ما ترفع
- اقرا كل سطر في ملفاتك وشغّل المشروع (`node server.mjs --seed-demo` ثم `node server.mjs`).
- ارفع من حسابك على GitHub، وافتح Pull Request، وخلّي عضو تاني يراجعه.
