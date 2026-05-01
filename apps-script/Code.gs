/**
 * JMS Event backend (Google Apps Script)
 *
 * This is a simple JSON API for a static frontend hosted on GitHub Pages.
 *
 * Endpoints (GET):
 * - ?action=ping
 * - ?action=getRegistration&registrationId=REG-...
 * - ?action=getRegistrationByQr&qr=...
 * - ?action=listRegistrations&adminPin=....
 *
 * Endpoints (POST JSON):
 * - { action: "register", payload: { ... } }
 * - { action: "uploadPaymentSnapshot", payload: { registrationId, donation: {...}, imageBase64, imageMimeType } }
 * - { action: "setMemberAttendance", payload: { adminPin, registrationId, memberId, status } }
 * - { action: "walkInRegister", payload: { adminPin, ...same as register... } }
 *
 * Configure via Script Properties:
 * - JMS_SHEET_ID
 * - JMS_DRIVE_FOLDER_ID
 * - JMS_ADMIN_PIN
 */

const PROP_SHEET_ID = 'JMS_SHEET_ID'
const PROP_DRIVE_FOLDER_ID = 'JMS_DRIVE_FOLDER_ID'
const PROP_ADMIN_PIN = 'JMS_ADMIN_PIN'

const SHEETS = {
  registrations: 'Registrations',
  family: 'FamilyMembers',
  donations: 'Donations',
  attendance: 'Attendance',
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || ''
    if (action === 'ping') return json_({ ok: true, now: new Date().toISOString() })

    if (action === 'getRegistration') {
      const registrationId = requireParam_(e, 'registrationId')
      return json_(getRegistration_(registrationId))
    }

    if (action === 'getRegistrationByQr') {
      const qr = requireParam_(e, 'qr')
      const registrationId = parseQr_(qr).registrationId
      return json_(getRegistration_(registrationId))
    }

    if (action === 'listRegistrations') {
      const adminPin = requireParam_(e, 'adminPin')
      assertAdmin_(adminPin)
      return json_(listRegistrations_())
    }
    if (action === 'adminDashboard') {
      const adminPin = requireParam_(e, 'adminPin')
      assertAdmin_(adminPin)
      return json_(adminDashboard_())
    }

    return json_({ ok: false, error: 'Unknown action' }, 400)
  } catch (err) {
    return json_(toError_(err), 500)
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}
    const action = body.action
    const payload = body.payload || {}

    if (action === 'register') return json_(register_(payload, { isWalkIn: false }))
    if (action === 'walkInRegister') {
      assertAdmin_(payload.adminPin)
      return json_(register_(payload, { isWalkIn: true }))
    }
    if (action === 'uploadPaymentSnapshot') return json_(uploadPaymentSnapshot_(payload))
    if (action === 'setMemberAttendance') return json_(setMemberAttendance_(payload))
    if (action === 'recordScanByQr') return json_(recordScanByQr_(payload))

    return json_({ ok: false, error: 'Unknown action' }, 400)
  } catch (err) {
    return json_(toError_(err), 500)
  }
}

// ---------------------------
// Core operations
// ---------------------------

function register_(payload, opts) {
  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)

  const registrationId = payload.registrationId || nextRegistrationId_(sheet.getSheetByName(SHEETS.registrations))
  const now = new Date().toISOString()

  const reg = {
    registrationId,
    createdAt: now,
    source: opts.isWalkIn ? 'walk-in' : 'self',
    primaryName: String(payload.primaryName || '').trim(),
    primaryMobile: String(payload.primaryMobile || '').trim(),
    primaryEmail: String(payload.primaryEmail || '').trim(),
    address: String(payload.address || '').trim(),
    city: String(payload.city || '').trim(),
    profession: String(payload.profession || '').trim(),
    designation: String(payload.designation || '').trim(),
    wantsDonation: !!payload.wantsDonation,
    donationAmountIntent: payload.donationAmountIntent ? Number(payload.donationAmountIntent) : '',
    status: 'Registered',
    qrPayload: makeQr_(registrationId),
  }

  if (!reg.primaryName || !reg.primaryMobile) {
    return { ok: false, error: 'Name and mobile are required.' }
  }

  const familyMembers = Array.isArray(payload.familyMembers) ? payload.familyMembers : []
  const normalizedMembers = familyMembers
    .filter((m) => m && String(m.memberName || '').trim())
    .map((m, idx) => ({
      memberId: m.memberId || `MEM-${Utilities.getUuid()}`,
      registrationId,
      serialNo: idx + 1,
      memberName: String(m.memberName || '').trim(),
      relation: String(m.relation || '').trim(),
      age: m.age === '' || m.age === null || typeof m.age === 'undefined' ? '' : Number(m.age),
      gender: String(m.gender || '').trim(),
      mobile: String(m.mobile || '').trim(),
      profession: String(m.profession || '').trim(),
      designation: String(m.designation || '').trim(),
      checkInStatus: 'Pending',
    }))

  appendRow_(sheet.getSheetByName(SHEETS.registrations), registrationRow_(reg))
  normalizedMembers.forEach((m) => appendRow_(sheet.getSheetByName(SHEETS.family), memberRow_(m)))

  return {
    ok: true,
    registrationId,
    qrPayload: reg.qrPayload,
  }
}

