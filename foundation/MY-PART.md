# العضو 1 · الأساس وقاعدة البيانات

**Branch:** `feature/db-foundation`

## ملفاتك
- `.gitignore`
- `README.md`
- `config.mjs`
- `db.mjs`
- `seed.mjs`
- `SECURITY-DESIGN.md`

## إيه اللي بتعمله
- إعدادات المشروع (المنفذ، الـ origin، مدة الجلسة) في config.mjs.
- جداول SQLite والـ constraints (CHECK, FOREIGN KEY, UNIQUE) والـ transaction helper `tx` في db.mjs.
- إنشاء حسابات الديمو بباسوردات عشوائية في seed.mjs.
- المتطلبات والـ Threat model في SECURITY-DESIGN.md.

## Commit messages مقترحة
1. `Initial commit: project skeleton, README and gitignore`
2. `Add SQLite schema, constraints and transaction helper`
3. `Add demo account seeding`

## أسئلة لازم تقدر تجاوب عليها في المناقشة
- ليه الـ credit ليها CHECK(credit>=0)؟
- يعني إيه BEGIN IMMEDIATE وليه بنستخدمه؟
- ليه data/ و *.sqlite في .gitignore؟

## قبل ما ترفع
- اقرا كل سطر في ملفاتك وشغّل المشروع (`node server.mjs --seed-demo` ثم `node server.mjs`).
- ارفع من حسابك على GitHub، وافتح Pull Request، وخلّي عضو تاني يراجعه.
