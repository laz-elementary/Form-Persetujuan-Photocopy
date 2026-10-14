# E-Photocopy V3 — Setup Final

Target alur:

**Guru → Portal Persetujuan (Kepsek/Wakasek) → Lacak Status → Resource → Selesai → Rekap Kertas**

## A. Ganti file GitHub

Salin file dari paket ini ke lokasi yang sama pada repo `Form-Persetujuan-Photocopy`:

- `src/App.tsx`
- `src/types.ts`
- `src/components/Header.tsx`
- `src/components/AdminLoginModal.tsx`
- `src/components/TeacherSubmissionForm.tsx`
- `src/components/KepsekDashboard.tsx`
- `src/components/StatusTracker.tsx`
- `src/components/AdminManagement.tsx`
- `src/components/AdminResource.tsx`
- `src/lib/driveUpload.ts` **(file baru)**
- `api/drive-upload-session.ts` **(file baru di root/api)**
- `vercel.json`

Commit seluruh perubahan.

## B. Jalankan SQL Supabase

Buka Supabase → SQL Editor → New Query.

Paste seluruh isi:

`sql/ephotocopy_v3_migration.sql`

Lalu Run sekali.

SQL ini:

- mengaktifkan role `WAKASEK`;
- menambah status `PERLU_REVISI`;
- menyamakan hak keputusan KEPSEK + WAKASEK;
- membuat alur revisi guru;
- membuat data approved otomatis terbaca Resource;
- membuat Resource/Admin dapat mengubah status `DISETUJUI → SEDANG_DICETAK → SELESAI`;
- membuat Admin dapat membaca semua data;
- menjaga email guru dan URL file tidak ikut keluar melalui RPC publik Lacak Status.

## C. Hubungkan upload ke Google Drive

Folder tujuan:

`Dokumen Photocopy SD`

Folder ID:

`1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN`

Folder ini berada di **Shared Drive**, sehingga integrasi menggunakan Service Account.

### 1. Google Cloud

Buat / gunakan Google Cloud Project sekolah, lalu:

1. Enable **Google Drive API**.
2. Buat **Service Account**.
3. Buat JSON key untuk Service Account.
4. Catat:
   - `client_email`
   - `private_key`

### 2. Beri akses Service Account ke Shared Drive

Minta Manager Shared Drive / IT menambahkan email Service Account sebagai **Content manager** (atau minimal role yang boleh membuat file) pada Shared Drive yang berisi folder `Dokumen Photocopy SD`.

Tanpa langkah ini, API akan mendapat 403 walaupun kode benar.

### 3. Vercel Environment Variables

Project Vercel → Settings → Environment Variables, tambahkan:

`GOOGLE_SERVICE_ACCOUNT_EMAIL`

isi dengan `client_email` Service Account.

`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

isi dengan seluruh nilai `private_key`, termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`.

`GOOGLE_DRIVE_FOLDER_ID`

isi:

`1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN`

`APP_ORIGIN`

isi:

`https://form-persetujuan-photocopy.vercel.app`

Set ke Production (dan Preview bila ingin dites di Preview).

Setelah menambah env vars → Redeploy.

## D. Role staff

Contoh Wakasek:

```sql
insert into public.staff_access (name,email,role,active)
values ('Ovnica Nitasari','ovnica@lazuardi.sch.id','WAKASEK',true)
on conflict (email)
do update set
  name = excluded.name,
  role = excluded.role,
  active = true;
```

Resource:

```sql
insert into public.staff_access (name,email,role,active)
values ('Nama Resource','email@lazuardi.sch.id','RESOURCE',true)
on conflict (email)
do update set
  name = excluded.name,
  role = excluded.role,
  active = true;
```

## E. Tes alur satu kali

1. Guru isi Form + email + upload PDF kecil.
2. Pastikan file muncul di folder Drive `Dokumen Photocopy SD`.
3. Pastikan request muncul `MENUNGGU` di Portal Persetujuan.
4. Login Kepsek → pilih `PERLU REVISI`; cek Lacak Status dan kirim ulang.
5. Login Wakasek → pastikan tombol `Setujui / Perlu Revisi / Tolak` sama dengan Kepsek.
6. Setujui satu request → cek langsung muncul di `Kelola Resource`.
7. Resource klik `Mulai Cetak` → `Selesai`.
8. Cek Rekap Kertas Resource: jumlah HVS hanya bertambah untuk status `SELESAI`.
9. Cek Admin Kelola: seluruh status terlihat dan CSV bisa diekspor.

## Catatan upload Drive

Upload memakai **resumable upload Google Drive**: Vercel hanya membuat sesi upload kecil, sedangkan file dikirim browser langsung ke Google Drive. Ini menghindari batas payload Vercel Function untuk file besar.
