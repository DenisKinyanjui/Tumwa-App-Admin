interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

const DOT_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export default function Avatar({ name, photoUrl, size = 'md', online }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="relative shrink-0">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover ring-1 ring-gray-100`}
        />
      ) : (
        <div
          className={`flex ${SIZE_CLASSES[size]} items-center justify-center rounded-full bg-primary-50 font-bold text-primary-600`}
        >
          {initial}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_CLASSES[size]} rounded-full ring-2 ring-white ${
            online ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      )}
    </div>
  )
}
