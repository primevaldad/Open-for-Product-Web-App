import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  const names = name.split(' ')
  if (names.length === 0) return 'U'
  const firstInitial = names[0][0]
  const lastInitial = names.length > 1 ? names[names.length - 1][0] : ''
  return `${firstInitial}${lastInitial}`.toUpperCase()
}
