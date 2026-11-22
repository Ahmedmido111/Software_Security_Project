# العضو 4 · منطق المتجر

**Branch:** `feature/shop-logic`

## ملفاتك
- `shop.mjs`

## إيه اللي بتعمله
- الكتالوج والبحث والفلترة والسلة (حدود الكمية وعدد المنتجات).
- الكوبونات: العامة والشخصية، كل كوبون يتستخدم مرة لكل حساب، والخصم من 1 إلى 50%.
- الـ checkout: الـ quote hash، وخصم المخزون والرصيد وتسجيل الطلب في transaction واحدة.
- الإيصال وسجل الطلبات بـ ownership check (id + owner).

## Commit messages مقترحة
1. `Add catalogue, search and session cart`
2. `Add coupons and newsletter personal coupon`
3. `Add atomic checkout with quote verification and receipts`

## أسئلة لازم تقدر تجاوب عليها في المناقشة
- إزاي الـ checkout بيمنع double-spend والـ race conditions؟
- إيه هو الـ quote ولو السعر اتغير وسط العملية يحصل إيه؟
- ليه /order بيسأل بـ id و uid مع بعض؟ (IDOR)

## قبل ما ترفع
- اقرا كل سطر في ملفاتك وشغّل المشروع (`node server.mjs --seed-demo` ثم `node server.mjs`).
- ارفع من حسابك على GitHub، وافتح Pull Request، وخلّي عضو تاني يراجعه.
