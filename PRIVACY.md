# Privacy Policy

> **TEMPLATE — NOT LEGAL ADVICE.** This is a starting draft. Review it with a
> qualified lawyer and replace every `[BRACKETED]` placeholder before publishing
> or relying on it. Laws such as the GDPR, India's DPDP Act, and others impose
> specific obligations this template does not guarantee to meet.

**Effective date:** [DATE]
**Data controller:** [COMPANY LEGAL NAME], [REGISTERED ADDRESS]
**Contact:** [privacy@your-domain]

## 1. Who we are

DeskPal HQ ("the Service") is a multi-company HR platform that lets
organizations manage employee records, attendance, leave, documents and
payroll. This policy explains what personal data we process and why.

Each customer company is the **controller** of its employees' data; [COMPANY
LEGAL NAME] acts as the **processor** on that company's behalf, except for the
account and billing data of the company's administrators, for which we are the
controller.

## 2. Data we process

- **Account & identity:** name, work email, password (stored only as a bcrypt
  hash by our authentication provider), company membership and role.
- **Profile & employment:** phone, date of birth, address, emergency contact,
  designation, department, joining date, reporting manager, avatar image.
- **Attendance & leave:** check-in/out times, shifts, leave requests and
  balances, regularization requests.
- **Payroll:** salary structures, payslips, and bank details (account holder,
  account number, IFSC) where the customer uses payroll features.
- **Documents:** files uploaded to employee document storage.
- **Operational logs:** audit logs, notifications, and security events (e.g.
  a one-way hashed fingerprint of the email used on failed sign-ins).

## 3. Why we process it (purposes & legal bases)

- To provide the Service to the customer company (contract performance).
- To authenticate users and keep accounts secure (legitimate interest / legal
  obligation).
- To comply with employment, tax and payroll obligations (legal obligation).
- To maintain audit trails and prevent abuse (legitimate interest).

## 4. How data is stored and protected

Data is hosted on [Supabase / hosting region: [REGION]]. Security controls
include per-company Row-Level Security, encryption in transit, role-based
access enforced in the database, rate-limited authentication, and audit
logging. See [SECURITY.md](SECURITY.md).

## 5. Sharing and sub-processors

We do not sell personal data. We share it only with sub-processors needed to
run the Service, including:

- [Supabase] — database, authentication and file storage.
- [HOSTING / CDN PROVIDER] — frontend hosting.
- [EMAIL PROVIDER] — transactional email.

[List all sub-processors and their locations.]

## 6. Retention

Personal data is retained for as long as the customer company maintains its
account, and thereafter only as required by law (e.g. payroll/tax records).
On account deletion, data is deleted or anonymized within [N] days, subject to
legal retention requirements.

## 7. Your rights

Depending on your jurisdiction you may have rights to access, correct, delete,
export, or restrict processing of your personal data. Employees should contact
their own employer (the controller) first; you may also contact us at
[privacy@your-domain].

## 8. International transfers

[Describe any cross-border transfers and the safeguards used, e.g. Standard
Contractual Clauses.]

## 9. Children

The Service is not intended for anyone under [16/18] and we do not knowingly
collect their data.

## 10. Changes

We may update this policy; material changes will be communicated to customer
administrators. The "Effective date" above reflects the latest version.

## 11. Contact

[COMPANY LEGAL NAME], [ADDRESS], [privacy@your-domain].
