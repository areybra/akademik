const LEVEL_ORDER: Record<string, number> = {
  X: 0,
  XI: 1,
  XII: 2
}

export const extractLevel = (className: string) => {
  const first = (className || '').trim().split(/\s+/)[0] || ''
  return first.toUpperCase()
}

// Urutkan kelas berdasarkan tingkat X, XI, XII lalu nama secara natural.
export const compareClassNames = (a: string, b: string) => {
  const levelA = LEVEL_ORDER[extractLevel(a)] ?? 99
  const levelB = LEVEL_ORDER[extractLevel(b)] ?? 99
  if (levelA !== levelB) return levelA - levelB
  return a.localeCompare(b, 'id', { numeric: true })
}

export const sortClassNames = (names: string[]) => [...names].sort(compareClassNames)
