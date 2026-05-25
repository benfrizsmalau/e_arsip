import { supabase } from '@/lib/supabase'
import type { Klasifikasi } from '@/types/database'

const PAGE_SIZE = 1000

export type KlasifikasiOption = Pick<Klasifikasi, 'id' | 'kode' | 'nama'>

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