function uploadPaymentSnapshot_(payload) {
  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)

  const registrationId = String(payload.registrationId || '').trim()
  if (!registrationId) return { ok: false, error: 'registrationId required' }

  const donation = payload.donation || {}
  const paymentReferenceNo = String(donation.paymentReferenceNo || '').trim()
  const amountPaid = donation.amountPaid === '' || donation.amountPaid == null ? '' : Number(donation.amountPaid)

  const imageBase64 = String(payload.imageBase64 || '')
  const imageMimeType = String(payload.imageMimeType || 'image/jpeg')
  if (!imageBase64) return { ok: false, error: 'imageBase64 required' }

  const folderId = getProp_(PROP_DRIVE_FOLDER_ID)
  if (!folderId) return { ok: false, error: 'Server not configured: missing Drive folder ID' }

  const bytes = Utilities.base64Decode(imageBase64)
  const blob = Utilities.newBlob(bytes, imageMimeType, `${registrationId}-payment.${mimeExt_(imageMimeType)}`)
  const file = DriveApp.getFolderById(folderId).createFile(blob)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

  const donationId = `DON-${Utilities.getUuid()}`
  const now = new Date().toISOString()

  appendRow_(sheet.getSheetByName(SHEETS.donations), [
    donationId,
    registrationId,
    now,
    amountPaid,
    paymentReferenceNo,
    file.getId(),
    file.getUrl(),
  ])

  return { ok: true, donationId, fileUrl: file.getUrl() }
}

function getRegistration_(registrationId) {
  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)

  const regSheet = sheet.getSheetByName(SHEETS.registrations)
  const famSheet = sheet.getSheetByName(SHEETS.family)
  const donSheet = sheet.getSheetByName(SHEETS.donations)

  const reg = findById_(regSheet, 1, registrationId)
  if (!reg) return { ok: false, error: 'Not found' }

  const family = filterByValue_(famSheet, 2, registrationId).map((r) => ({
    memberId: r[0],
    registrationId: r[1],
    serialNo: r[2],
    memberName: r[3],
    relation: r[4],
    age: r[5],
    gender: r[6],
    mobile: r[7],
    profession: r[8],
    designation: r[9],
    checkInStatus: r[10],
  }))

  const donations = filterByValue_(donSheet, 2, registrationId).map((r) => ({
    donationId: r[0],
    registrationId: r[1],
    paymentTime: r[2],
    amountPaid: r[3],
    paymentReferenceNo: r[4],
    paymentSnapshotFileId: r[5],
    paymentSnapshotUrl: r[6],
  }))

  return {
    ok: true,
    registration: {
      registrationId: reg[0],
      createdAt: reg[1],
      source: reg[2],
      primaryName: reg[3],
      primaryMobile: reg[4],
      primaryEmail: reg[5],
      address: reg[6],
      city: reg[7],
      profession: reg[8],
      designation: reg[9],
      wantsDonation: reg[10] === true || reg[10] === 'TRUE' || reg[10] === 'true',
      donationAmountIntent: reg[11],
      status: reg[12],
      qrPayload: reg[13],
    },
    family,
    donations,
  }
}

function listRegistrations_() {
  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)
  const regSheet = sheet.getSheetByName(SHEETS.registrations)
  const values = regSheet.getDataRange().getValues()
  const rows = values.slice(1)
  return {
    ok: true,
    registrations: rows.map((r) => ({
      registrationId: r[0],
      createdAt: r[1],
      source: r[2],
      primaryName: r[3],
      primaryMobile: r[4],
      wantsDonation: r[10],
      status: r[12],
    })),
  }
}

