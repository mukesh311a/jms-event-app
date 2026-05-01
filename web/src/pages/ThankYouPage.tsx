import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'

import { env } from '../lib/env'
import { getRegistration, uploadPaymentSnapshot } from '../lib/api'
import type { DonationInput, FamilyMemberRecord, RegistrationRecord } from '../lib/types'
import { downloadIdCardPdf, downloadInvitationPdf } from '../lib/pdf'
import { Button, Card, CardBody, Container, Divider, H1, H2, Input, Label } from '../components/ui'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; registration: RegistrationRecord; family: FamilyMemberRecord[]; qrDataUrl: string; wantsDonation: boolean }

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => {
      const res = String(reader.result || '')
      const match = res.match(/^data:([^;]+);base64,(.*)$/)
      if (!match) return reject(new Error('Invalid file encoding'))
      resolve({ mime: match[1], base64: match[2] })
    }
    reader.readAsDataURL(file)
  })
}

export function ThankYouPage() {
  const { registrationId = '' } = useParams()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [donationRef, setDonationRef] = useState('')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [snapshot, setSnapshot] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string>('')

  const familyNames = useMemo(() => {
    if (state.kind !== 'ready') return []
    return state.family.map((m) => m.memberName).filter(Boolean)
  }, [state])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await getRegistration(registrationId)
        if (!res.ok) throw new Error(res.error)
        const qrDataUrl = await QRCode.toDataURL(res.registration.qrPayload, { margin: 1, width: 256 })
        if (cancelled) return
        setState({
          kind: 'ready',
          registration: res.registration,
          family: res.family,
          qrDataUrl,
          wantsDonation: !!res.registration.wantsDonation,
        })
      } catch (e) {
        if (cancelled) return
        setState({ kind: 'error', message: String((e as Error)?.message || e) })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [registrationId])

  async function submitDonation() {
    if (state.kind !== 'ready') return
    setUploadMsg('')
    if (!snapshot) {
      setUploadMsg('Please upload the payment screenshot.')
      return
    }
    setUploading(true)
    try {
      const { base64, mime } = await fileToBase64(snapshot)
      const donation: DonationInput = {
        paymentReferenceNo: donationRef.trim(),
        amountPaid: amountPaid ? Number(amountPaid) : '',
      }
      const res = await uploadPaymentSnapshot({
        registrationId: state.registration.registrationId,
        donation,
        imageBase64: base64,
        imageMimeType: mime,
      })
      if (!res.ok) throw new Error(res.error)
      setUploadMsg('Payment details uploaded successfully. Thank you for your contribution.')
      setSnapshot(null)
      setDonationRef('')
      setAmountPaid('')
    } catch (e) {
      setUploadMsg(String((e as Error)?.message || e))
    } finally {
      setUploading(false)
    }
  }

  if (state.kind === 'loading') {
    return (
      <Container className="py-10">
        <div className="text-sm text-slate-600">Loading your registration…</div>
      </Container>
    )
  }

  if (state.kind === 'error') {
    return (
      <Container className="py-10">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-6">
        <H1>Thank you, {state.registration.primaryName}.</H1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Your registration for <span className="font-semibold">{env.eventName}</span> is received. We are excited to
          welcome you at <span className="font-semibold">{env.eventVenue}</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <H2>Your QR for verification</H2>
            <p className="mt-1 text-sm text-slate-600">
              This QR will be used by organisers at the event gate to quickly verify your details and mark attendance.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <img src={state.qrDataUrl} alt="Registration QR code" className="h-36 w-36 rounded-xl border border-slate-200 bg-white p-2" />
              <div className="text-sm text-slate-700">
                <div className="font-semibold">Registration ID</div>
                <div className="mt-1 font-mono text-xs break-all">{state.registration.registrationId}</div>
                <div className="mt-3 font-semibold">Family members</div>
                <div className="mt-1 text-xs text-slate-600">
                  {familyNames.length ? familyNames.join(', ') : '—'}
                </div>
              </div>
            </div>

            <Divider className="my-5" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() =>
                  downloadIdCardPdf({
                    registration: state.registration,
                    family: state.family,
                    qrDataUrl: state.qrDataUrl,
                  })
                }
              >
                Download ID card (PDF)
              </Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() =>
                  downloadInvitationPdf({
                    registration: state.registration,
                    family: state.family,
                  })
                }
              >
                Download invitation (PDF)
              </Button>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
              <div className="font-semibold">Important</div>
              <div className="mt-1">
                It is compulsory to bring this ID card along with one ID proof on the day of event.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <H2>Donation (only if you selected “Yes”)</H2>
            {state.wantsDonation ? (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Scan the organiser QR code to pay, then upload the payment screenshot and reference number.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Organiser QR Code will be configured by admin. (Next: we’ll add a real QR image here from backend.)
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="amountPaid">Amount paid (₹)</Label>
                    <Input id="amountPaid" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} type="number" placeholder="Amount paid" />
                  </div>
                  <div>
                    <Label htmlFor="donationRef">Payment reference no.</Label>
                    <Input id="donationRef" value={donationRef} onChange={(e) => setDonationRef(e.target.value)} placeholder="UPI / bank reference number" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="snapshot">Upload payment screenshot</Label>
                    <input
                      id="snapshot"
                      type="file"
                      accept="image/*"
                      className="mt-2 block w-full text-sm"
                      onChange={(e) => setSnapshot(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                {uploadMsg ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    {uploadMsg}
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={submitDonation} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Submit payment details'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                You selected <span className="font-semibold">No donation</span>. Nothing more is required.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <H2>Invitation message preview</H2>
          <p className="mt-2 text-sm text-slate-700">
            Dear {state.registration.primaryName}
            {familyNames.length ? ` and family (${familyNames.join(', ')})` : ''},<br />
            You are cordially invited to the {env.eventName} to be held in {env.eventMonth} at {env.eventVenue}.<br />
            With warm regards,<br />
            <span className="font-semibold">{env.inviterName}</span>
          </p>
        </CardBody>
      </Card>
    </Container>
  )
}

