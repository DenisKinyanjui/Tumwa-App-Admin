import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

// Read-only counterpart to SettingsFormShell — no dirty tracking, no Save/Cancel.
// Used for panels that only display information (integrations, system info).
export default function SettingsInfoShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<LucideProps>
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-6 py-4">
        <Icon className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-4 px-6 py-5">
        <p className="text-xs text-gray-500">{description}</p>
        {children}
      </div>
    </section>
  )
}