function adminDashboard_() {
  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)

  const regSheet = sheet.getSheetByName(SHEETS.registrations)
  const famSheet = sheet.getSheetByName(SHEETS.family)
  const donSheet = sheet.getSheetByName(SHEETS.donations)

  const regRows = regSheet.getDataRange().getValues().slice(1)
  const famRows = famSheet.getDataRange().getValues().slice(1)
  const donRows = donSheet.getDataRange().getValues().slice(1)

  const familyByReg = {}
  famRows.forEach((r) => {
    const registrationId = String(r[1] || '')
    if (!familyByReg[registrationId]) familyByReg[registrationId] = []
    familyByReg[registrationId].push({
      memberId: r[0],
      registrationId: r[1],
      serialNo: r[2],
      memberName: r[3],
      relation: r[4],
      age: r[5],
      gender: r[6],
      mobile: r[7],
      profession: r[8],
      designation: r[9],
      checkInStatus: r[10],
    })
  })

  const donationsByReg = {}
  donRows.forEach((r) => {
    const registrationId = String(r[1] || '')
    if (!donationsByReg[registrationId]) donationsByReg[registrationId] = []
    donationsByReg[registrationId].push({
      donationId: r[0],
      registrationId: r[1],
      paymentTime: r[2],
      amountPaid: r[3],
      paymentReferenceNo: r[4],
      paymentSnapshotFileId: r[5],
      paymentSnapshotUrl: r[6],
    })
  })

  const registrations = regRows.map((r) => {
    const registrationId = String(r[0] || '')
    const family = familyByReg[registrationId] || []
    const donations = donationsByReg[registrationId] || []
    const arrived = family.filter((m) => String(m.checkInStatus) === 'Arrived').length
    const totalFamily = family.length

    return {
      registration: {
        registrationId: r[0],
        createdAt: r[1],
        source: r[2],
        primaryName: r[3],
        primaryMobile: r[4],
        primaryEmail: r[5],
        address: r[6],
        city: r[7],
        profession: r[8],
        designation: r[9],
        wantsDonation: r[10],
        donationAmountIntent: r[11],
        status: r[12],
        qrPayload: r[13],
      },
      family,
      donations,
      summary: {
        totalFamilyMembers: totalFamily,
        arrivedFamilyMembers: arrived,
        hasPaymentProof: donations.some((d) => !!String(d.paymentSnapshotUrl || '').trim()),
      },
    }
  })

  return { ok: true, registrations }
}

function setMemberAttendance_(payload) {
  const adminPin = String(payload.adminPin || '')
  assertAdmin_(adminPin)

  const registrationId = String(payload.registrationId || '').trim()
  const memberId = String(payload.memberId || '').trim()
  const status = String(payload.status || '').trim() // Arrived / Not Arrived
  if (!registrationId || !memberId) return { ok: false, error: 'registrationId and memberId required' }
  if (status !== 'Arrived' && status !== 'Not Arrived') return { ok: false, error: 'Invalid status' }

  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)
  const famSheet = sheet.getSheetByName(SHEETS.family)

  const rowIndex = findRowIndex_(famSheet, 1, memberId)
  if (rowIndex < 0) return { ok: false, error: 'Member not found' }

  // column 11 (1-based) = CheckInStatus
  famSheet.getRange(rowIndex + 1, 11).setValue(status)

  const attSheet = sheet.getSheetByName(SHEETS.attendance)
  appendRow_(attSheet, [`ATT-${Utilities.getUuid()}`, new Date().toISOString(), registrationId, memberId, status])

  return { ok: true }
}

function recordScanByQr_(payload) {
  const adminPin = String(payload.adminPin || '')
  assertAdmin_(adminPin)

  const qr = String(payload.qr || '')
  const parsed = parseQr_(qr)
  const registrationId = parsed.registrationId

  const sheet = getSpreadsheet_()
  ensureSchema_(sheet)

  const attSheet = sheet.getSheetByName(SHEETS.attendance)
  appendRow_(attSheet, [
    `ATT-${Utilities.getUuid()}`,
    new Date().toISOString(),
    registrationId,
    '',
    'Scanned',
  ])

  return { ok: true, registrationId }
}

// ---------------------------
// Helpers
// ---------------------------

