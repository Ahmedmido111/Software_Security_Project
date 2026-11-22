# SecureShop · Phase One Security Design

CET431 Software Security, Fall 2026

## 1. Requirements and acceptance

| Brief item | Implemented acceptance path |
| --- | --- |
| Registration and authentication | Register with an email and a 12–128 character password. Confirm with an expiring one-use code from the demo outbox. Sign in and revoke the session by signing out. |
| Catalogue | Browse active products, search name or description, filter category and open product detail. |
| Session cart | Add, change quantity or remove. Guest cart survives sign-in. Sign-out ends that cart session. |
| Coupons and newsletter | Signed-in account opts in and gets one personal coupon. Apply or remove a public or personal coupon from the cart before payment. |
| Checkout and orders | Pay with store credit. View a receipt with immutable purchase-time line items and revisit it in order history. |
| Account | View email and balance, change display name and access only own orders. Email is the verified identity. |
| Admin | Create, edit and deactivate products and public coupons. View, suspend and reactivate customer accounts. Review recent audit activity. |
| Usability | Desktop and mobile layout, visible labels and keyboard focus, meaningful error messages, reduced-motion styling and animated feedback. |

Phase One submission calls for requirements, design, a threat model and a working implementation with defenses for course material taught so far. Phase Two calls for the completed coverage matrix and reports, the scheduled Red/Blue activity and the live demonstration. The project brief describes a six-person team, with three members on each side. The records and test output here are a starting point for the team’s own evidence and discussion.

## 2. Threat model

**Assets.** Customer credentials and account-confirmation codes, active session identifiers, identity/profile data, private coupon codes, stock, order data, store-credit ledger effects and administrative audit records.

**Actors.** Anonymous visitor, customer, administrator and local machine operator. A malicious visitor may repeatedly call public endpoints. A malicious customer has a valid session and can submit arbitrary form data. A malicious site can cause a browser to initiate requests. Someone with local filesystem access can read demo delivery and database files. An administrator can affect all customers and store availability.

| Trust boundary | Entry points | What the server trusts |
| --- | --- | --- |
| Browser → HTTP server | Cookies, form fields, origin, URL, query, route and method | Server-generated session state, validated origin and request token, and checked fields. Price, stock, role and order ownership are resolved independently of input. |
| Server → database | Searches, mutations, checkout and audit | Fixed SQL with bound values, constraints and explicit transactions. |
| Database → HTML | Catalogue, display names, newsletter codes, receipt lines and history | Output is context-encoded in markup. Asset paths are fixed. |
| Server → delivery simulator | Confirmation code and email address | Local filesystem outbox. Operator access is trusted for the local demo. |
| Administrator → store management | Users, stock, prices, coupon discounts and availability | Verified and active admin session plus per-request authorization. |

**Abuse cases and invariants.** An unconfirmed or suspended account cannot sign in. Revoking a user revokes sessions on the current instance. Customers cannot retrieve another customer’s receipt or modify the catalogue. Discounts are bounded to 1–50%, private codes belong to one account, and each coupon is used once per account. A checkout either commits every effect or commits none. Checkout totals and stock come from the same transaction, and the submitted quote must match the latest authoritative calculation.

**Scope.** Course demo on one machine, one server process, test accounts, virtual store credit, no card data. Browser, Node runtime and local administrator are trusted. Credentials and outbox messages are sensitive even though the data is synthetic.

## 3. Security coverage matrix

“Checked” below refers to the isolated integration check. “Code review” identifies a control present in the implementation without a corresponding automated assertion. “Phase Two” identifies planned work or a residual risk. The matrix is structured for the team to add new topics as the course progresses.

