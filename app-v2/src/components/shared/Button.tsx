import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50',
  secondary: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  ghost: 'bg-transparent text-sky-700 hover:bg-sky-50',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  children: ReactNode
}) {
  return (
    <button
      type={type}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
