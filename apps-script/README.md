# JMS Event Backend (Google Apps Script)

This folder contains the **Google Apps Script** backend for the JMS May-2026 Get Together registration system.

It provides:

- Registration create (primary + family members)
- Donation/payment details + **payment snapshot upload** (saved to Google Drive)
- Admin login (PIN)
- Fetch registration by **QR payload / Registration ID**
- Mark attendance **per family member** (Arrived / Not Arrived)
- Walk-in registration from admin

## How it stores data

- **Google Sheets**: all structured data (registrations, members, payments, attendance)
- **Google Drive**: uploaded payment snapshots

## Setup (high level)

1. Create a Google Sheet (new blank).
2. Open Apps Script (Extensions → Apps Script).
3. Copy files from this folder into Apps Script project.
4. Set Script Properties (Sheet ID, Drive folder ID, Admin PIN, etc).
5. Deploy as Web App.
6. Put the Web App URL into the frontend env var `VITE_API_BASE_URL`.

## Values for your project (provided)

- **Google Sheet ID**: `1OxW17oIif04WCVLyQPAeQ1hrNS8z0VtdtxnOVKuf6nE`
- **Google Drive folder ID** (payment snapshots): `1Oq29LqYCnhkBsTEC6uQy7c6iQtJZ2urx`
- **Admin PIN**: `1314`

### Script Properties to add

In Apps Script → **Project Settings** → **Script properties**, add:

- `JMS_SHEET_ID` = `1OxW17oIif04WCVLyQPAeQ1hrNS8z0VtdtxnOVKuf6nE`
- `JMS_DRIVE_FOLDER_ID` = `1Oq29LqYCnhkBsTEC6uQy7c6iQtJZ2urx`
- `JMS_ADMIN_PIN` = `1314`

