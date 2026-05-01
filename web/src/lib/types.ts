export type FamilyMemberInput = {
  memberId?: string
  memberName: string
  relation?: string
  age?: number | ''
  gender?: string
  mobile?: string
  profession?: string
  designation?: string
}

export type RegistrationInput = {
  registrationId?: string
  primaryName: string
  primaryMobile: string
  primaryEmail?: string
  address?: string
  city?: string
  profession?: string
  designation?: string
  wantsDonation: boolean
  donationAmountIntent?: number | ''
  familyMembers: FamilyMemberInput[]
}

export type DonationInput = {
  amountPaid?: number | ''
  paymentReferenceNo?: string
}

export type ApiOk<T> = T & { ok: true }
export type ApiErr = { ok: false; error: string }
export type ApiResult<T> = ApiOk<T> | ApiErr

export type RegistrationRecord = {
  registrationId: string
  createdAt: string
  source: 'self' | 'walk-in'
  primaryName: string
  primaryMobile: string
  primaryEmail: string
  address: string
  city: string
  profession: string
  designation: string
  wantsDonation: boolean
  donationAmountIntent: number | ''
  status: string
  qrPayload: string
}

export type FamilyMemberRecord = {
  memberId: string
  registrationId: string
  serialNo: number
  memberName: string
  relation: string
  age: number | ''
  gender: string
  mobile: string
  profession: string
  designation: string
  checkInStatus: 'Pending' | 'Arrived' | 'Not Arrived' | string
}

export type DonationRecord = {
  donationId: string
  registrationId: string
  paymentTime: string
  amountPaid: number | ''
  paymentReferenceNo: string
  paymentSnapshotUrl: string
}

