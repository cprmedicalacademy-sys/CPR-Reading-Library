# CPR Reading Library — Member Management & QR Verification System
**Location**: Chattogram, Bangladesh  
**Target Users**: Library Administrators, Reception Officers, Registered Doctors

A complete, production-grade web application built for **CPR Reading Library, Chattogram** to manage doctor memberships, generate unique QR verification codes, print physical CR80 library cards, and provide cryptographically secure entrance verification.

---

## Key Features

1. **Brand-Specific Design**:
   - Clean white layout with prestigious dark green (`#064e3b`) and subtle gold accents.
   - Medical & educational typography with tabular numerals for IDs and dates.
   - Zero AI-slop visual discipline: clean hairline borders, no decorative status dots, no thick left borders.

2. **Secure Admin Authentication**:
   - Supabase Auth integration with email/password authentication.
   - Public self-registration is strictly disabled; accounts are managed by authorized library administrators.
   - Session persistence and protected routes.

3. **Manual Doctor Registration**:
   - Fields: Full Name, unique Member ID (`CPR-0001`), Profile Photo, BMDC Registration Number, Mobile Number, Admission Date, Membership Expiry Date, Active/Inactive switch, and Private Internal Notes.
   - Auto-generated next Member ID (e.g. `CPR-0006`).
   - Strict validation preventing duplicate Member IDs.
   - Bangladesh date formatting (`DD MMMM YYYY`).

4. **Unique QR Code Generation**:
   - Every member receives a permanent, unique QR code linking to their public verification URL (`/verify/:id`).
   - Encodes only the member's unique UUID — no private data is encoded in the QR.
   - Member renewals and information updates immediately reflect on the same QR code without reprinting.
   - High-resolution preview and PNG download.

5. **Printable Library Membership Cards**:
   - Exact standard CR80 physical card dimensions (85.6mm × 54mm).
   - High-contrast layout with official library seal, doctor photo, Member ID, validity dates, and live QR code.
   - Reverse side includes library regulations, Chattogram address, and authorized signature line.
   - Direct browser printing (`window.print()`) with print CSS (`@media print`) and Batch Sheet print mode.

6. **Privacy-Strict Public QR Verification (`/verify/:id`)**:
   - Opens publicly without login when a physical card is scanned.
   - **Zero Data Leakage**: Never exposes mobile numbers, BMDC registration numbers, or internal notes.
   - Status logic:
     - **Active**: Membership is enabled and expiry date is today or later (Emerald verified badge).
     - **Expired**: Expiry date has passed (Amber overdue notice).
     - **Inactive**: Manually disabled or suspended (Slate notice).
     - **Invalid**: "Invalid QR Code — Member Not Found" for unrecorded tokens.
   - Enforced at database level via PostgreSQL `SECURITY DEFINER` function `get_public_member_verification(UUID)`.

7. **Membership Renewal System & Audit Logs**:
   - Update expiration dates with 1-click presets (+6 Months, +1 Year, +2 Years).
   - Keeps identical Member ID and QR code.
   - Automatically records previous and new expiry dates, timestamp, and administrator email in `membership_renewals`.

8. **Entrance Desk Verifier**:
   - Reception staff can scan with a barcode/QR reader, paste a link, or type a Member ID for instantaneous gate clearance.

9. **Membership Fee Management**:
   - Monthly membership fee fixed at **৳2,000 / month**.
   - Automatic calculations on registration:
     - Total Payable = Monthly Fee × Duration Months (e.g. ৳2,000 × 6 = ৳12,000)
     - Total Paid = Sum of all confirmed payments
     - Remaining Due = Total Payable − Total Paid
   - Accidental overpayment detection and warning safeguards.
   - Member profile fee summary drawer with payment history and real-time dues tracking.

10. **Printable Money Receipts (A4 Dual Copy — Black & White)**:
    - Pure white background, crisp black text and borders, zero ink waste.
    - Two identical copies on a single A4 page:
      - Top copy: **STUDENT'S COPY**
      - Bottom copy: **OFFICE COPY**
      - Clear dashed cutting line between the two vouchers (`✂ CUT HERE · FOLD OR DETACH`).
    - Contains: Receipt No. (sequential `CPR-RCP-000001`), payment date, received from, Member ID, receipt for, monthly fee (৳2,000), membership period (From/To), total payable, previous paid, current payment received, total paid after this payment, remaining due amount, payment method (Cash, Bank, Mobile Banking, Other), transaction reference, amount in words ("Five Thousand Taka Only"), authorized signature line, and member signature line.
    - Actions: Print Both Copies (A4 default), Print Student's Copy, Print Office Copy, Save as PDF.

