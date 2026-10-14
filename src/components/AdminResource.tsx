import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Play,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

type ResourceRequest = Omit<PhotocopyRequest, 'status'> & {
  status: string;
};

type StatusFilter = 'ALL' | 'DISETUJUI' | 'SEDANG_DICETAK' | 'SELESAI';

type SpecFilter =
  | 'ALL'
  | 'A4'
  | 'F4'
  | 'A3'
  | 'BW'
  | 'COLOR'
  | 'SINGLE'
  | 'DOUBLE';

const RESOURCE_STATUSES = ['DISETUJUI', 'SEDANG_DICETAK', 'SELESAI'];

export const AdminResource: React.FC = () => {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [specFilter, setSpecFilter] = useState<SpecFilter>('ALL');
  const [selectedRequest, setSelectedRequest] =
    useState<ResourceRequest | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [msg, setMsg] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const mapRequest = (row: any): ResourceRequest => ({
    id: row.id,
    teacherName: row.teacher_name,
    teacherNip: row.teacher_nip || undefined,
    teacherEmail: row.teacher_email || undefined,
    subjectClass: row.subject_class,
    title: row.title,
    fileName: row.file_name || 'Dokumen bahan ajar',
    fileSize: row.file_size || '',
    fileType: row.file_type || '',
    fileUrl: row.drive_file_url || row.file_url || undefined,
    driveFolderUrl: row.drive_folder_url || undefined,
    driveFileId: row.drive_file_id || undefined,
    driveFileUrl: row.drive_file_url || undefined,
    driveUploadedAt: row.drive_uploaded_at || undefined,
    pagesCount: row.pages_count,
    copiesCount: row.copies_count,
    totalSheets: row.total_sheets,
    paperSize: row.paper_size,
    colorOption: row.color_option,
    printSide: row.print_side,
    urgency: row.urgency,
    targetDate: row.target_date,
    notes: row.notes || undefined,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    approvalNotes: row.approval_notes || undefined,
    rejectionReason: row.rejection_reason || undefined,
    printedAt: row.printed_at || undefined,
    printedBy: row.printed_by || undefined,
    completedAt: row.completed_at || undefined,
  });

  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc(
        'resource_list_decided_requests'
      );

      if (error) throw error;

      const mapped = (data || [])
        .map(mapRequest)
        .filter((request) => RESOURCE_STATUSES.includes(request.status));

      setRequests(mapped);
    } catch (err: any) {
      console.error('Resource load error:', err);
      setErrorMsg(
        err?.message || 'Gagal memuat rekap fotokopi Resource.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approvedCount = requests.filter(
    (r) => r.status === 'DISETUJUI'
  ).length;

  const printingCount = requests.filter(
    (r) => r.status === 'SEDANG_DICETAK'
  ).length;

  const completedCount = requests.filter(
    (r) => r.status === 'SELESAI'
  ).length;

  const usedSheets = requests
    .filter((r) => r.status === 'SELESAI')
    .reduce((total, request) => total + (request.totalSheets || 0), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const priority: Record<string, number> = {
      DISETUJUI: 1,
      SEDANG_DICETAK: 2,
      SELESAI: 3,
    };

    return requests
      .filter((request) => {
        const matchesStatus =
          statusFilter === 'ALL' || request.status === statusFilter;

        let matchesSpec = true;

        if (
          specFilter === 'A4' ||
          specFilter === 'F4' ||
          specFilter === 'A3'
        ) {
          matchesSpec = request.paperSize === specFilter;
        } else if (specFilter === 'BW' || specFilter === 'COLOR') {
          matchesSpec = request.colorOption === specFilter;
        } else if (
          specFilter === 'SINGLE' ||
          specFilter === 'DOUBLE'
        ) {
          matchesSpec = request.printSide === specFilter;
        }

        const matchesSearch =
          !q ||
          request.id.toLowerCase().includes(q) ||
          request.teacherName.toLowerCase().includes(q) ||
          request.subjectClass.toLowerCase().includes(q) ||
          request.title.toLowerCase().includes(q);

        return matchesStatus && matchesSpec && matchesSearch;
      })
      .sort((a, b) => {
        const statusDiff =
          (priority[a.status] || 99) - (priority[b.status] || 99);

        if (statusDiff !== 0) return statusDiff;

        if (a.status === 'SELESAI' && b.status === 'SELESAI') {
          return String(b.completedAt || b.submittedAt).localeCompare(
            String(a.completedAt || a.submittedAt)
          );
        }

        if (a.urgency === 'TINGGI' && b.urgency !== 'TINGGI') return -1;
        if (b.urgency === 'TINGGI' && a.urgency !== 'TINGGI') return 1;

        return String(a.targetDate || '').localeCompare(
          String(b.targetDate || '')
        );
      });
  }, [requests, search, statusFilter, specFilter]);

  const formatDate = (date?: string) => {
    if (!date) return '-';

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    return new Date(date).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const updatePrintStatus = async (
    request: ResourceRequest,
    newStatus: 'SEDANG_DICETAK' | 'SELESAI'
  ) => {
    const confirmation =
      newStatus === 'SEDANG_DICETAK'
        ? `Mulai proses fotokopi "${request.title}"?`
        : `Tandai "${request.title}" sebagai selesai difotokopi?`;

    if (!window.confirm(confirmation)) return;

    setProcessingId(request.id);
    setErrorMsg('');
    setMsg('');

    try {
      const { error } = await supabase.rpc(
        'resource_update_print_status',
        {
          p_request_id: request.id,
          p_new_status: newStatus,
        }
      );

      if (error) throw error;

      setMsg(
        newStatus === 'SEDANG_DICETAK'
          ? `${request.id} sekarang sedang diproses.`
          : `${request.id} selesai difotokopi dan masuk riwayat.`
      );

      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      console.error('Resource update error:', err);
      setErrorMsg(
        err?.message || 'Gagal memperbarui status pencetakan.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDocument = async (request: ResourceRequest) => {
    if (!request.fileUrl) {
      setErrorMsg(
        'Link file tidak tersedia. Cek pengajuan guru atau gunakan folder Drive jika tersedia.'
      );
      return;
    }

    setOpeningId(request.id);
    setErrorMsg('');

    // Dibuka langsung saat klik supaya browser tidak memblokir sebagai popup.
    const newTab = window.open('about:blank', '_blank');

    try {
      const rawUrl = request.fileUrl.trim();

      // Berlaku untuk Google Drive, Canva, URL langsung, dan public URL.
      if (/^https?:\/\//i.test(rawUrl)) {
        if (newTab) {
          newTab.opener = null;
          newTab.location.href = rawUrl;
        } else {
          window.location.href = rawUrl;
        }
        return;
      }

      // File lama di Supabase Storage disimpan sebagai storage path.
      const { data, error } = await supabase.storage
        .from('photocopy-files')
        .createSignedUrl(rawUrl, 60 * 60);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error('Signed URL file tidak berhasil dibuat.');
      }

      if (newTab) {
        newTab.opener = null;
        newTab.location.href = data.signedUrl;
      } else {
        window.location.href = data.signedUrl;
      }
    } catch (err: any) {
      if (newTab && !newTab.closed) {
        newTab.close();
      }

      console.error('Open resource document error:', err);

      setErrorMsg(
        `${err?.message || 'Gagal membuka dokumen.'} ${
          request.driveFolderUrl
            ? 'Gunakan tombol "Buka Folder Drive" pada Detail sebagai alternatif.'
            : ''
        }`
      );
    } finally {
      setOpeningId(null);
    }
  };

  const statusBadge = (request: ResourceRequest) => {
    if (request.status === 'DISETUJUI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3" />
          SUDAH ACC • SIAP DIPROSES
        </span>
      );
    }

    if (request.status === 'SEDANG_DICETAK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold">
          <Printer className="w-3 h-3" />
          SEDANG DICETAK
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold">
        <History className="w-3 h-3" />
        SELESAI
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Kelola Resource
          </div>

          <h2 className="text-2xl font-bold">Rekap Proses Fotokopi</h2>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Semua pengajuan yang sudah disetujui Kepsek/Wakasek masuk
            dalam satu rekap. Buka file, proses fotokopi, lalu tandai selesai.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
          Muat Ulang
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-xs">
        <strong>Cara mencetak:</strong> klik <strong>Buka / Cetak File</strong>.
        Dokumen akan terbuka di tab baru. Dari PDF/Drive Viewer gunakan ikon
        Print atau tekan <strong>Ctrl + P</strong>.
      </div>

      {msg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-3">
          <span>{msg}</span>
          <button
            type="button"
            onClick={() => setMsg('')}
            className="font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ringkasan - bukan tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Sudah ACC"
          value={approvedCount}
          icon={<ShieldCheck className="w-5 h-5" />}
          helper="Siap diproses"
        />
        <SummaryCard
          label="Sedang Dicetak"
          value={printingCount}
          icon={<Printer className="w-5 h-5" />}
          helper="Masih berjalan"
        />
        <SummaryCard
          label="Selesai"
          value={completedCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          helper="Riwayat selesai"
        />
        <SummaryCard
          label="HVS Terpakai"
          value={usedSheets}
          icon={<FileText className="w-5 h-5" />}
          helper="Lembar dari pekerjaan selesai"
          suffix="lembar"
        />
      </div>

      {/* Satu filter bar untuk satu rekap */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari guru, kelas, judul, atau Tracking ID..."
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as StatusFilter)
          }
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700"
        >
          <option value="ALL">Semua Status</option>
          <option value="DISETUJUI">Sudah ACC / Siap Diproses</option>
          <option value="SEDANG_DICETAK">Sedang Dicetak</option>
          <option value="SELESAI">Selesai</option>
        </select>

        <select
          value={specFilter}
          onChange={(e) =>
            setSpecFilter(e.target.value as SpecFilter)
          }
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700"
        >
          <option value="ALL">Semua Spesifikasi</option>
          <option value="A4">Kertas A4</option>
          <option value="F4">Kertas F4</option>
          <option value="A3">Kertas A3</option>
          <option value="BW">Hitam Putih</option>
          <option value="COLOR">Berwarna</option>
          <option value="SINGLE">1 Sisi</option>
          <option value="DOUBLE">2 Sisi</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Semua Rekap Resource</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} data ditampilkan
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Memuat data Resource...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <div className="font-bold text-slate-700">
              Belum ada data
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Pengajuan yang sudah ACC akan otomatis muncul di sini.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((request) => (
              <div
                key={request.id}
                className="p-5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {statusBadge(request)}
                      {request.urgency === 'TINGGI' && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 border border-red-200 text-red-700">
                          PRIORITAS
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-slate-900 break-words">
                      {request.title}
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      {request.teacherName} • {request.subjectClass}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      {request.id}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        {request.pagesCount} halaman × {request.copiesCount} salinan
                      </span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        {request.totalSheets} lembar
                      </span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        {request.paperSize}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        {request.colorOption === 'BW'
                          ? 'Hitam Putih'
                          : 'Berwarna'}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        {request.printSide === 'DOUBLE'
                          ? '2 Sisi'
                          : '1 Sisi'}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-100">
                        Target: {formatDate(request.targetDate)}
                      </span>
                    </div>

                    {request.status === 'DISETUJUI' &&
                      request.reviewedBy && (
                        <div className="text-[11px] text-green-700 mt-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          ACC oleh <strong>{request.reviewedBy}</strong>
                          {request.reviewedAt
                            ? ` • ${formatDate(request.reviewedAt)}`
                            : ''}
                        </div>
                      )}
                  </div>

                  <div className="flex flex-wrap xl:justify-end gap-2 xl:w-[390px]">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold"
                    >
                      Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocument(request)}
                      disabled={openingId === request.id}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {openingId === request.id
                        ? 'Membuka...'
                        : 'Buka / Cetak File'}
                    </button>

                    {request.status === 'DISETUJUI' && (
                      <button
                        type="button"
                        onClick={() =>
                          updatePrintStatus(request, 'SEDANG_DICETAK')
                        }
                        disabled={processingId === request.id}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Mulai Fotokopi
                      </button>
                    )}

                    {request.status === 'SEDANG_DICETAK' && (
                      <button
                        type="button"
                        onClick={() =>
                          updatePrintStatus(request, 'SELESAI')
                        }
                        disabled={processingId === request.id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4 z-10">
              <div>
                {statusBadge(selectedRequest)}
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedRequest.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRequest.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info label="Nama Guru" value={selectedRequest.teacherName} />
                <Info
                  label="Kelas / Mata Pelajaran"
                  value={selectedRequest.subjectClass}
                />
                <Info
                  label="Tanggal Diperlukan"
                  value={formatDate(selectedRequest.targetDate)}
                />
                <Info
                  label="Jumlah"
                  value={`${selectedRequest.pagesCount} halaman × ${selectedRequest.copiesCount} salinan`}
                />
                <Info
                  label="Total HVS"
                  value={`${selectedRequest.totalSheets} lembar`}
                />
                <Info
                  label="Spesifikasi"
                  value={`${selectedRequest.paperSize} • ${
                    selectedRequest.colorOption === 'BW'
                      ? 'Hitam Putih'
                      : 'Berwarna'
                  } • ${
                    selectedRequest.printSide === 'DOUBLE'
                      ? '2 Sisi'
                      : '1 Sisi'
                  }`}
                />
              </div>

              {selectedRequest.reviewedBy && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    Sudah Disetujui Kepsek / Wakasek
                  </div>
                  <div className="text-[11px] text-green-700 mt-2">
                    Oleh: <strong>{selectedRequest.reviewedBy}</strong>
                    {selectedRequest.reviewedAt
                      ? ` • ${formatDate(selectedRequest.reviewedAt)}`
                      : ''}
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <DetailBox label="Catatan Guru" value={selectedRequest.notes} />
              )}

              {selectedRequest.approvalNotes && (
                <DetailBox
                  label="Catatan Persetujuan"
                  value={selectedRequest.approvalNotes}
                />
              )}

              <button
                type="button"
                onClick={() => handleOpenDocument(selectedRequest)}
                disabled={openingId === selectedRequest.id}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {openingId === selectedRequest.id
                  ? 'Membuka File...'
                  : 'Buka / Cetak File'}
              </button>

              {selectedRequest.driveFolderUrl && (
                <a
                  href={selectedRequest.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Buka Folder Drive
                </a>
              )}

              {selectedRequest.status === 'DISETUJUI' && (
                <button
                  type="button"
                  disabled={processingId === selectedRequest.id}
                  onClick={() =>
                    updatePrintStatus(selectedRequest, 'SEDANG_DICETAK')
                  }
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Mulai Proses Fotokopi
                </button>
              )}

              {selectedRequest.status === 'SEDANG_DICETAK' && (
                <button
                  type="button"
                  disabled={processingId === selectedRequest.id}
                  onClick={() =>
                    updatePrintStatus(selectedRequest, 'SELESAI')
                  }
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Selesai Difotokopi
                </button>
              )}

              {selectedRequest.status === 'SELESAI' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <History className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-800">
                    SELESAI DIFOTOKOPI
                  </div>
                  {selectedRequest.completedAt && (
                    <div className="text-[11px] text-slate-500 mt-2">
                      Selesai pada:{' '}
                      <strong>
                        {formatDate(selectedRequest.completedAt)}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  helper: string;
  suffix?: string;
}> = ({ label, value, icon, helper, suffix }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] uppercase font-bold text-slate-500">
        {label}
      </div>
      <div className="text-slate-600">{icon}</div>
    </div>
    <div className="text-2xl font-extrabold text-slate-900 mt-2">
      {value}{' '}
      {suffix && (
        <span className="text-xs font-semibold text-slate-500">
          {suffix}
        </span>
      )}
    </div>
    <div className="text-[10px] text-slate-400 mt-1">{helper}</div>
  </div>
);

const Info: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
      {label}
    </div>
    <div className="text-xs font-semibold text-slate-800 mt-1 break-words">
      {value}
    </div>
  </div>
);

const DetailBox: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-xl p-4 border bg-slate-50 border-slate-200">
    <div className="text-[10px] uppercase tracking-wide font-bold text-slate-500">
      {label}
    </div>
    <div className="text-xs mt-1 leading-relaxed text-slate-700">
      {value}
    </div>
  </div>
);