| Topic and source | SecureShop scenario and root cause | Defense and code location | Evidence or status |
| --- | --- | --- | --- |
| CIA and accountability · Lecture 1 | Profile/order data exposure, unexpected store mutations or service exhaustion | Ownership queries, bounded input and hashing concurrency, atomic checkout, actor/event/time rows via `audit` | Checked ownership, admin denial and completed checkout. Audit is local and editable by the operator. |
| Authentication vs authorization · Lectures 1 and 4 | Customer attempts administration or visits a receipt by identifier | `requireUser`, `activeUser`, role-restricted admin mutation and order lookup by ID/owner | Checked admin read/write denial and cross-account receipt rejection. |
| Password storage and guessing · Lecture 4 | Credential guessing or disclosed password database | Per-user random salt, scrypt work parameters N=32768/r=8/p=3, timing-safe digest comparison, generic credential failure, IP/account throttling and bounded hash concurrency | Checked sign-in, generic unconfirmed denial and the account-level attempt cap. Hashing reviewed. Node scrypt chosen to keep the local build dependency-free. |
| PINs / security questions · Lecture 4 | A remote login uses a short secret, or recovery relies on guessable answers | Password length policy. No knowledge-based security questions or remote PIN fallback are provided. Confirmation codes use 256 random bits. | Checked confirmation and replay rejection. Recovery design remains open. |
| One-time possession proof · Lectures 4 and 5 | Account confirmation code is duplicated, leaked or reused | Random bearer code, SHA-256 lookup, 30-minute expiry, one-time consumption, throttling and generic failure. Registration refresh requires the pending account password. | Checked code consumption and replay rejection. Demo outbox models delivery and is readable by the local operator. |
| Biometric / smart-card authentication · Lecture 4; Lecture 5 | A biometric template or device credential would create a new high-value asset and validation boundary | Current build does not enroll biometric templates or smart cards. A future phishing-resistant factor should use platform authenticators without collecting templates. | Scope decision. No biometric or smart-card assurance claimed. |
| Behavioral and location signals · Lecture 5 | Behavioral profiles or location can be unreliable, privacy-sensitive or spoofable | This local build uses bounded sessions, logout revocation, and per-request active-user checks. These controls limit some exposure and provide no continuous identity or geolocation assurance. | Checked logout and administrator suspension. Risk-based step-up remains open. |
| TOTP, HOTP and MFA · Lecture 5 | A password can be compromised. One-time authenticators can be replayed or relayed absent proper verification. | The current password flow and confirmation token address separate lifecycle events. Phase Two should add an independent authenticator for staff and define enrollment, replay prevention and recovery. | Phase Two. Account confirmation is not login MFA. |
| Passkeys / phishing resistance · Lecture 5 | Credential relay across a fake origin or stolen bearer session | Same-origin form checks and session revocation address different attacks. For phishing-resistant sign-in, validate WebAuthn challenges, expected origin, RP ID and user verification through a maintained library. | Phase Two. Public TLS deployment and passkey enrollment are outstanding. |
| Session fixation and invalidation | Guest session identifier persists after privilege change, or logged-out IDs remain valid | `sessionFor` rotates ID and CSRF token after login; server keeps hashed lookup keys with absolute TTL; logout/suspension remove sessions. Cookie is HttpOnly and SameSite=Lax. | Checked cookie flags, rotation, logout and suspension. Secure flag and HSTS require HTTPS deployment. |
| Cross-site requests / clickjacking | Cookie-authenticated form is submitted from another origin or framed | POST-only mutations, exact Origin and CSRF checks, CSP frame-ancestors and X-Frame-Options | Checked missing token and foreign-origin rejection plus response headers. |
| SQL injection | User-controlled search, ID, code or profile input enters query syntax | Input constraints and bound parameters in `run`, `get`, and `all`. No dynamic SQL identifiers. | Checked normal filtering. Parameter use code reviewed. |
| HTML injection / cross-site scripting | Product or profile output is interpreted as markup | `e` encodes rendered inputs, no HTML authoring fields, scripts and CSS are same-origin, restrictive CSP | Checked HTML encoding and CSP header. |
| Business logic and races | Invalid quantity, double spending, stale price, depleted stock or coupon reuse | Integer bounds, server quote with per-payment nonce, conditional stock/credit deductions, unique redemption, `BEGIN IMMEDIATE`, rollback | Checked negative quantity, order/credit/stock consistency, repeated submission, coupon ownership/reuse and the rollback of stock and coupon effects after insufficient credit. Concurrent multi-process behavior has not been tested. |
| Confidentiality in logs and local files | Credentials or tokens exposed by HTTP logging or file serving | Audit logs event identifiers and actor IDs. Explicit static allowlist. Data excluded from Git. | Code review. Restrict local filesystem access. Audit integrity or independent nonrepudiation is not claimed. |
| Native memory safety · Lecture 1 example | Unsafe memory operations in native components | JavaScript application with bounded payloads and no project-authored native code | Inherited Node/SQLite maintenance risk. Review separately if native code is introduced. |

## 4. Evidence and Phase Two handoff

Run `node check.mjs` and attach the real output for the version under review. The check tests the defended application against expected authorization and state outcomes. The baseline passed the isolated integration check on Node.js 24.13.0. A separate Edge browser check passed desktop search and cart navigation, sign-in error rendering and mobile layout at a 390 px viewport. The brief also asks for evidence against naive implementations, a complete attack evidence report and Red Team findings. Those are not supplied by this baseline.

Before expanding beyond loopback, configure trusted HTTPS, secure host-only cookies, TLS policies, a real confirmation delivery integration, and secret/data lifecycle controls. Plan a passkey-based admin factor with enrollment and recovery. Move sessions and rate limits to shared storage if running multiple processes. Consider a transactional email outbox, expired demo-mail cleanup, audit retention and protection, and backups with restore testing. Record the code revision, preconditions, expected result, actual result and remediation for each team-owned finding. Reconcile the matrix against any additional lectures and lab material before the final demo.

## 5. Course references

- CET431_Project_Description.pdf, pp. 1–3, Software Security Project Requirements.
- Lecture-1 (Week1-3).pdf, fundamentals, security objectives and principles.
- Lecture-4-part-1.pdf, authentication factors, passwords, PINs, possession factors and biometrics.
- Lecture 5.pdf, behavioral/location signals, time-based authentication, MFA and WebAuthn.