function getSpreadsheet_() {
  const sheetId = getProp_(PROP_SHEET_ID)
  if (!sheetId) throw new Error('Server not configured: missing JMS_SHEET_ID')
  return SpreadsheetApp.openById(sheetId)
}

function ensureSchema_(ss) {
  Object.values(SHEETS).forEach((name) => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name)
  })

  ensureHeader_(ss.getSheetByName(SHEETS.registrations), [
    'RegistrationID',
    'CreatedAt',
    'Source',
    'PrimaryName',
    'PrimaryMobile',
    'PrimaryEmail',
    'Address',
    'City',
    'Profession',
    'Designation',
    'WantsDonation',
    'DonationAmountIntent',
    'Status',
    'QRCodePayload',
  ])

  ensureHeader_(ss.getSheetByName(SHEETS.family), [
    'MemberID',
    'RegistrationID',
    'SerialNo',
    'MemberName',
    'Relation',
    'Age',
    'Gender',
    'Mobile',
    'Profession',
    'Designation',
    'CheckInStatus',
  ])

  ensureHeader_(ss.getSheetByName(SHEETS.donations), [
    'DonationID',
    'RegistrationID',
    'PaymentTime',
    'AmountPaid',
    'PaymentReferenceNo',
    'PaymentSnapshotFileId',
    'PaymentSnapshotUrl',
  ])

  ensureHeader_(ss.getSheetByName(SHEETS.attendance), [
    'AttendanceID',
    'Time',
    'RegistrationID',
    'MemberID',
    'Status',
  ])
}

function ensureHeader_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
  const hasAny = firstRow.some((v) => String(v || '').trim())
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
  }
}

function registrationRow_(r) {
  return [
    r.registrationId,
    r.createdAt,
    r.source,
    r.primaryName,
    r.primaryMobile,
    r.primaryEmail,
    r.address,
    r.city,
    r.profession,
    r.designation,
    r.wantsDonation,
    r.donationAmountIntent,
    r.status,
    r.qrPayload,
  ]
}

function memberRow_(m) {
  return [
    m.memberId,
    m.registrationId,
    m.serialNo,
    m.memberName,
    m.relation,
    m.age,
    m.gender,
    m.mobile,
    m.profession,
    m.designation,
    m.checkInStatus,
  ]
}

function appendRow_(sheet, row) {
  sheet.appendRow(row)
}

function nextRegistrationId_(regSheet) {
  const values = regSheet.getDataRange().getValues()
  let max = 0
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || '')
    const m = id.match(/^JMS-(\d{6})$/)
    if (m) {
      const n = Number(m[1])
      if (n > max) max = n
    }
  }
  const next = max + 1
  return `JMS-${Utilities.formatString('%06d', next)}`
}

function findById_(sheet, oneBasedCol, id) {
  const values = sheet.getDataRange().getValues()
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][oneBasedCol - 1]) === String(id)) return values[i]
  }
  return null
}

function findRowIndex_(sheet, oneBasedCol, id) {
  const values = sheet.getDataRange().getValues()
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][oneBasedCol - 1]) === String(id)) return i
  }
  return -1
}

function filterByValue_(sheet, oneBasedCol, value) {
  const values = sheet.getDataRange().getValues()
  const out = []
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][oneBasedCol - 1]) === String(value)) out.push(values[i])
  }
  return out
}

function assertAdmin_(adminPin) {
  const expected = getProp_(PROP_ADMIN_PIN)
  if (!expected) throw new Error('Server not configured: missing JMS_ADMIN_PIN')
  if (String(adminPin) !== String(expected)) {
    const err = new Error('Unauthorized')
    err.name = 'Unauthorized'
    throw err
  }
}

function requireParam_(e, name) {
  const val = e && e.parameter ? e.parameter[name] : ''
  if (!val) throw new Error(`Missing parameter: ${name}`)
  return val
}

function getProp_(name) {
  return PropertiesService.getScriptProperties().getProperty(name)
}

function makeQr_(registrationId) {
  // Keep it short for robust scanning. More details are fetched server-side.
  return `JMS|REG=${registrationId}`
}

function parseQr_(qr) {
  const s = String(qr || '')
  const m = s.match(/REG=([^|]+)/)
  if (!m) throw new Error('Invalid QR')
  return { registrationId: m[1] }
}

function mimeExt_(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function json_(obj, code) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
  return output
}
function toError_(err) {
  return {
    ok: false,
    error: String((err && err.message) || err),
  }
}

