import type {
  ApiResult,
  DonationInput,
  RegistrationInput,
  DonationRecord,
  FamilyMemberRecord,
  RegistrationRecord,
} from './types'

const DEFAULT_API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbxtLRYEm9pFnAmHF68E_3E8AYloCTxkoIfa8qxUuO5bLXBS_2-9WMgCw6pILKqA7rXYzA/exec'
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_API_BASE_URL

function assertConfigured() {
  if (!API_BASE_URL) {
    throw new Error('API not configured. Set VITE_API_BASE_URL in web/.env')
  }
}

async function postJson<T>(body: unknown): Promise<ApiResult<T>> {
  assertConfigured()
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    // Use text/plain to keep request "simple" and avoid CORS preflight
    // against Google Apps Script web apps.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as ApiResult<T>
  } catch {
    return { ok: false, error: `Invalid server response: ${text.slice(0, 140)}` }
  }
}

async function getJson<T>(params: Record<string, string>): Promise<ApiResult<T>> {
  assertConfigured()
  const url = new URL(API_BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const text = await res.text()
  try {
    return JSON.parse(text) as ApiResult<T>
  } catch {
    return { ok: false, error: `Invalid server response: ${text.slice(0, 140)}` }
  }
}

export async function register(payload: RegistrationInput) {
  return postJson<{ registrationId: string; qrPayload: string }>({ action: 'register', payload })
}

export async function walkInRegister(adminPin: string, payload: RegistrationInput) {
  return postJson<{ registrationId: string; qrPayload: string }>({
    action: 'walkInRegister',
    payload: { adminPin, ...payload },
  })
}

export async function uploadPaymentSnapshot(args: {
  registrationId: string
  donation: DonationInput
  imageBase64: string
  imageMimeType: string
}) {
  return postJson<{ donationId: string; fileUrl: string }>({
    action: 'uploadPaymentSnapshot',
    payload: args,
  })
}

export async function getRegistration(registrationId: string) {
  return getJson<{
    registration: RegistrationRecord
    family: FamilyMemberRecord[]
    donations: DonationRecord[]
  }>({ action: 'getRegistration', registrationId })
}

export async function getRegistrationByQr(qr: string) {
  return getJson<{
    registration: RegistrationRecord
    family: FamilyMemberRecord[]
    donations: DonationRecord[]
  }>({ action: 'getRegistrationByQr', qr })
}

export async function setMemberAttendance(args: {
  adminPin: string
  registrationId: string
  memberId: string
  status: 'Arrived' | 'Not Arrived'
}) {
  return postJson<{}>({ action: 'setMemberAttendance', payload: args })
}

export async function recordScanByQr(args: { adminPin: string; qr: string }) {
  return postJson<{ registrationId: string }>({ action: 'recordScanByQr', payload: args })
}

export async function listRegistrations(adminPin: string) {
  return getJson<{ registrations: Array<{ registrationId: string; createdAt: string; primaryName: string; primaryMobile: string; status: string; wantsDonation: unknown }> }>({
    action: 'listRegistrations',
    adminPin,
  })
}

export async function getAdminDashboard(adminPin: string) {
  return getJson<{
    registrations: Array<{
      registration: {
        registrationId: string
        createdAt: string
        source: string
        primaryName: string
        primaryMobile: string
        primaryEmail: string
        address: string
        city: string
        profession: string
        designation: string
        wantsDonation: unknown
        donationAmountIntent: number | ''
        status: string
        qrPayload: string
      }
      family: Array<{
        memberId: string
        serialNo: number
        memberName: string
        relation: string
        age: number | ''
        gender: string
        mobile: string
        profession: string
        designation: string
        checkInStatus: string
      }>
      donations: Array<{
        donationId: string
        paymentTime: string
        amountPaid: number | ''
        paymentReferenceNo: string
        paymentSnapshotUrl: string
      }>
      summary: {
        totalFamilyMembers: number
        arrivedFamilyMembers: number
        hasPaymentProof: boolean
      }
    }>
  }>({ action: 'adminDashboard', adminPin })
}

