# JMS Event App — Start here (fresh build, user + admin)

This folder is a **fresh kit**. Your goal: upload **`JMS-Event-Data.xlsx`** to OneDrive/Google Drive, create an AppSheet app, apply this document once, **deploy**.

---

## Step 0 — Build the Excel file (this PC)

From this folder in PowerShell:

```powershell
python scripts\setup_excel.py
```

This creates/overwrites **`JMS-Event-Data.xlsx`** with all tables and Excel **Table** styling.

Then:

1. Upload **`JMS-Event-Data.xlsx`** to cloud (OneDrive recommended if you use Microsoft).
2. Open the file once, set **`AdminConfig!AdminPortalPassword`** to a strong PIN (replace `CHANGE_ME_ADMIN_PIN`).
3. (Optional) Paste a banner image URL or file into **`AdminConfig!HeroImageURL`** after you add the image to Drive— or leave blank for text-only home.

---

## Step 1 — Create the AppSheet app

1. Go to [AppSheet](https://www.appsheet.com) → **Create** → app from your spreadsheet **`JMS-Event-Data.xlsx`**.
2. **Data → Tables**: confirm all sheets exist:
   - `Registrations`, `FamilyMembers`, `Donations`, `CheckIn`, `AdminPortalAttempts`, `AdminConfig`, `ProfessionMaster`, `DesignationMaster`.

---

## Step 2 — Keys, refs, critical types (5 minutes)

Do this in **Data → Columns** (details in `APPSHEET-FULL-SPEC.md`):

| Table | Key column | Initial value |
|-------|------------|----------------|
| `Registrations` | `RegistrationID` | `UNIQUEID()` |
| `FamilyMembers` | `MemberID` | `UNIQUEID()` |
| `Donations` | `DonationID` | `UNIQUEID()` |
| `CheckIn` | `CheckInID` | `UNIQUEID()` |
| `AdminPortalAttempts` | `AttemptID` | `UNIQUEID()` |
| `AdminConfig` | `ConfigID` | (manual `CFG-1`) |

**Refs**

- `FamilyMembers[RegistrationID]` → Ref `Registrations`, **IsPartOf = ON**.
- `Donations[RegistrationID]` → Ref `Registrations`.
- `CheckIn[RegistrationID]` → Ref `Registrations`.
- `CheckIn[MemberID]` → Ref `FamilyMembers`.

**Types**

- `PrimaryMobile`, `Mobile` → **Phone**
- `PrimaryEmail` → **Email**
- `WantsDonation`, `WillDonate` → **Yes/No**
- `DonationAmountIntent`, `AmountPaid` → **Price**
- `SubmissionDateTime`, `PaymentTime` → **DateTime** (where used)
- `PaymentScreenshot` → **Image**
- `InviteCardURL`, `IDCardURL` → **File** (URLs from automation later)
- `Status`, `CheckInStatus` → **Text** or **Enum** (see spec)
- **`Registrations[Address]`** → **Long Text** (avoid unwanted Map view)

---

## Step 3 — Paste formulas (exact list)

Open **`APPSHEET-FULL-SPEC.md`** section **Formulas** and paste into the matching columns:

- `FamilyMembers[SerialNo]` → App formula  
- `Registrations[TotalMembers]` → App formula  
- `Registrations[QRCodePayload]` → App formula  
- `Registrations[Status]` → App formula  
- `Registrations[SubmissionDateTime]` → Initial value `NOW()`
- Optional virtual image on donations for QR display (spec file)

---

## Step 4 — Stunning UX (structure)

### Theme (recommended)

**Brand / Theme**: Primary **`#1a237e`** (deep indigo), Secondary **`#c9a227`** (gold), Background light grey or white.

### Views to create — in this order

| Order | View name | Table | Type | Audience |
|------|-----------|-------|------|----------|
| 1 | `Home` | `AdminConfig` | **Deck** or **Gallery** | Everyone |
| 2 | `User Registration` | `Registrations` | **Form** | Add only |
| 3 | `Thank you` | `Registrations` | **Detail** (read-only-ish) | After submit |
| 4 | `Admin PIN` | `AdminPortalAttempts` | **Form** | Organisers |
| 5 | `Admin — Registrations` | `Registrations` | Table or Deck | Organisers |
| 6 | `Admin — Members` | `FamilyMembers` | Table | Organisers (check-in) |
| 7 | `Walk-in Registration` | `Registrations` | **Form** (copy of User Registration) | Organisers |

**Important:** Hide admin views from casual users via **UX menu** arrangement + **security** if possible; at minimum keep **Home** pleasant and dominant.

### App starting view

**Settings / Brand**: **Starting view / Primary view** = **`Home`**.

### Delete or demote accidental Map views

If you see **Map** on Registrations:

- Kill the Map **view**, or drag it below `Home`.
- Confirm `Address` is **Long Text** (Step 2).

---

## Step 5 — `Home` actions (dual portal)

On **`Home`** (table `AdminConfig`), add **actions** on the row/card:

1. **Register for event** → *Go to another view* → **`User Registration`**  
2. **Download my pass** (optional later) — skip until PDFs exist  
3. **Admin portal** → *Go to another view* → **`Admin PIN`**

---

## Step 6 — User registration form — ONLY these fields

Open **`User Registration`** → **Customize / Fields**:

**Include** (friendly labels in AppSheet display name):

- PrimaryName → *Your full name*
- PrimaryMobile → *Mobile number*
- PrimaryEmail → *Email*
- Address, City
- Profession, Designation (from masters or text)
- WantsDonation → *Would you like to contribute a voluntary donation?*
- DonationAmountIntent → show only if donation Yes (see spec **Show_If**)
- **Related FamilyMembers** (inline): MemberName, Relation, Age, Gender, Mobile, Profession, Designation

**Never include** on this form:

- `RegistrationID`, `SubmissionDateTime`, `TotalMembers`, `InviteCardURL`, `IDCardURL`, `QRCodePayload`, `Status`

For each of those columns: **Data → Columns → Editable = OFF**. They are filled by AppSheet / automation.

---

## Step 7 — Admin PIN gate

View **`Admin PIN`** on `AdminPortalAttempts`:

- Only field: **TypedPIN** (display name: *Organiser PIN*)
- Add **Description** at top of form:

  > **Organiser access only.** For event registration, go back to **Home** and tap **Register for event**.

**Valid_If** on `TypedPIN`:

```
[TypedPIN] = LOOKUP("CFG-1","AdminConfig","ConfigID","AdminPortalPassword")
```

**Invalid value error**:

```
Wrong PIN. This is the admin portal. For registration tap Home → Register for event.
```

**Form saved behavior**: navigate to **`Admin — Registrations`** (Grouped action: Navigate).

---

## Step 8 — Donation flow

- Participant selects **WantsDonation** on Registration.
- After save, optional: open **Donations** detail or embedded — spec in `APPSHEET-FULL-SPEC.md` for `Show_If` on payment fields.

---

## Step 9 — Automation (cards & PDF)

Use **Bots** + document templates (`templates/` folder markdown can be pasted into Docs/Word templates AppSheet expects).

Minimum viable: after registration, email yourself the row ; full PDF pipeline is optional but described in **`APPSHEET-FULL-SPEC.md`** (Automation subsection).

---

## Step 10 — Security & sharing

- **Public registrations**: Often **Require user sign-in = OFF** for mass events.  
  Lock down editing: participant form only adds `Registrations` + nested `FamilyMembers`; hide admin slices.
- **Admin**: Prefer **PIN + organiser-trained staff** ; for strongest security duplicate the admin area into an app with workspace sign-in.

---

## Step 11 — Deploy

**Manage → Deploy**. Fix warnings where possible ; account errors may still allow deploy with override.

Share the participant link → should open **`Home`**, not a map.

---

## Files in this kit

| File | Purpose |
|------|---------|
| `JMS-Event-Data.xlsx` | Generated workbook — upload this |
| `APPSHEET-FULL-SPEC.md` | All formulas & validation snippets |
| `templates/id-card-template.md` | Document template starter |
| `templates/invitation-template.md` | Invitation wording starter |
| `data/*.csv` | Source columns if you regenerate Excel |

If anything in AppSheet wording differs slightly (menus renamed), tell me what you see and I align the labels.
