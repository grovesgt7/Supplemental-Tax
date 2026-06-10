import type { ReactNode } from 'react';

const styles = {
  info: {
    wrap: 'bg-brand-50 border-brand-200',
    icon: 'text-brand-600',
    text: 'text-brand-900',
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-900',
  },
  success: {
    wrap: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-900',
  },
  danger: {
    wrap: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    text: 'text-red-900',
  },
} as const;

const icons = {
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  ),
  warning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  ),
  success: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  danger: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
} as const;

export default function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children: ReactNode;
}) {
  const s = styles[variant];
  return (
    <div className={`rounded-xl border px-4 py-3.5 flex gap-3 ${s.wrap}`}>
      <svg
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {icons[variant]}
      </svg>
      <div className={`text-sm leading-relaxed ${s.text}`}>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children}
      </div>
    </div>
  );
}
