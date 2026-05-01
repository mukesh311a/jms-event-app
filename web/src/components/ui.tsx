import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Container(props: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('mx-auto w-full max-w-5xl px-4 sm:px-6', props.className)}>
      {props.children}
    </div>
  )
}

export function Card(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-black/10 bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60',
        props.className,
      )}
    >
      {props.children}
    </div>
  )
}

export function CardBody(props: { children: ReactNode; className?: string }) {
  return <div className={clsx('p-5 sm:p-6', props.className)}>{props.children}</div>
}

export function H1(props: { children: ReactNode; className?: string }) {
  return (
    <h1 className={clsx('text-2xl font-semibold tracking-tight sm:text-3xl', props.className)}>
      {props.children}
    </h1>
  )
}

export function H2(props: { children: ReactNode; className?: string }) {
  return (
    <h2 className={clsx('text-lg font-semibold tracking-tight sm:text-xl', props.className)}>
      {props.children}
    </h2>
  )
}

export function Label(props: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label
      htmlFor={props.htmlFor}
      className={clsx('text-sm font-medium text-slate-700', props.className)}
    >
      {props.children}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={clsx(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm outline-none',
        'placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-indigo-100',
        className,
      )}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={clsx(
        'min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none',
        'placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-indigo-100',
        className,
      )}
    />
  )
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'danger' }) {
  const { className, tone = 'primary', ...rest } = props
  const base =
    'inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60'
  const tones: Record<string, string> = {
    primary: 'bg-indigo-900 text-white hover:bg-indigo-800 focus:ring-indigo-200',
    ghost: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-200',
  }
  return <button {...rest} className={clsx(base, tones[tone], className)} />
}

export function Divider(props: { className?: string }) {
  return <div className={clsx('h-px w-full bg-black/10', props.className)} />
}

