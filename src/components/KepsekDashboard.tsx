import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  ExternalLink,
  Eye,
  RotateCcw,
  AlertCircle,
  X,
  Printer,
  History,
} from 'lucide-react';

interface KepsekDashboardProps {
  reviewerName: string;
  canReview?: boolean;
  onRequestUpdated: () => void;
}

type DashboardRequest = Omit<PhotocopyRequest, 'status'> & {
  status: string;
  revisionNotes?: string;
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  revisionCount?: number;
  resubmittedAt?: string;
};

type ActionType = 'REVISION' | 'REJECT';

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({
  reviewerName,
  canReview,
  onRequestUpdated,
}) => {
  const reviewEnabled =
    canReview ??
    !reviewerName.toLowerCase().includes('administrator');

  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] =
    useState<string>('MENUNGGU');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] =
    useState<string | null>(null);

  const [actionTarget, setActionTarget] =
    useState<DashboardRequest | null>(null);
  const [actionType, setActionType] =
    useState<ActionType | null>(null);
  const [actionText, setActionText] = useState('');

  const mapRequest = (row: any): DashboardRequest => ({
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
    revisionNotes: row.revision_notes || undefined,
    revisionRequestedAt: row.revision_requested_at || undefined,
    revisionRequestedBy: row.revision_requested_by || undefined,
    revisionCount: row.revision_count || 0,
    resubmittedAt: row.resubmitted_at || undefined,
  });

  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('photocopy_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setRequests((data || []).map(mapRequest));
    } catch (err: any) {
      console.error('Load Kepsek requests error:', err);
      setErrorMsg(
        err?.message ||
          'Gagal memuat daftar pengajuan.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const openDocument = async (request: DashboardRequest) => {
    if (!request.fileUrl) {
      setErrorMsg('Dokumen tidak tersedia.');
      return;
    }

    setOpeningId(request.id);
    setErrorMsg('');

    try {
      if (request.fileType === 'url/link') {
        window.open(
          request.fileUrl,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }

      const { data, error } = await supabase.storage
        .from('photocopy-files')
        .createSignedUrl(request.fileUrl, 60 * 60);

      if (error) throw error;
      if (!data?.signedUrl) {
        throw new Error('File tidak dapat dibuka.');
      }

      window.open(
        data.signedUrl,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err: any) {
      console.error('Open document error:', err);
      setErrorMsg(
        err?.message || 'Gagal membuka dokumen.'
      );
    } finally {
      setOpeningId(null);
    }
  };

  const approveRequest = async (request: DashboardRequest) => {
    if (!reviewEnabled) {
      setErrorMsg(
        'Akun Administrator hanya memiliki akses pantau. Keputusan hanya dapat dilakukan oleh Kepala Sekolah.'
      );
      return;
    }

    if (
      !window.confirm(
        `Setujui pengajuan "${request.title}" dari ${request.teacherName}?`
      )
    ) {
      return;
    }

    setSubmittingId(request.id);
    setErrorMsg('');
    setSuccessMsg('');

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

      const { error } = await supabase
        .from('photocopy_requests')
        .update({
          status: 'DISETUJUI',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerName,
          reviewed_by_email: user.email || null,
          approval_notes: null,
          rejection_reason: null,
        })
        .eq('id', request.id)
        .eq('status', 'MENUNGGU');

      if (error) throw error;

      setSuccessMsg(
        `${request.id} disetujui dan diteruskan ke antrean Resource.`
      );

      await fetchRequests();
      onRequestUpdated();
    } catch (err: any) {
      console.error('Approve error:', err);
      setErrorMsg(
        err?.message || 'Gagal menyetujui pengajuan.'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const openAction = (
    request: DashboardRequest,
    type: ActionType
  ) => {
    if (!reviewEnabled) {
      setErrorMsg(
        'Akun Administrator hanya memiliki akses pantau.'
      );
      return;
    }

    setActionTarget(request);
    setActionType(type);
    setActionText('');
    setErrorMsg('');
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;

    if (!actionText.trim()) {
      setErrorMsg(
        actionType === 'REVISION'
          ? 'Catatan revisi wajib diisi.'
          : 'Alasan penolakan wajib diisi.'
      );
      return;
    }

    setSubmittingId(actionTarget.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (actionType === 'REVISION') {
        const { error } = await supabase.rpc(
          'kepsek_request_revision',
          {
            p_request_id: actionTarget.id,
            p_revision_notes: actionText.trim(),
          }
        );

        if (error) throw error;

        setSuccessMsg(
          `${actionTarget.id} dikembalikan kepada guru untuk diperbaiki.`
        );
      } else {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            'Sesi login tidak ditemukan. Silakan login ulang.'
          );
        }

        const { error } = await supabase
          .from('photocopy_requests')
          .update({
            status: 'DITOLAK',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewerName,
            reviewed_by_email: user.email || null,
            rejection_reason: actionText.trim(),
            approval_notes: null,
          })
          .eq('id', actionTarget.id)
          .eq('status', 'MENUNGGU');

        if (error) throw error;

        setSuccessMsg(
          `${actionTarget.id} ditolak dan tersimpan dalam riwayat.`
        );
      }

      setActionTarget(null);
      setActionType(null);
      setActionText('');

      await fetchRequests();
      onRequestUpdated();
    } catch (err: any) {
      console.error('Decision error:', err);
      setErrorMsg(
        err?.message || 'Gagal memproses keputusan.'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      MENUNGGU: requests.filter(
        (r) => r.status === 'MENUNGGU'
      ).length,
      PERLU_REVISI: requests.filter(
        (r) => r.status === 'PERLU_REVISI'
      ).length,
      DISETUJUI: requests.filter((r) =>
        [
          'DISETUJUI',
          'SEDANG_DICETAK',
          'SELESAI',
        ].includes(r.status)
      ).length,
      SELESAI: requests.filter(
        (r) => r.status === 'SELESAI'
      ).length,
      DITOLAK: requests.filter(
        (r) => r.status === 'DITOLAK'
      ).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return requests.filter((r) => {
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'DISETUJUI'
          ? [
              'DISETUJUI',
              'SEDANG_DICETAK',
              'SELESAI',
            ].includes(r.status)
          : r.status === selectedStatus);

      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        r.subjectClass.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [requests, selectedStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    if (status === 'MENUNGGU') {
      return (
        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
          MENUNGGU
        </span>
      );
    }

    if (status === 'PERLU_REVISI') {
      return (
        <span className="px-2 py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
          PERLU REVISI
        </span>
      );
    }

    if (status === 'DITOLAK') {
      return (
        <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700">
          DITOLAK
        </span>
      );
    }

    if (status === 'SEDANG_DICETAK') {
      return (
        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
          SEDANG DICETAK
        </span>
      );
    }

    if (status === 'SELESAI') {
      return (
        <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
          PERNAH DIFOTOKOPI
        </span>
      );
    }

    return (
      <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700">
        DISETUJUI
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal Kepala Sekolah
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold">
            Quick Decision Pengajuan Fotokopi
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {reviewEnabled
              ? 'Buka file dan berikan keputusan langsung dari daftar.'
              : 'Mode pantau Administrator. Keputusan hanya dapat dilakukan oleh Kepala Sekolah.'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Muat Ulang
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-xs font-semibold flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="underline font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric
          label="Menunggu"
          value={counts.MENUNGGU}
          onClick={() => setSelectedStatus('MENUNGGU')}
          className="bg-amber-50 border-amber-200 text-amber-800"
        />

        <Metric
          label="Perlu Revisi"
          value={counts.PERLU_REVISI}
          onClick={() =>
            setSelectedStatus('PERLU_REVISI')
          }
          className="bg-violet-50 border-violet-200 text-violet-800"
        />

        <Metric
          label="Disetujui"
          value={counts.DISETUJUI}
          onClick={() => setSelectedStatus('DISETUJUI')}
          className="bg-green-50 border-green-200 text-green-800"
        />

        <Metric
          label="Riwayat"
          value={counts.SELESAI}
          onClick={() => setSelectedStatus('SELESAI')}
          className="bg-slate-50 border-slate-200 text-slate-800"
        />

        <Metric
          label="Ditolak"
          value={counts.DITOLAK}
          onClick={() => setSelectedStatus('DITOLAK')}
          className="bg-red-50 border-red-200 text-red-800"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-3 justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {[
            ['MENUNGGU', `Menunggu (${counts.MENUNGGU})`],
            [
              'PERLU_REVISI',
              `Perlu Revisi (${counts.PERLU_REVISI})`,
            ],
            ['DISETUJUI', `Disetujui (${counts.DISETUJUI})`],
            ['SELESAI', `Riwayat (${counts.SELESAI})`],
            ['DITOLAK', `Ditolak (${counts.DITOLAK})`],
            ['ALL', `Semua (${requests.length})`],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setSelectedStatus(value)}
              className={`px-3 py-2 whitespace-nowrap rounded-lg text-xs font-bold ${
                selectedStatus === value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari guru, judul, kelas, atau ID..."
            className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-14 text-center text-slate-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-xs font-semibold">
              Memuat pengajuan...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-14 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">
              Tidak ada pengajuan
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-slate-50"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.urgency === 'TINGGI' && (
                        <span className="px-2 py-1 rounded text-[9px] font-bold bg-red-100 text-red-700">
                          URGENT
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-bold text-blue-700">
                        {request.id}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">
                      {request.title}
                    </h3>

                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        <strong className="text-slate-700">
                          {request.teacherName}
                        </strong>{' '}
                        • {request.subjectClass}
                      </span>
                      <span>
                        {request.pagesCount} hal ×{' '}
                        {request.copiesCount} salinan •{' '}
                        {request.totalSheets} lembar
                      </span>
                      <span>
                        Target: {request.targetDate}
                      </span>
                    </div>

                    {request.status === 'PERLU_REVISI' &&
                      request.revisionNotes && (
                        <div className="mt-2 text-[11px] text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                          <strong>Catatan revisi:</strong>{' '}
                          {request.revisionNotes}
                        </div>
                      )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openDocument(request)}
                      disabled={
                        openingId === request.id ||
                        !request.fileUrl
                      }
                      className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {request.fileType === 'url/link' ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      Lihat File
                    </button>

                    {reviewEnabled &&
                      request.status === 'MENUNGGU' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              approveRequest(request)
                            }
                            disabled={
                              submittingId === request.id
                            }
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Setujui
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAction(
                                request,
                                'REVISION'
                              )
                            }
                            disabled={
                              submittingId === request.id
                            }
                            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Perlu Revisi
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAction(
                                request,
                                'REJECT'
                              )
                            }
                            disabled={
                              submittingId === request.id
                            }
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                        </>
                      )}

                    {request.status ===
                      'SEDANG_DICETAK' && (
                      <span className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5" />
                        Diproses Resource
                      </span>
                    )}

                    {request.status === 'SELESAI' && (
                      <span className="px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        Selesai
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    actionType === 'REVISION'
                      ? 'text-violet-700'
                      : 'text-red-700'
                  }`}
                >
                  {actionType === 'REVISION'
                    ? 'Perlu Revisi'
                    : 'Tolak Pengajuan'}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {actionTarget.title}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {actionTarget.teacherName} •{' '}
                  {actionTarget.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                  setActionText('');
                }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {actionType === 'REVISION'
                  ? 'Apa yang perlu diperbaiki guru?'
                  : 'Alasan penolakan'}
              </label>

              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={5}
                autoFocus
                placeholder={
                  actionType === 'REVISION'
                    ? 'Contoh: Mohon jumlah salinan diubah menjadi 28 dan file diganti dengan versi terbaru.'
                    : 'Tuliskan alasan pengajuan ditolak...'
                }
                className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                  setActionText('');
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={submitAction}
                disabled={
                  submittingId === actionTarget.id ||
                  !actionText.trim()
                }
                className={`flex-1 py-2.5 text-white rounded-lg text-xs font-bold disabled:opacity-50 ${
                  actionType === 'REVISION'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submittingId === actionTarget.id
                  ? 'Memproses...'
                  : actionType === 'REVISION'
                  ? 'Kirim Permintaan Revisi'
                  : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: number;
  onClick: () => void;
  className: string;
}> = ({ label, value, onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-xl border p-4 shadow-sm ${className}`}
  >
    <div className="text-[10px] uppercase tracking-wide font-bold">
      {label}
    </div>
    <div className="text-2xl font-extrabold mt-1">
      {value}
    </div>
  </button>
);
