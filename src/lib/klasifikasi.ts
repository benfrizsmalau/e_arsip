import { supabase } from '@/lib/supabase'
import type { Klasifikasi } from '@/types/database'

const PAGE_SIZE = 1000

export type KlasifikasiOption = Pick<Klasifikasi, 'id' | 'kode' | 'nama'>

export type KlasifikasiNode = KlasifikasiOption & {
  children: KlasifikasiNode[]
}

/** Bangun pohon hierarki dari daftar flat klasifikasi.
 *  Parent ditentukan dengan memotong segmen terakhir dari kode,
 *  misalnya parent dari "000.1.2" adalah "000.1". */
export function buildKlasifikasiTree(items: KlasifikasiOption[]): KlasifikasiNode[] {
  const map = new Map<string, KlasifikasiNode>()
  const roots: KlasifikasiNode[] = []

  const sorted = [...items].sort((a, b) => compareClassificationCodes(a.kode, b.kode))

  for (const item of sorted) {
    const node: KlasifikasiNode = { ...item, children: [] }
    map.set(item.kode, node)

    const dot = item.kode.lastIndexOf('.')
    if (dot === -1) {
      roots.push(node)
    } else {
      const parentKode = item.kode.slice(0, dot)
      const parent = map.get(parentKode)
      if (parent) parent.children.push(node)
      else roots.push(node) // orphan → jadikan root
    }
  }

  return roots
}

export function compareClassificationCodes(a: string, b: string): number {
  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)
  const length = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < length; i += 1) {
    const aPart = aParts[i] ?? -1
    const bPart = bParts[i] ?? -1
    if (aPart !== bPart) return aPart - bPart
  }

  return a.localeCompare(b)
}

export async function fetchAllKlasifikasi<T extends { kode: string } = Klasifikasi>(columns = '*'): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('klasifikasi')
      .select(columns)
      .order('kode')
      .range(from, to)

    if (error) throw error

    const page = (data ?? []) as T[]
    rows.push(...page)

    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows.sort((a, b) => compareClassificationCodes(a.kode, b.kode))
}
