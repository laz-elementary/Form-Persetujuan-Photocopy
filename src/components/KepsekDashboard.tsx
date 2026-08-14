import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  AlertCircle,
  FileText,
  Calculator,
  X,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  Download,
} from 'lucide-react';

interface KepsekDashboardProps {
  reviewerName: string;
  canReview: boolean;
  onRequestUpdated: () => void;
}

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({
  reviewerName,
  canReview,
  onRequestUpdated,
}) => {
  const [requests, setRequests] = useState<PhotocopyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStatus, setSelectedStatus] =
    useState<string>('MENUNGGU');

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRequest, setSelectedRequest] =
    useState<PhotocopyRequest | null>(null);

  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [openingFile, setOpeningFile] = useState(false);

  // =====================================================
  // MAPPING SUPABASE -> UI
  // =====================================================

  const mapRequest = (row: any): PhotocopyRequest => ({
    id: row.id,

    teacherName: row.teacher_name,
    teacherNip: row.teacher_nip || undefined,
    teacherEmail: row.teacher_email || undefined,

    subjectClass: row.subject_class,
    title: row.title,

    fileName: row.file_name || 'Dokumen bahan ajar',
    fileSize: row.file_size || '',
    fileType: row.file_type || '',
    fileUrl: row.file_url || undefined,

    driveFolderUrl: row.drive_folder_url || undefined,

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

    rejectionReason: row.rejection_reason || undefined,
    approvalNotes: row.approval_notes || undefined,

    printedAt: row.printed_at || undefined,
    printedBy: row.printed_by || undefined,

    completedAt: row.completed_at || undefined,
  });

  // =====================================================
  // LOAD SEMUA PENGAJUAN
  // =====================================================

  const fetchRequests = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('photocopy_requests')
        .select('*')
        .order('submitted_at', {
          ascending: false,
        });

      if (error) {
        console.error(
          'Supabase load requests error:',
          error
        );

        throw error;
      }

      setRequests(
        (data || []).map(mapRequest)
      );
    } catch (err) {
      console.error(
        'Error loading requests:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // =====================================================
  // BUKA DOKUMEN
  //
  // LINK -> buka langsung
  // FILE STORAGE -> signed URL private
  // =====================================================

  const handleOpenDocument = async (
    request: PhotocopyRequest
  ) => {
    if (!request.fileUrl) {
      setActionError(
        'Dokumen tidak memiliki file atau tautan.'
      );
      return;
    }

    setOpeningFile(true);
    setActionError('');

    try {
      // Jika sumber dokumen berupa link
      if (request.fileType === 'url/link') {
        window.open(
          request.fileUrl,
          '_blank',
          'noopener,noreferrer'
        );

        return;
      }

      // Jika file tersimpan di bucket private Supabase
      const { data, error } =
        await supabase.storage
          .from('photocopy-files')
          .createSignedUrl(
            request.fileUrl,
            60 * 60
          );

      if (error) {
        console.error(
          'Signed URL error:',
          error
        );

        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          'Signed URL dokumen tidak tersedia.'
        );
      }

      window.open(
        data.signedUrl,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err: any) {
      console.error(
        'Open document error:',
        err
      );

      setActionError(
        err?.message ||
          'Dokumen gagal dibuka.'
      );
    } finally {
      setOpeningFile(false);
    }
  };

  // =====================================================
  // SETUJUI / TOLAK
  // =====================================================

  const handleReviewAction = async (
    action: 'APPROVE' | 'REJECT'
  ) => {
    if (!canReview) {
  setActionError(
    'Akun Administrator hanya memiliki akses pantau. Persetujuan dan penolakan hanya dapat dilakukan oleh Kepala Sekolah.'
  );
  return;
}
    if (!selectedRequest) return;

    setActionError('');

    if (
      action === 'REJECT' &&
      !rejectionReason.trim()
    ) {
      setActionError(
        'Alasan penolakan wajib diisi agar guru mengetahui penyebabnya.'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          'Sesi login tidak ditemukan. Silakan login ulang.'
        );
      }

      const now =
        new Date().toISOString();

      const updateData =
        action === 'APPROVE'
          ? {
              status: 'DISETUJUI',

              reviewed_at: now,

              reviewed_by:
                reviewerName,

              reviewed_by_email:
                user.email || null,

              approval_notes:
                approvalNotes.trim() ||
                null,

              rejection_reason:
                null,
            }
          : {
              status: 'DITOLAK',

              reviewed_at: now,

              reviewed_by:
                reviewerName,

              reviewed_by_email:
                user.email || null,

              rejection_reason:
                rejectionReason.trim(),

              approval_notes:
                null,
            };

      const { error } = await supabase
        .from('photocopy_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) {
        console.error(
          'Supabase review error:',
          error
        );

        throw error;
      }

      await fetchRequests();

      onRequestUpdated();

      setSelectedRequest(null);
      setApprovalNotes('');
      setRejectionReason('');
    } catch (err: any) {
      console.error(
        'Review error:',
        err
      );

      setActionError(
        err?.message ||
          'Gagal memproses keputusan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // METRICS
  // =====================================================

  const pendingCount =
    requests.filter(
      (r) =>
        r.status === 'MENUNGGU'
    ).length;

  const approvedCount =
    requests.filter(
      (r) =>
        r.status === 'DISETUJUI' ||
        r.status === 'SEDANG_DICETAK' ||
        r.status === 'SELESAI'
    ).length;

  const completedCount =
  requests.filter(
    (r) => r.status === 'SELESAI'
  ).length;

  const totalSheetsApproved =
    requests
      .filter(
        (r) =>
          r.status === 'DISETUJUI' ||
          r.status === 'SEDANG_DICETAK' ||
          r.status === 'SELESAI'
      )
      .reduce(
        (acc, r) =>
          acc +
          (r.totalSheets || 0),
        0
      );

  // =====================================================
  // FILTER
  // =====================================================

  const filteredRequests =
    useMemo(() => {
      return requests.filter(
        (r) => {
          const matchesStatus =
            selectedStatus ===
              'ALL' ||
            (selectedStatus ===
              'MENUNGGU' &&
              r.status ===
                'MENUNGGU') ||
            (selectedStatus ===
              'DISETUJUI' &&
              [
                'DISETUJUI',
                'SEDANG_DICETAK',
                'SELESAI',
              ].includes(
                r.status
              )) ||
            (selectedStatus === 'SELESAI' &&
  r.status === 'SELESAI') ||
            (selectedStatus ===
              'DITOLAK' &&
              r.status ===
                'DITOLAK');

          const q =
            searchQuery
              .trim()
              .toLowerCase();

          const matchesSearch =
            !q ||
            r.id
              .toLowerCase()
              .includes(q) ||
            r.teacherName
              .toLowerCase()
              .includes(q) ||
            r.title
              .toLowerCase()
              .includes(q) ||
            r.subjectClass
              .toLowerCase()
              .includes(q);

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      requests,
      selectedStatus,
      searchQuery,
    ]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* HEADER */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

        <div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Portal Kepala Sekolah
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Dashboard Peninjauan & Persetujuan Cetak
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm">
            Selamat datang,{' '}
            <strong className="text-blue-400 font-bold">
              {reviewerName}
            </strong>
            . Evaluasi dan berikan keputusan terhadap pengajuan guru.
          </p>

        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-2 shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading
                ? 'animate-spin'
                : ''
            }`}
          />

          <span>
            Muat Ulang Data
          </span>
        </button>

      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <button
          onClick={() =>
            setSelectedStatus(
              'MENUNGGU'
            )
          }
          className="text-left p-5 rounded-xl border bg-amber-50 border-amber-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-amber-700">
              Menunggu Review
            </span>

            <Clock className="w-5 h-5 text-amber-600" />
          </div>

          <div className="text-3xl font-bold text-amber-900">
            {pendingCount}
          </div>
        </button>

        <button
          onClick={() =>
            setSelectedStatus(
              'DISETUJUI'
            )
          }
          className="text-left p-5 rounded-xl border bg-green-50 border-green-200"
        >
          <div className="flex items-center justify-between mb-2">

            <span className="text-xs font-bold uppercase text-green-700">
              Disetujui
            </span>

            <CheckCircle2 className="w-5 h-5 text-green-600" />

          </div>

          <div className="text-3xl font-bold text-green-900">
            {approvedCount}
          </div>
        </button>

        <button
          onClick={() =>
            setSelectedStatus(
              'DITOLAK'
            )
          }
          className="text-left p-5 rounded-xl border bg-red-50 border-red-200"
        >
          <div className="flex items-center justify-between mb-2">

            <span className="text-xs font-bold uppercase text-red-700">
              Ditolak
            </span>

            <XCircle className="w-5 h-5 text-red-600" />

          </div>

          <div className="text-3xl font-bold text-red-900">
            {rejectedCount}
          </div>
        </button>

        <div className="p-5 bg-slate-900 text-white rounded-xl border border-slate-800">

          <div className="flex items-center justify-between mb-2">

            <span className="text-xs font-bold uppercase text-slate-400">
              Total HVS ACC
            </span>

            <Calculator className="w-5 h-5 text-blue-400" />

          </div>

          <div className="text-3xl font-bold text-blue-400">
            {totalSheetsApproved}
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Lembar disetujui
          </div>

        </div>

      </div>

      {/* FILTER */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-full lg:w-auto overflow-x-auto text-xs">

          {[
  ['MENUNGGU', `Menunggu (${pendingCount})`],
  ['DISETUJUI', `Disetujui (${approvedCount})`],
  ['SELESAI', `Riwayat Fotokopi (${completedCount})`],
  ['DITOLAK', `Ditolak (${rejectedCount})`],
  ['ALL', `Semua (${requests.length})`],
].map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setSelectedStatus(
                    value
                  )
                }
                className={`px-3 py-2 font-bold rounded-lg whitespace-nowrap ${
                  selectedStatus ===
                  value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {label}
              </button>
            )
          )}

        </div>

        <div className="relative w-full lg:w-80">

          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

          <input
            type="text"
            placeholder="Cari guru, judul, kelas, atau ID..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            className="w-full px-3.5 py-2 pl-9 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {loading ? (
          <div className="p-12 text-center text-slate-400">

            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />

            <p className="text-xs font-semibold">
              Memuat daftar pengajuan...
            </p>

          </div>
        ) : filteredRequests.length ===
          0 ? (
          <div className="p-12 text-center text-slate-400">

            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />

            <p className="text-sm font-bold text-slate-700">
              Tidak ada pengajuan ditemukan
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs border-collapse">

              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">

                  <th className="py-3.5 px-4">
                    Tracking ID
                  </th>

                  <th className="py-3.5 px-4">
                    Guru & Kelas
                  </th>

                  <th className="py-3.5 px-4">
                    Bahan Ajar
                  </th>

                  <th className="py-3.5 px-4">
                    Spesifikasi
                  </th>

                  <th className="py-3.5 px-4 text-center">
                    HVS
                  </th>

                  <th className="py-3.5 px-4">
                    Status
                  </th>

                  <th className="py-3.5 px-4 text-right">
                    Aksi
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredRequests.map(
                  (req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="py-3.5 px-4 whitespace-nowrap">

                        <div className="font-mono font-bold text-slate-900">
                          {req.id}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {new Date(
                            req.submittedAt
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </div>

                      </td>

                      <td className="py-3.5 px-4">

                        <div className="font-bold text-slate-900">
                          {req.teacherName}
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {req.subjectClass}
                        </div>

                      </td>

                      <td className="py-3.5 px-4 max-w-xs">

                        <div className="font-semibold text-slate-900 truncate">
                          {req.title}
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          {req.fileName}
                        </div>

                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">

                        <div className="font-semibold">
                          {req.pagesCount}{' '}
                          hal ×{' '}
                          {req.copiesCount}{' '}
                          salinan
                        </div>

                        <div className="text-[10px] text-slate-500">
                          {req.paperSize} |{' '}
                          {req.colorOption ===
                          'COLOR'
                            ? 'Color'
                            : 'B/W'}{' '}
                          |{' '}
                          {req.printSide ===
                          'DOUBLE'
                            ? '2 Sisi'
                            : '1 Sisi'}
                        </div>

                      </td>

                      <td className="py-3.5 px-4 text-center">

                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {req.totalSheets}
                        </span>

                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">

                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            req.status ===
                            'MENUNGGU'
                              ? 'bg-amber-100 text-amber-700'
                              : req.status ===
                                'DITOLAK'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {req.status === 'SELESAI'
  ? 'PERNAH DIFOTOKOPI'
  : req.status === 'SEDANG_DICETAK'
  ? 'SEDANG DIPROSES'
  : req.status}
                        </span>

                      </td>

                      <td className="py-3.5 px-4 text-right">

                        <button
                          onClick={() => {
                            setSelectedRequest(
                              req
                            );

                            setApprovalNotes(
                              req.approvalNotes ||
                                ''
                            );

                            setRejectionReason(
                              req.rejectionReason ||
                                ''
                            );

                            setActionError(
                              ''
                            );
                          }}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Tinjau
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>

          </div>
        )}

      </div>

      {/* REVIEW MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

          <div className="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8">

            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">

              <div>

                <span className="text-[10px] font-bold text-blue-600">
                  PENINJAUAN KEPALA SEKOLAH
                </span>

                <h3 className="text-xl font-bold text-slate-900">
                  {selectedRequest.title}
                </h3>

                <p className="text-xs text-slate-500">
                  {selectedRequest.teacherName}{' '}
                  •{' '}
                  {selectedRequest.subjectClass}
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

            </div>

            <div className="py-5 space-y-4">

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border text-xs">

                <div>
                  <span className="text-slate-400 block">
                    File
                  </span>

                  <strong>
                    {
                      selectedRequest.fileName
                    }
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Cetak
                  </span>

                  <strong>
                    {
                      selectedRequest.pagesCount
                    }{' '}
                    ×{' '}
                    {
                      selectedRequest.copiesCount
                    }
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Kertas
                  </span>

                  <strong className="text-blue-700">
                    {
                      selectedRequest.totalSheets
                    }{' '}
                    lembar
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block">
                    Target
                  </span>

                  <strong>
                    {
                      selectedRequest.targetDate
                    }
                  </strong>
                </div>

              </div>
{selectedRequest.status === 'SELESAI' && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
      <CheckCircle2 className="w-4 h-4" />
      PERNAH DIFOTOKOPI
    </div>

    <div className="text-xs text-green-700 mt-2">
      Pengajuan ini telah selesai diproses dan menjadi bagian dari
      riwayat fotokopi sekolah.
    </div>

    {selectedRequest.completedAt && (
      <div className="text-[11px] text-green-700 mt-2">
        Selesai pada:{' '}
        <strong>
          {new Date(
            selectedRequest.completedAt
          ).toLocaleString('id-ID')}
        </strong>
      </div>
    )}
  </div>
)}
              {/* OPEN DOCUMENT */}
              <button
                type="button"
                onClick={() =>
                  handleOpenDocument(
                    selectedRequest
                  )
                }
                disabled={
                  openingFile ||
                  !selectedRequest.fileUrl
                }
                className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3 hover:bg-blue-100 disabled:opacity-50"
              >

                <div className="flex items-center gap-3 text-left">

                  {selectedRequest.fileType ===
                  'url/link' ? (
                    <LinkIcon className="w-5 h-5 text-blue-700" />
                  ) : (
                    <Download className="w-5 h-5 text-blue-700" />
                  )}

                  <div>

                    <div className="font-bold text-blue-900 text-xs">
                      {selectedRequest.fileType ===
                      'url/link'
                        ? 'Buka Tautan Dokumen'
                        : 'Buka File Bahan Ajar'}
                    </div>

                    <div className="text-[11px] text-blue-700">
                      {
                        selectedRequest.fileName
                      }
                    </div>

                  </div>

                </div>

                <ExternalLink className="w-4 h-4 text-blue-700" />

              </button>

              {selectedRequest.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900">

                  <strong>
                    Catatan Guru:
                  </strong>{' '}

                  {selectedRequest.notes}

                </div>
              )}

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">

                  <AlertCircle className="w-4 h-4" />

                  {actionError}

                </div>
              )}

              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Persetujuan
                </label>

                <input
                  type="text"
                  placeholder="Contoh: ACC, silakan dicetak."
                  value={
                    approvalNotes
                  }
                  onChange={(e) =>
                    setApprovalNotes(
                      e.target.value
                    )
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan
                </label>

                <textarea
                  rows={3}
                  placeholder="Wajib diisi jika pengajuan ditolak."
                  value={
                    rejectionReason
                  }
                  onChange={(e) =>
                    setRejectionReason(
                      e.target.value
                    )
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />

              </div>

            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row justify-end gap-3">

              <button
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold"
              >
                Batal
              </button>

              {canReview ? (
  <>
    <button
      disabled={isSubmitting}
      onClick={() =>
        handleReviewAction('REJECT')
      }
      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
    >
      Tolak Pengajuan
    </button>

    <button
      disabled={isSubmitting}
      onClick={() =>
        handleReviewAction('APPROVE')
      }
      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
    >
      Setujui (ACC)
    </button>
  </>
) : (
  <div className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-xs font-semibold">
    Mode Pantau Admin — Anda dapat mengecek pengajuan dan dokumen, tetapi keputusan Setujui/Tolak hanya dapat dilakukan oleh Kepala Sekolah.
  </div>
)}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
