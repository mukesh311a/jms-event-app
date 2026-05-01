import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'

import { env } from '../lib/env'
import type { RegistrationInput } from '../lib/types'
import { register } from '../lib/api'
import { Button, Card, CardBody, Container, Divider, H1, H2, Input, Label, Textarea } from '../components/ui'

const schema = z.object({
  primaryName: z.string().min(2, 'Please enter your full name'),
  primaryMobile: z
    .string()
    .regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'),
  primaryEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  profession: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  wantsDonation: z.boolean(),
  donationAmountIntent: z.union([z.number().nonnegative(), z.literal('')]).optional(),
  familyMembers: z
    .array(
      z.object({
        memberName: z.string().optional().or(z.literal('')),
        relation: z.string().optional().or(z.literal('')),
        age: z.union([z.number().int().min(0).max(120), z.literal('')]).optional(),
        gender: z.string().optional().or(z.literal('')),
        mobile: z.string().optional().or(z.literal('')),
        profession: z.string().optional().or(z.literal('')),
        designation: z.string().optional().or(z.literal('')),
      }),
    )
    .default([]),
})

type FormValues = z.infer<typeof schema>

function toRegistrationInput(v: FormValues): RegistrationInput {
  return {
    primaryName: v.primaryName,
    primaryMobile: v.primaryMobile,
    primaryEmail: v.primaryEmail || '',
    address: v.address || '',
    city: v.city || '',
    profession: v.profession || '',
    designation: v.designation || '',
    wantsDonation: v.wantsDonation,
    donationAmountIntent: v.wantsDonation ? (v.donationAmountIntent ?? '') : '',
    familyMembers: (v.familyMembers || [])
      .filter((m) => (m.memberName || '').trim().length > 0)
      .map((m) => ({
        memberName: (m.memberName || '').trim(),
        relation: (m.relation || '').trim(),
        age: m.age ?? '',
        gender: (m.gender || '').trim(),
        mobile: (m.mobile || '').trim(),
        profession: (m.profession || '').trim(),
        designation: (m.designation || '').trim(),
      })),
  }
}

