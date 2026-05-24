export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      instansi: {
        Row: {
          id: string
          kode: string
          nama: string
          singkatan: string | null
          alamat: string | null
          telepon: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['instansi']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['instansi']['Insert']>
      }
      karyawan: {
        Row: {
          id: string
          nip: string
          nama: string
          jabatan: string | null
          golongan: string | null
          id_instansi: string | null
          email: string | null
          foto_url: string | null
          tipe: 'struktural' | 'pelaksana'
          aktif: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['karyawan']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['karyawan']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          nip: string | null
          id_instansi: string | null
          hak: 'superadmin' | 'admin' | 'agendaris' | 'staf' | 'pimpinan'
          is_agendaris: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      klasifikasi: {
        Row: {
          id: string
          kode: string
          nama: string
          keterangan: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['klasifikasi']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['klasifikasi']['Insert']>
      }
      jra: {
        Row: {
          id: string
          kode: string
          id_klasifikasi: string | null
          judul: string
          retensi_aktif: number | null
          retensi_inaktif: number | null
          nasib_akhir: 'permanen' | 'musnah' | 'dinilai_kembali' | null
          keterangan: string | null
          dasar_hukum: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['jra']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['jra']['Insert']>
      }
      arsip: {
        Row: {
          id: string
          nomor_arsip: string
          judul: string
          perihal: string | null
          id_klasifikasi: string | null
          id_jra: string | null
          nomor_surat: string | null
          tanggal_surat: string | null
          id_instansi: string | null
          pengirim: string | null
          tingkat_keamanan: 'biasa' | 'terbatas' | 'rahasia' | 'sangat_rahasia'
          media_simpan: 'digital' | 'fisik' | 'keduanya'
          tingkat_perkembangan: 'asli' | 'fotokopi' | 'tembusan' | null
          kurun_waktu_mulai: string | null
          kurun_waktu_selesai: string | null
          jumlah: number
          keterangan: string | null
          status: 'aktif' | 'inaktif' | 'vital' | 'permanen' | 'musnah' | 'draft'
          file_url: string | null
          thumbnail_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['arsip']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['arsip']['Insert']>
      }
      surat_masuk: {
        Row: {
          id: string
          nomor_agenda: string
          asal_surat: string
          nomor_surat: string
          tanggal_surat: string
          tanggal_terima: string
          perihal: string
          id_instansi: string | null
          disposisi_kepada: string | null   // TEXT (nama pejabat)
          sifat: 'biasa' | 'penting' | 'rahasia' | 'sangat_segera'
          file_url: string | null
          status: 'baru' | 'diproses' | 'selesai' | 'diarsipkan'
          id_arsip: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['surat_masuk']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['surat_masuk']['Insert']>
      }
      surat_keluar: {
        Row: {
          id: string
          nomor_agenda: string
          tujuan: string
          nomor_surat: string
          tanggal_surat: string
          perihal: string
          id_instansi: string | null
          id_klasifikasi: string | null
          penandatangan: string | null      // TEXT (nama pejabat TTD)
          sifat: 'biasa' | 'penting' | 'rahasia' | 'sangat_segera'
          file_url: string | null
          status: 'draft' | 'menunggu_ttd' | 'terkirim' | 'diarsipkan'
          id_arsip: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['surat_keluar']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['surat_keluar']['Insert']>
      }
      nomor_urut_surat: {
        Row: {
          id: string
          id_instansi: string
          id_klasifikasi: string
          tahun: number
          counter: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['nomor_urut_surat']['Row'], 'id' | 'updated_at'> & { id?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['nomor_urut_surat']['Insert']>
      }
      notifikasi: {
        Row: {
          id: string
          user_id: string
          judul: string
          pesan: string
          tipe: 'info' | 'warning' | 'success' | 'error'
          dibaca: boolean
          link: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifikasi']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['notifikasi']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_nomor_surat: {
        Args: { p_id_instansi: string; p_id_klasifikasi: string }
        Returns: string
      }
      preview_nomor_surat: {
        Args: { p_id_instansi: string; p_id_klasifikasi: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience types
export type Instansi = Database['public']['Tables']['instansi']['Row']
export type Karyawan = Database['public']['Tables']['karyawan']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Klasifikasi = Database['public']['Tables']['klasifikasi']['Row']
export type JRA = Database['public']['Tables']['jra']['Row']
export type Arsip = Database['public']['Tables']['arsip']['Row']
export type SuratMasuk = Database['public']['Tables']['surat_masuk']['Row']
export type SuratKeluar = Database['public']['Tables']['surat_keluar']['Row']
export type Notifikasi = Database['public']['Tables']['notifikasi']['Row']
export type NomorUrutSurat = Database['public']['Tables']['nomor_urut_surat']['Row']
