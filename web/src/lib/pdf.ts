import jsPDF from 'jspdf'
import type { FamilyMemberRecord, RegistrationRecord } from './types'
import { env } from './env'

function safeFileName(s: string) {
  return s.replace(/[^a-z0-9\-_]+/gi, '_').replace(/^_+|_+$/g, '')
}

export async function downloadIdCardPdf(args: {
  registration: RegistrationRecord
  family: FamilyMemberRecord[]
  qrDataUrl: string
}) {
  const { registration, family, qrDataUrl } = args
  const uniqueId = registration.registrationId

  // ID card: 86mm x 54mm (credit card)
  const doc = new jsPDF({ unit: 'mm', format: [86, 54] })

  // Background
  doc.setFillColor(26, 35, 126)
  doc.rect(0, 0, 86, 54, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(2, 2, 82, 50, 2, 2, 'F')
  doc.setFillColor(26, 35, 126)
  doc.rect(2, 2, 82, 10, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 12, 86, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('JMS FAMILY GET TOGETHER', 4, 7.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(env.eventMonth, 4, 10)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(registration.primaryName, 4, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Mobile: ${registration.primaryMobile}`, 4, 22.5)
  doc.text(`Unique ID: ${uniqueId}`, 4, 26.5)
  doc.text(`Venue: ${env.eventVenue}`, 4, 30.5, { maxWidth: 50 })
  doc.text(`Month: ${env.eventMonth}`, 4, 34.5)

  // Family list
  const names = family.map((m) => m.memberName).filter(Boolean)
  doc.setFontSize(7)
  doc.text(`Family (${names.length}):`, 4, 38.5)
  doc.setFontSize(6.4)
  doc.text(names.length ? names.join(', ') : '—', 4, 42.0, { maxWidth: 50 })

  // QR
  doc.addImage(qrDataUrl, 'PNG', 61.5, 15.5, 20.5, 20.5)
  doc.setFontSize(5.8)
  doc.setTextColor(71, 85, 105)
  doc.text('Scan for admin verification', 57.5, 38)

  // Footer note
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(5.2)
  doc.text('Compulsory: Bring this ID card + one ID proof on event day.', 4, 51)

  doc.save(`${safeFileName(registration.primaryName)}_ID_${safeFileName(registration.registrationId)}.pdf`)
}

export async function downloadInvitationPdf(args: {
  registration: RegistrationRecord
  family: FamilyMemberRecord[]
}) {
  const { registration, family } = args
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const familyNames = family.map((m) => m.memberName).filter(Boolean)
  const familyLine = familyNames.length ? ` and family (${familyNames.join(', ')})` : ''

  doc.setFillColor(26, 35, 126)
  doc.rect(0, 0, 210, 36, 'F')
  doc.setFillColor(201, 162, 39)
  doc.rect(0, 36, 210, 2.8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.text('Grand Invitation', 18, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${env.eventName} • ${env.eventMonth}`, 18, 27)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)

  const lines = [
    `Dear ${registration.primaryName}${familyLine},`,
    '',
    `With immense pleasure, the JMS Family cordially invites you to the Get Together celebration to be held in ${env.eventMonth} at ${env.eventVenue}.`,
    '',
    'Your gracious presence with your family will make this occasion truly meaningful, warm, and memorable for everyone.',
    '',
    'With warm regards,',
    env.inviterName,
    '',
    'Note: It is compulsory to bring this ID card along with one ID proof on the day of the event.',
  ]

  let y = 48
  const left = 18
  lines.forEach((line) => {
    if (!line) {
      y += 6
      return
    }
    const split = doc.splitTextToSize(line, 174)
    doc.text(split, left, y)
    y += split.length * 6
  })

  // Decorative footer
  doc.setDrawColor(201, 162, 39)
  doc.setLineWidth(1)
  doc.line(18, 266, 192, 266)
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`Unique ID: ${registration.registrationId}`, 18, 276)

  doc.save(`${safeFileName(registration.primaryName)}_Invitation_${safeFileName(registration.registrationId)}.pdf`)
}

