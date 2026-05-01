import { useEffect, useMemo, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

import { getAdminDashboard, getRegistrationByQr, recordScanByQr, setMemberAttendance } from '../lib/api'
import type { FamilyMemberRecord, RegistrationRecord } from '../lib/types'
import { Button, Card, CardBody, Container, Divider, H1, H2, Input, Label } from '../components/ui'

type ScanState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'loaded'; registration: RegistrationRecord; family: FamilyMemberRecord[] }
  | { kind: 'error'; message: string }

const ADMIN_PIN_KEY = 'jms_admin_pin'

type AdminDashboardItem = {
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
}

export function AdminPage() {
  const [adminPin, setAdminPin] = useState(() => sessionStorage.getItem(ADMIN_PIN_KEY) || '')
  const [pinInput, setPinInput] = useState(adminPin)
  const [pinError, setPinError] = useState('')

  const [scanState, setScanState] = useState<ScanState>({ kind: 'idle' })
  const [listState, setListState] = useState<{ loading: boolean; error: string; rows: AdminDashboardItem[] }>({
    loading: false,
    error: '',
    rows: [],
  })
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')

  const canUseAdmin = useMemo(() => adminPin.trim().length > 0, [adminPin])
  const selected = useMemo(
    () => listState.rows.find((r) => r.registration.registrationId === selectedRegistrationId) || null,
    [listState.rows, selectedRegistrationId],
  )

  useEffect(() => {
    if (!canUseAdmin) return
    let cancelled = false
    async function run() {
      setListState((s) => ({ ...s, loading: true, error: '' }))
      try {
        const res = await getAdminDashboard(adminPin)
        if (!res.ok) throw new Error(res.error)
        if (cancelled) return
        setListState({
          loading: false,
          error: '',
          rows: res.registrations,
        })
        if (res.registrations.length && !selectedRegistrationId) {
          setSelectedRegistrationId(res.registrations[0].registration.registrationId)
        }
      } catch (e) {
        if (cancelled) return
        setListState((s) => ({ ...s, loading: false, error: String((e as Error)?.message || e) }))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [adminPin, canUseAdmin])

  async function savePin() {
    const pin = pinInput.trim()
    if (!pin) {
      setPinError('Enter admin PIN')
      return
    }
    setPinError('')
    sessionStorage.setItem(ADMIN_PIN_KEY, pin)
    setAdminPin(pin)
  }

  async function startScan() {
    setScanState({ kind: 'scanning' })
    const elId = 'qr-reader'
    const qr = new Html5Qrcode(elId)
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          await qr.stop()
          await qr.clear()
          const marked = await recordScanByQr({ adminPin, qr: decodedText })
          if (!marked.ok) {
            setScanState({ kind: 'error', message: marked.error })
            return
          }
          const res = await getRegistrationByQr(decodedText)
          if (!res.ok) {
            setScanState({ kind: 'error', message: res.error })
            return
          }
          setScanState({ kind: 'loaded', registration: res.registration, family: res.family })
        },
        () => {},
      )
    } catch (e) {
      setScanState({ kind: 'error', message: String((e as Error)?.message || e) })
    }
  }

  async function mark(memberId: string, status: 'Arrived' | 'Not Arrived') {
    if (scanState.kind !== 'loaded') return
    const res = await setMemberAttendance({
      adminPin,
      registrationId: scanState.registration.registrationId,
      memberId,
      status,
    })
    if (!res.ok) {
      setScanState({ kind: 'error', message: res.error })
      return
    }
    setScanState({
      kind: 'loaded',
      registration: scanState.registration,
      family: scanState.family.map((m) => (m.memberId === memberId ? { ...m, checkInStatus: status } : m)),
    })
  }

  return (
    <Container className="py-8 sm:py-12">
      <H1>Admin dashboard</H1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Organisers only. Use PIN, then scan the ID card QR to verify details and mark attendance per family member.
      </p>

      <Card className="mt-6">
        <CardBody>
          <H2>Admin PIN</H2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs">
              <Label htmlFor="pin">PIN</Label>
              <Input id="pin" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter organiser PIN" />
            </div>
            <Button type="button" onClick={savePin}>
              Unlock admin
            </Button>
          </div>
          {pinError ? (
            <p className="mt-2 text-sm text-rose-600">{pinError}</p>
          ) : null}
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <H2>QR scan (verification)</H2>
            {!canUseAdmin ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Enter PIN to start scanning.
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <div id="qr-reader" className="overflow-hidden rounded-2xl border border-slate-200 bg-white" />
                </div>
                <div className="mt-4 flex gap-3">
                  <Button type="button" onClick={startScan} disabled={scanState.kind === 'scanning'}>
                    {scanState.kind === 'scanning' ? 'Scanning…' : 'Start scan'}
                  </Button>
                  <Button type="button" tone="ghost" onClick={() => setScanState({ kind: 'idle' })}>
                    Clear
                  </Button>
                </div>
              </>
            )}

            {scanState.kind === 'error' ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {scanState.message}
              </div>
            ) : null}

            {scanState.kind === 'loaded' ? (
              <>
                <Divider className="my-5" />
                <div className="text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{scanState.registration.primaryName}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Reg ID: <span className="font-mono">{scanState.registration.registrationId}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">Mobile: {scanState.registration.primaryMobile}</div>
                </div>

                <div className="mt-4 space-y-3">
                  {scanState.family.length ? (
                    scanState.family.map((m) => (
                      <div key={m.memberId} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              #{m.serialNo} {m.memberName}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {m.relation || '—'} • {m.profession || '—'} • {m.designation || '—'} • Status:{' '}
                              <span className="font-semibold">{m.checkInStatus || 'Pending'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" className="h-9 px-3" onClick={() => mark(m.memberId, 'Arrived')}>
                              Arrived
                            </Button>
                            <Button type="button" tone="ghost" className="h-9 px-3" onClick={() => mark(m.memberId, 'Not Arrived')}>
                              Not arrived
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      No family members in this registration.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <H2>Complete registrations dashboard</H2>
            {!canUseAdmin ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Enter PIN to view registrations.
              </div>
            ) : listState.loading ? (
              <div className="mt-4 text-sm text-slate-600">Loading…</div>
            ) : listState.error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {listState.error}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {listState.rows.map((r) => (
                    <button
                      key={r.registration.registrationId}
                      type="button"
                      onClick={() => setSelectedRegistrationId(r.registration.registrationId)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${
                        selectedRegistrationId === r.registration.registrationId
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{r.registration.primaryName}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {r.registration.primaryMobile} •{' '}
                        <span className="font-mono">{r.registration.registrationId}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Family: {r.summary.arrivedFamilyMembers}/{r.summary.totalFamilyMembers} arrived • Status:{' '}
                        {r.registration.status}
                      </div>
                    </button>
                  ))}
                </div>

                {selected ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Selected member details</div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-700">
                      <div><span className="font-semibold">Name:</span> {selected.registration.primaryName}</div>
                      <div><span className="font-semibold">Unique ID:</span> {selected.registration.registrationId}</div>
                      <div><span className="font-semibold">Mobile:</span> {selected.registration.primaryMobile}</div>
                      <div><span className="font-semibold">Email:</span> {selected.registration.primaryEmail || '—'}</div>
                      <div><span className="font-semibold">City:</span> {selected.registration.city || '—'}</div>
                      <div><span className="font-semibold">Address:</span> {selected.registration.address || '—'}</div>
                      <div><span className="font-semibold">Profession:</span> {selected.registration.profession || '—'}</div>
                      <div><span className="font-semibold">Designation:</span> {selected.registration.designation || '—'}</div>
                      <div><span className="font-semibold">Donation intent:</span> {selected.registration.wantsDonation ? 'Yes' : 'No'} {selected.registration.donationAmountIntent ? `(₹${selected.registration.donationAmountIntent})` : ''}</div>
                    </div>

                    <Divider className="my-3" />
                    <div className="text-sm font-semibold text-slate-900">Family members</div>
                    {selected.family.length ? (
                      <div className="mt-2 overflow-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-2 py-1">S.No</th>
                              <th className="px-2 py-1">Name</th>
                              <th className="px-2 py-1">Relation</th>
                              <th className="px-2 py-1">Mobile</th>
                              <th className="px-2 py-1">Profession</th>
                              <th className="px-2 py-1">Designation</th>
                              <th className="px-2 py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.family.map((m) => (
                              <tr key={m.memberId} className="border-t border-slate-100">
                                <td className="px-2 py-1">{m.serialNo}</td>
                                <td className="px-2 py-1">{m.memberName}</td>
                                <td className="px-2 py-1">{m.relation || '—'}</td>
                                <td className="px-2 py-1">{m.mobile || '—'}</td>
                                <td className="px-2 py-1">{m.profession || '—'}</td>
                                <td className="px-2 py-1">{m.designation || '—'}</td>
                                <td className="px-2 py-1">{m.checkInStatus || 'Pending'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-500">No family members.</div>
                    )}

                    <Divider className="my-3" />
                    <div className="text-sm font-semibold text-slate-900">Payment details / proof</div>
                    {selected.donations.length ? (
                      <div className="mt-2 space-y-2">
                        {selected.donations.map((d) => (
                          <div key={d.donationId} className="rounded-lg border border-slate-200 p-3 text-xs">
                            <div><span className="font-semibold">Amount:</span> {d.amountPaid ? `₹${d.amountPaid}` : '—'}</div>
                            <div><span className="font-semibold">Reference:</span> {d.paymentReferenceNo || '—'}</div>
                            <div><span className="font-semibold">Time:</span> {d.paymentTime || '—'}</div>
                            <div>
                              <span className="font-semibold">Proof link:</span>{' '}
                              {d.paymentSnapshotUrl ? (
                                <a
                                  href={d.paymentSnapshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-700 underline"
                                >
                                  Open snapshot
                                </a>
                              ) : (
                                '—'
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-500">No donation/payment record.</div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Container>
  )
}

