import path from 'path'

export function UUIDToPath (id: string) {
  id = id.replace(/-/g, '')
  const a = id.substring(0, 2)
  const b = id.substring(2)
  return path.join(a, b)
}
