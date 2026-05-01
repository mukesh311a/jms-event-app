# JMS — Full AppSheet specification (copy/paste)

Use with **`START-HERE.md`**.

---

## 1) Enum suggestions

**`Registrations[Status]`** (Text or Enum)

- `Registered`
- `Checked-In Partial`
- `Checked-In Complete`

**`FamilyMembers[CheckInStatus]`**

- `Pending`
- `Arrived`
- `Not Arrived`

**`FamilyMembers[Relation]`** (optional Enum)

- Self, Spouse, Son, Daughter, Parent, Other

**`FamilyMembers[Gender]`** (optional Enum)

- Female, Male, Other, Prefer not to say

---

## 2) Formulas (App formula columns)

### `FamilyMembers[SerialNo]`

```
COUNT(SELECT(FamilyMembers[MemberID], [RegistrationID] = [_THISROW].[RegistrationID]))
```

If this returns duplicate serials when adding multiple inline rows in one save, switch to “max+1” variant after first test:

```
MAX(SELECT(FamilyMembers[SerialNo], [RegistrationID] = [_THISROW].[RegistrationID])) + 1
```

Use the second one if AppSheet creates members with same count before commit.

### `Registrations[TotalMembers]`

```
COUNT(SELECT(FamilyMembers[MemberID], [RegistrationID] = [_THISROW].[RegistrationID]))
```

### `Registrations[QRCodePayload]`

```
CONCATENATE(
  "REG=", [RegistrationID],
  "|NAME=", [PrimaryName],
  "|MOBILE=", [PrimaryMobile],
  "|TOTAL=", TEXT([TotalMembers]),
  "|SNO=", SUBSTITUTE(TEXT(SELECT(FamilyMembers[SerialNo], [RegistrationID] = [_THISROW].[RegistrationID])), ",", ";"),
  "|NAMES=", SUBSTITUTE(TEXT(SELECT(FamilyMembers[MemberName], [RegistrationID] = [_THISROW].[RegistrationID])), ",", ";")
)
```

### `Registrations[Status]`

```
IFS(
  COUNT(SELECT(FamilyMembers[MemberID], AND([RegistrationID]=[_THISROW].[RegistrationID], [CheckInStatus]="Arrived")))
    = COUNT(SELECT(FamilyMembers[MemberID], [RegistrationID]=[_THISROW].[RegistrationID])),
  "Checked-In Complete",
  COUNT(SELECT(FamilyMembers[MemberID], AND([RegistrationID]=[_THISROW].[RegistrationID], [CheckInStatus]="Arrived"))) > 0,
  "Checked-In Partial",
  TRUE,
  "Registered"
)
```

### `Registrations[SubmissionDateTime]` (Initial value, not formula)

```
NOW()
```

---

## 3) Show / Valid snippets

### `Registrations[DonationAmountIntent]` — Show_If

```
[WantsDonation] = TRUE
```

### `Registrations[PrimaryMobile]` — Valid_If (10-digit India-style)

```
REGEXMATCH([_THIS], "^[0-9]{10}$")
```

### `AdminPortalAttempts[TypedPIN]` — Valid_If

```
[TypedPIN] = LOOKUP("CFG-1","AdminConfig","ConfigID","AdminPortalPassword")
```

Custom error text:

```
Wrong PIN. This is the admin portal. For registration tap Home → Register for event.
```

---

## 4) Donations table UX

**`Donations[WillDonate]`** initial value (if row created from registration bot):

```
TRUE
```

**Show_If** for `AmountPaid`, `PaymentReferenceNo`, `PaymentScreenshot`:

```
[WillDonate] = TRUE
```

**Required_If** for `PaymentReferenceNo`, `PaymentScreenshot`:

```
[WillDonate] = TRUE
```

### Virtual column `Donations[DonationQRDisplay]` (type Image, App formula)

```
LOOKUP("CFG-1","AdminConfig","ConfigID","DonationQRImage")
```

**Show_If**:

```
[WillDonate] = TRUE
```

---

## 5) Thank-you (Detail) view content

After save, user should land on or easily open **`Thank you`** detail for their `Registrations` row.

Show only:

- Warm confirmation text (use **Show** columns or rich text in view)
- `InviteCardURL` as file download (when automation fills it)
- `IDCardURL` as file download

Hide all other technical columns in that view’s field list.

---

## 6) Admin check-in actions (pattern)

On `FamilyMembers` row actions:

- **Mark arrived** → Set `CheckInStatus` = `Arrived`
- **Mark not arrived** → Set `CheckInStatus` = `Not Arrived`

Optional guard using event-day code:

```
[AdminCodeEntered] = LOOKUP("CFG-1","AdminConfig","ConfigID","AdminVerificationCode")
```

Use `CheckIn` table if you want an audit trail per approval.

---

## 7) Automation (outline)

**Bot A — On add `Registrations`**

1. If `[WantsDonation]=TRUE`, add `Donations` row with `RegistrationID` and `WillDonate=TRUE`.
2. Generate PDFs from templates into `IDCardURL` and `InviteCardURL` (when template engine configured).
3. Optionally send email / notification to organiser.

**Bot B — On update `FamilyMembers` when `CheckInStatus` changes**

- No-op if `Registrations[Status]` is already App formula (auto-updates).

---

## 8) Participant vs organiser column visibility checklist

**Never on `User Registration` form**

- `RegistrationID`, `SubmissionDateTime`, `TotalMembers`, `InviteCardURL`, `IDCardURL`, `QRCodePayload`, `Status`

**Never on inline family form for attendees**

- `MemberID`, `CheckInStatus`, `SerialNo` (optional hide if formula still runs — test once)

**Never on `Home` card list**

- `AdminPortalPassword`, `AdminVerificationCode`

---

## 9) Map view prevention

- `Address` = Long Text  
- No Map view as first / menu item  
- Brand start = `Home`
