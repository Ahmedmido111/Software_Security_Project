# SecureShop · CET431 Phase One

A local e-commerce application for the Software Security project. The storefront and administration interface share a server-rendered design, while SQLite holds catalogue, customer, stock, coupon, order and audit records.

## Run on Windows

Requires Node.js 24. Open PowerShell in this folder.

```powershell
node server.mjs --seed-demo
Get-Content data/demo-credentials.json
node server.mjs
```

Open [SecureShop](http://127.0.0.1:4310). The seed command creates a normal customer (`customer@secureshop.test`) and an administrator (`admin@secureshop.test`) with locally generated passwords. Run the seed command before allowing anyone else access to the test instance. Keep the credential file and data directory out of Git. Node 24 may print an experimental warning for its built-in SQLite module.

Use `SHOP_PORT` to choose a different port and `SHOP_DATA` to select a separate local data directory. The listener binds to `127.0.0.1`, and the browser URL must use that address. This instance uses HTTP for the loopback demo. Sessions expire 30 minutes after creation and are cleared on server restart. Orders, accounts, stock and coupons persist.

To create an independent account, register in the browser and read the latest matching file in `data/outbox`. Copy the confirmation code into the confirmation page within 30 minutes. To request a fresh code for a pending account, submit registration again with the same email and password. The files simulate delivery for a local demonstration. The application serves neither the outbox nor the SQLite database over HTTP.

## Verify

```powershell
node check.mjs
```

The check creates an isolated temporary database, uses loopback port 4311, and removes the temporary database when it finishes. Set `SHOP_TEST_PORT` if that port is occupied. See [security design and coverage](SECURITY-DESIGN.md) for evidence and residual risks.

## Demo walkthrough

1. Browse or filter the collection. Open a product detail and add it to the cart.
2. Register and confirm a new account. Sign in and verify the guest cart carried over.
3. Update the display name, subscribe on the account page, and copy the personal coupon.
4. Change the cart quantity, apply the coupon and pay with store credit. Open the receipt and order history.
5. Sign out. Sign in with the admin demo account. Add or update a product, manage a public coupon, and suspend or reactivate the demo customer.
6. Run the verification command and explain the checkout transaction, authorization middleware and session lifecycle.

## Project structure

| File | Responsibility |
| --- | --- |
| `config.mjs`, `db.mjs`, `seed.mjs` | Configuration, SQLite schema and helpers, demo account seeding |
| `request.mjs`, `server.mjs` | Security headers, validation, form parsing, request pipeline and routing |
| `crypto.mjs`, `auth.mjs` | Password hashing, sessions, rate limiting, registration, confirmation, login, logout |
| `shop.mjs` | Catalogue, cart, coupons, newsletter, account, checkout, receipts |
| `admin.mjs`, `check.mjs` | Administration and the verification script |
| `views.mjs`, `public/` | Server-side rendering, CSS and the small UI script |

## Architecture overview

| Layer | Responsibility |
| --- | --- |
| Browser | Accessible HTML forms and links, responsive product art, reduced-motion support and pending feedback. Minimal JavaScript. |
| `server.mjs` | Explicit routes, request and field validation, session and CSRF middleware, policy checks, business logic and local mail outbox. |
| `views.mjs` | Server rendering with HTML encoding for data inserted into markup. No user content is injected into scripts or CSS. |
| `public/` | Same-origin CSS and small UI script. Only these explicitly mapped files are served. |
| SQLite | Bound parameters, foreign keys, constraints, unique coupon redemption and atomic checkout. |
| `check.mjs` | Repeatable functional and defensive checks using isolated data. |

A visitor gets an opaque session cookie and a server-held cart. Authentication rotates the session, while logout revokes it. When a customer checks out, the server loads current prices and eligibility, confirms the displayed quote, and commits stock deduction, credit deduction, redemption, order snapshot and audit event as one transaction. An order route queries by both order ID and authenticated owner. Administrative mutations have an additional role check on the server.

The app includes original CSS product illustrations and uses built-in Node modules. Review the course’s authorship and citation policy with the teaching staff before submission, disclose the assistance used as required, and have each teammate commit and explain their own validated contributions. The local Git history starts with the delivered baseline and cannot substitute for team contributions.