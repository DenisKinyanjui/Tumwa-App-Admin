import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  icon,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  icon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        {icon}
        {current?.label}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-36 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`block w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                  opt.value === value ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