---

## Database Architecture (Supabase PostgreSQL)

Full migration file: `supabase/migrations/20261015000000_init_cpr_library.sql`

### Tables
1. **`members`**:
   - `id`: UUID (Primary Key, `gen_random_uuid()`)
   - `member_no`: TEXT UNIQUE (e.g. `CPR-0001`)
   - `full_name`: TEXT NOT NULL
   - `photo_url`: TEXT NULL
   - `bmdc_no`: TEXT NULL (Private BMDC license)
   - `phone`: TEXT NULL (Private mobile)
   - `joined_on`: DATE NOT NULL
   - `expires_on`: DATE NOT NULL
   - `is_active`: BOOLEAN NOT NULL DEFAULT true
   - `notes`: TEXT NULL (Private admin remarks)
   - `monthly_fee`: NUMERIC NOT NULL DEFAULT 2000
   - `membership_months`: INTEGER NOT NULL DEFAULT 12
   - `total_payable`: NUMERIC NOT NULL DEFAULT 24000
   - `membership_start_date`, `membership_end_date`: DATE
   - `created_at`, `updated_at`: TIMESTAMPTZ

2. **`payments`**:
   - `id`: UUID (Primary Key)
   - `receipt_no`: TEXT NOT NULL UNIQUE (e.g. `CPR-RCP-000001`)
   - `member_id`: UUID REFERENCES `members(id)` ON DELETE CASCADE
   - `amount`: NUMERIC NOT NULL CHECK (amount > 0)
   - `payment_date`: DATE NOT NULL DEFAULT CURRENT_DATE
   - `payment_method`: TEXT ('Cash', 'Bank', 'Mobile Banking', 'Other')
   - `transaction_reference`: TEXT NULL
   - `notes`: TEXT NULL
   - `recorded_by`: UUID REFERENCES auth.users(id)
   - `recorded_by_email`: TEXT
   - `created_at`: TIMESTAMPTZ

3. **`membership_renewals`**:
   - `id`: UUID (Primary Key)
   - `member_id`: UUID REFERENCES `members(id)` ON DELETE CASCADE
   - `previous_expiry_date`: DATE NOT NULL
   - `new_expiry_date`: DATE NOT NULL
   - `renewed_at`: TIMESTAMPTZ NOT NULL
   - `renewed_by_email`: TEXT

### Security & Row Level Security (RLS)
- Anonymous role (`anon`) has **ALL table access revoked**.
- Authenticated role (`authenticated`) has full access to manage members and renewals.
- Public verification is exposed solely through:
  ```sql
  get_public_member_verification(member_uuid UUID)
  ```
  which returns only `member_no`, `full_name`, `photo_url`, `joined_on`, `expires_on`, `status`, and `is_valid`.

---

## Local Setup Instructions

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   VITE_APP_URL="http://localhost:3000"
   ```

3. **Run Supabase Migration**:
   - In your Supabase dashboard, go to the **SQL Editor**.
   - Copy the contents of `supabase/migrations/20261015000000_init_cpr_library.sql` (or copy directly from the **Settings** tab in the app UI) and run it.

4. **Disable Public Signups in Supabase**:
   - Navigate to **Authentication → Providers → Email**.
   - Uncheck **Enable Signups**.
   - Create your administrator user in **Authentication → Users**.

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

---

## Vercel Deployment Instructions

1. Push this repository to GitHub or GitLab.
2. In the Vercel dashboard, click **Add New → Project** and import the repository.
3. Framework Preset: **Vite**.
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `VITE_APP_URL`: Your Vercel domain (e.g., `https://cpr-library.vercel.app`)
5. Click **Deploy**.
6. All QR codes generated for physical cards will automatically link to `https://cpr-library.vercel.app/verify/:id`.

---

## Testing Credentials (Demo Mode)

When testing before connecting Supabase:
- **Email**: `cprmedicalacademy@gmail.com`
- **Password**: `cprlibrary2026`
- (Or click **Fill Primary Admin** on the login screen)