export function RegisterPage() {
  const nav = useNavigate()
  const [serverError, setServerError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const defaultValues: FormValues = useMemo(
    () => ({
      primaryName: '',
      primaryMobile: '',
      primaryEmail: '',
      address: '',
      city: '',
      profession: '',
      designation: '',
      wantsDonation: false,
      donationAmountIntent: '',
      familyMembers: [],
    }),
    [],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues,
    mode: 'onTouched',
  })

  const fam = useFieldArray({ control: form.control, name: 'familyMembers' })

  const wantsDonation = form.watch('wantsDonation')

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError('')
    setSubmitting(true)
    try {
      const payload = toRegistrationInput(values)
      const res = await register(payload)
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      nav(`/thank-you/${encodeURIComponent(res.registrationId)}`)
    } catch (e) {
      setServerError(String((e as Error)?.message || e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
            {env.eventMonth} • {env.eventVenue}
          </div>
          <H1 className="mt-3">{env.eventName} — Registration</H1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Please fill details smoothly. You can add your family members too. After submission you will get a beautiful
            invitation + ID card.
          </p>
        </div>
        <Button tone="ghost" onClick={() => nav('/admin')} type="button">
          Admin
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardBody>
            <H2>Primary member details</H2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="primaryName">Full name</Label>
                <Input id="primaryName" placeholder="Your full name" {...form.register('primaryName')} />
                {form.formState.errors.primaryName && (
                  <p className="mt-1 text-sm text-rose-600">{form.formState.errors.primaryName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="primaryMobile">Mobile number</Label>
                <Input id="primaryMobile" placeholder="10-digit mobile" inputMode="numeric" {...form.register('primaryMobile')} />
                {form.formState.errors.primaryMobile && (
                  <p className="mt-1 text-sm text-rose-600">{form.formState.errors.primaryMobile.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="primaryEmail">Email (optional)</Label>
                <Input id="primaryEmail" placeholder="name@example.com" {...form.register('primaryEmail')} />
                {form.formState.errors.primaryEmail && (
                  <p className="mt-1 text-sm text-rose-600">{form.formState.errors.primaryEmail.message as string}</p>
                )}
              </div>
              <div>
                <Label htmlFor="city">City (optional)</Label>
                <Input id="city" placeholder="City" {...form.register('city')} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Textarea id="address" placeholder="Address" {...form.register('address')} />
              </div>
              <div>
                <Label htmlFor="profession">Profession (optional)</Label>
                <Input id="profession" placeholder="Profession" {...form.register('profession')} />
              </div>
              <div>
                <Label htmlFor="designation">Current designation (optional)</Label>
                <Input id="designation" placeholder="Designation" {...form.register('designation')} />
              </div>
            </div>
          </CardBody>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.35 }}
        >
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <H2>Family members</H2>
                  <p className="mt-1 text-sm text-slate-600">Add only those who may come with you.</p>
                </div>
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() =>
                    fam.append({
                      memberName: '',
                      relation: '',
                      age: '',
                      gender: '',
                      mobile: '',
                      profession: '',
                      designation: '',
                    })
                  }
                >
                  + Add family member
                </Button>
              </div>

              <Divider className="my-4" />

              {fam.fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
                  Tip: You can add spouse/children/parents here. Their names will appear on the invitation card.
                </div>
              ) : (
                <div className="space-y-4">
                  {fam.fields.map((field, idx) => (
                    <div key={field.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Member #{idx + 1}</p>
                        <Button type="button" tone="danger" className="h-9 px-3" onClick={() => fam.remove(idx)}>
                          Remove
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`fm-name-${idx}`}>Name</Label>
                          <Input id={`fm-name-${idx}`} placeholder="Full name" {...form.register(`familyMembers.${idx}.memberName`)} />
                        </div>
                        <div>
                          <Label htmlFor={`fm-relation-${idx}`}>Relation</Label>
                          <Input id={`fm-relation-${idx}`} placeholder="Spouse / Son / Daughter / Parent" {...form.register(`familyMembers.${idx}.relation`)} />
                        </div>
                        <div>
                          <Label htmlFor={`fm-age-${idx}`}>Age (optional)</Label>
                          <Input
                            id={`fm-age-${idx}`}
                            type="number"
                            placeholder="Age"
                          {...form.register(`familyMembers.${idx}.age`, {
                            setValueAs: (v) => (v === '' ? '' : Number(v)),
                          })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`fm-gender-${idx}`}>Gender (optional)</Label>
                          <Input id={`fm-gender-${idx}`} placeholder="Male / Female / Other" {...form.register(`familyMembers.${idx}.gender`)} />
                        </div>
                        <div>
                          <Label htmlFor={`fm-mobile-${idx}`}>Mobile (optional)</Label>
                          <Input id={`fm-mobile-${idx}`} placeholder="Mobile number" {...form.register(`familyMembers.${idx}.mobile`)} />
                        </div>
                        <div>
                          <Label htmlFor={`fm-profession-${idx}`}>Profession (optional)</Label>
                          <Input id={`fm-profession-${idx}`} placeholder="Profession" {...form.register(`familyMembers.${idx}.profession`)} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor={`fm-designation-${idx}`}>Current designation (optional)</Label>
                          <Input id={`fm-designation-${idx}`} placeholder="Designation" {...form.register(`familyMembers.${idx}.designation`)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.35 }}
        >
          <Card>
            <CardBody>
              <H2>Voluntary donation (optional)</H2>
              <p className="mt-1 text-sm text-slate-600">
                Would you like to contribute a voluntary donation? If yes, we’ll show the payment steps after you submit.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <input
                  id="wantsDonation"
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-indigo-900 focus:ring-indigo-200"
                  {...form.register('wantsDonation')}
                />
                <Label htmlFor="wantsDonation" className="text-base text-slate-900">
                  Yes, I want to donate
                </Label>
              </div>

              {wantsDonation ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="donationAmountIntent">Donation amount (₹)</Label>
                    <Input
                      id="donationAmountIntent"
                      type="number"
                      placeholder="Optional amount you wish to donate"
                      {...form.register('donationAmountIntent', {
                        setValueAs: (v) => (v === '' ? '' : Number(v)),
                      })}
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    After you submit, you’ll see the organiser QR code for payment and a place to upload the payment screenshot + reference number.
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </motion.div>

        {serverError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            By submitting, you confirm details are correct. On event day bring the generated ID card + one ID proof.
          </p>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit registration'}
          </Button>
        </div>
      </form>
    </Container>
  )
}

