import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest, RequestStatus } from '../types';
import { supabase } from '../lib/supabase';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  RefreshCw,
  Eye,
  X,
  Calculator,
  AlertCircle,
  Printer,
  Copy,
  ShieldCheck,
  History,
} from 'lucide-react';

interface StatusTrackerProps {
  initialTrackingCode?: string;
}

type HistoryFilter =
  | 'SEMUA'
  | 'MENUNGGU'
  | 'DISETUJUI'
  | 'SEDANG_DICETAK'
  | 'SELESAI'
  | 'DITOLAK';

export const StatusTracker: React.FC<StatusTrackerProps> = ({
  initialTrackingCode = '',
}) => {
  const [requests, setRequests] = useState<PhotocopyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<PhotocopyRequest | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('SEMUA');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const mapHistoryRequest = (row: any): PhotocopyRequest => ({
    id: row.id,
    teacherName: row.teacher_name,
    subjectClass: row.subject_class,
    title: row.title,

    fileName: 'Dokumen bahan ajar',
    fileSize: '',
    fileType: '',

    pagesCount: row.pages_count,
    copiesCount: row.copies_count,
    totalSheets: row.total_sheets,
    paperSize: row.paper_size,
    colorOption: row.color_option,
    printSide: row.print_side,
    urgency: row.urgency,

    targetDate: row.target_date,
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

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc(
        'list_photocopy_request_history'
      );

      if (error) throw error;

      const mapped: PhotocopyRequest[] = (data || []).map(
        mapHistoryRequest
      );

      setRequests(mapped);

      if (initialTrackingCode) {
        const target = mapped.find(
          (request) =>
            request.id.toUpperCase() ===
            initialTrackingCode.trim().toUpperCase()
        );

        if (target) {
          setSelectedRequest(target);
        }
      }
    } catch (err: any) {
      console.error('Load history error:', err);
      setErrorMsg(
        err?.message ||
          'Gagal memuat riwayat pengajuan fotokopi.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [initialTrackingCode]);

  const formatDate = (value?: string) => {
    if (!value) return '-';

    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatTargetDate = (value?: string) => {
    if (!value) return '-';

    return new Date(`${value}T00:00:00`).toLocaleDateString(
      'id-ID',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  const copyTrackingId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId('');
      }, 1800);
    } catch {
      setErrorMsg(
        'Tracking ID tidak dapat disalin otomatis. Silakan salin secara manual.'
      );
    }
  };

  const getStatusStyle = (status: RequestStatus) => {
    switch (status) {
      case 'DISETUJUI':
        return {
          className:
            'bg-green-100 text-green-700 border-green-200',
          cardBorder: 'border-green-200',
          label: 'DISETUJUI KEPALA SEKOLAH',
          shortLabel: 'Disetujui',
          icon: <ShieldCheck className="w-4 h-4" />,
        };

      case 'DITOLAK':
        return {
          className:
            'bg-red-100 text-red-700 border-red-200',
          cardBorder: 'border-red-200',
          label: 'DITOLAK',
          shortLabel: 'Ditolak',
          icon: <XCircle className="w-4 h-4" />,
        };

      case 'SEDANG_DICETAK':
        return {
          className:
            'bg-blue-100 text-blue-700 border-blue-200',
          cardBorder: 'border-blue-200',
          label: 'SEDANG DIPROSES RESOURCE',
          shortLabel: 'Sedang Dicetak',
          icon: <Printer className="w-4 h-4" />,
        };

      case 'SELESAI':
        return {
          className:
            'bg-slate-200 text-slate-700 border-slate-300',
          cardBorder: 'border-slate-300',
          label: 'SELESAI',
          shortLabel: 'Selesai',
          icon: <CheckCircle2 className="w-4 h-4" />,
        };

      default:
        return {
          className:
            'bg-amber-100 text-amber-700 border-amber-200',
          cardBorder: 'border-amber-200',
          label: 'MENUNGGU PERSETUJUAN',
          shortLabel: 'Menunggu',
          icon: <Clock className="w-4 h-4" />,
        };
    }
  };

  const counts = useMemo(
    () => ({
      MENUNGGU: requests.filter(
        (request) => request.status === 'MENUNGGU'
      ).length,
      DISETUJUI: requests.filter(
        (request) => request.status === 'DISETUJUI'
      ).length,
      SEDANG_DICETAK: requests.filter(
        (request) => request.status === 'SEDANG_DICETAK'
      ).length,
      SELESAI: requests.filter(
        (request) => request.status === 'SELESAI'
      ).length,
      DITOLAK: requests.filter(
        (request) => request.status === 'DITOLAK'
      ).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (filter === 'SEMUA') return requests;

    return requests.filter(
      (request) => request.status === filter
    );
  }, [requests, filter]);

  const filters: Array<{
    value: HistoryFilter;
    label: string;
    count?: number;
  }> = [
    {
      value: 'SEMUA',
      label: 'Semua Riwayat',
      count: requests.length,
    },
    {
      value: 'MENUNGGU',
      label: 'Menunggu',
      count: counts.MENUNGGU,
    },
    {
      value: 'DISETUJUI',
      label: 'Disetujui',
      count: counts.DISETUJUI,
    },
    {
      value: 'SEDANG_DICETAK',
      label: 'Diproses',
      count: counts.SEDANG_DICETAK,
    },
    {
      value: 'SELESAI',
      label: 'Selesai',
      count: counts.SELESAI,
    },
    {
      value: 'DITOLAK',
      label: 'Ditolak',
      count: counts.DITOLAK,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 mb-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold mb-3">
              <History className="w-3.5 h-3.5" />
              Riwayat & Status Pengajuan
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold">
              Lacak Status Pengajuan Fotokopi
            </h2>

            <p className="text-sm text-slate-300 mt-2 max-w-3xl">
              Semua pengajuan tetap tersimpan di sini. Guru dapat
              melihat apakah pengajuan masih menunggu, sudah
              disetujui Kepala Sekolah, sedang diproses Resource,
              selesai, atau ditolak.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            Perbarui
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard
          label="Menunggu"
          value={counts.MENUNGGU}
          className="bg-amber-50 border-amber-200 text-amber-800"
        />

        <SummaryCard
          label="Disetujui"
          value={counts.DISETUJUI}
          className="bg-green-50 border-green-200 text-green-800"
        />

        <SummaryCard
          label="Diproses"
          value={counts.SEDANG_DICETAK}
          className="bg-blue-50 border-blue-200 text-blue-800"
        />

        <SummaryCard
          label="Selesai"
          value={counts.SELESAI}
          className="bg-slate-50 border-slate-200 text-slate-800"
        />

        <SummaryCard
          label="Ditolak"
          value={counts.DITOLAK}
          className="bg-red-50 border-red-200 text-red-800"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-5 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                filter === item.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                  filter === item.value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.count ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">
            Memuat riwayat pengajuan...
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900">
            Belum Ada Pengajuan
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Belum ada pengajuan pada status ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const style = getStatusStyle(request.status);

            return (
              <div
                key={request.id}
                className={`bg-white border ${style.cardBorder} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[10px] font-bold ${style.className}`}
                      >
                        {style.icon}
                        {style.label}
                      </span>

                      {request.urgency === 'TINGGI' && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-[10px] font-bold">
                          URGENT
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">
                      {request.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      <strong className="text-slate-700">
                        {request.teacherName}
                      </strong>
                      {' • '}
                      {request.subjectClass}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
                      <span className="font-mono text-blue-700 font-semibold">
                        {request.id}
                      </span>

                      <span>
                        {request.pagesCount} hal ×{' '}
                        {request.copiesCount} salinan
                      </span>

                      <span>{request.totalSheets} lembar</span>

                      <span>
                        Diajukan: {formatDate(request.submittedAt)}
                      </span>
                    </div>

                    {(request.status === 'DISETUJUI' ||
                      request.status === 'SEDANG_DICETAK' ||
                      request.status === 'SELESAI') &&
                      request.reviewedBy && (
                        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <ShieldCheck className="w-4 h-4" />
                          Disetujui oleh {request.reviewedBy}
                          {request.reviewedAt
                            ? ` • ${formatDate(request.reviewedAt)}`
                            : ''}
                        </div>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-xl shadow-2xl border border-slate-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Detail & Bukti Status
                </span>

                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedRequest.title}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {selectedRequest.teacherName}
                  {' • '}
                  {selectedRequest.subjectClass}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {(() => {
                const style = getStatusStyle(
                  selectedRequest.status
                );

                return (
                  <div
                    className={`flex items-center gap-3 p-4 rounded-xl border ${style.className}`}
                  >
                    {style.icon}

                    <div>
                      <div className="text-[10px] font-bold uppercase">
                        Status Saat Ini
                      </div>

                      <div className="text-sm font-bold">
                        {style.label}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-900 text-white rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Tracking ID
                    </div>

                    <div className="font-mono text-xl text-blue-400 font-bold mt-1">
                      {selectedRequest.id}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyTrackingId(selectedRequest.id)
                    }
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedId === selectedRequest.id
                      ? 'Tersalin'
                      : 'Salin Tracking ID'}
                  </button>
                </div>
              </div>

              {(selectedRequest.status === 'DISETUJUI' ||
                selectedRequest.status === 'SEDANG_DICETAK' ||
                selectedRequest.status === 'SELESAI') && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-green-800 mb-3">
                    <ShieldCheck className="w-5 h-5" />

                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">
                        Bukti Persetujuan Kepala Sekolah
                      </div>
                      <div className="text-[11px] text-green-700">
                        Dapat ditunjukkan kepada Tim Resource.
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <ProofItem
                      label="Status Persetujuan"
                      value="DISETUJUI"
                    />

                    <ProofItem
                      label="Tracking ID"
                      value={selectedRequest.id}
                    />

                    <ProofItem
                      label="Disetujui Oleh"
                      value={
                        selectedRequest.reviewedBy ||
                        'Kepala Sekolah'
                      }
                    />

                    <ProofItem
                      label="Tanggal Persetujuan"
                      value={formatDate(
                        selectedRequest.reviewedAt
                      )}
                    />
                  </div>

                  {selectedRequest.approvalNotes && (
                    <div className="mt-3 bg-white/70 border border-green-200 rounded-lg p-3">
                      <div className="text-[10px] font-bold uppercase text-green-700">
                        Catatan Persetujuan
                      </div>
                      <div className="text-xs text-green-900 mt-1">
                        {selectedRequest.approvalNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <DetailItem
                  icon={<FileText className="w-4 h-4" />}
                  label="Jumlah Cetak"
                  value={`${selectedRequest.pagesCount} halaman × ${selectedRequest.copiesCount} salinan`}
                />

                <DetailItem
                  icon={<Calculator className="w-4 h-4" />}
                  label="Total Kertas"
                  value={`${selectedRequest.totalSheets} lembar`}
                />

                <DetailItem
                  icon={<Calendar className="w-4 h-4" />}
                  label="Tanggal Diperlukan"
                  value={formatTargetDate(
                    selectedRequest.targetDate
                  )}
                />

                <DetailItem
                  icon={<FileText className="w-4 h-4" />}
                  label="Spesifikasi"
                  value={`${selectedRequest.paperSize} • ${
                    selectedRequest.colorOption === 'COLOR'
                      ? 'Berwarna'
                      : 'Hitam Putih'
                  } • ${
                    selectedRequest.printSide === 'DOUBLE'
                      ? '2 Sisi'
                      : '1 Sisi'
                  }`}
                />
              </div>

              {selectedRequest.status === 'SEDANG_DICETAK' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
                  <div className="font-bold flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Sedang Diproses Resource
                  </div>

                  {selectedRequest.printedBy && (
                    <p className="mt-1">
                      Diproses oleh:{' '}
                      <strong>
                        {selectedRequest.printedBy}
                      </strong>
                    </p>
                  )}

                  {selectedRequest.printedAt && (
                    <p className="mt-1">
                      Mulai proses:{' '}
                      {formatDate(selectedRequest.printedAt)}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'SELESAI' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Fotokopi Selesai
                  </div>

                  {selectedRequest.completedAt && (
                    <p className="mt-1">
                      Selesai pada:{' '}
                      {formatDate(selectedRequest.completedAt)}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'DITOLAK' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900">
                  <div className="font-bold mb-1">
                    Pengajuan Ditolak
                  </div>

                  {selectedRequest.reviewedBy && (
                    <p className="mb-1">
                      Keputusan oleh:{' '}
                      <strong>
                        {selectedRequest.reviewedBy}
                      </strong>
                    </p>
                  )}

                  <p>
                    {selectedRequest.rejectionReason ||
                      'Tidak ada keterangan tambahan.'}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
              >
                Tutup
              </button>
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
  className: string;
}> = ({ label, value, className }) => (
  <div
    className={`rounded-xl border p-4 shadow-sm ${className}`}
  >
    <div className="text-[10px] uppercase tracking-wide font-bold">
      {label}
    </div>

    <div className="text-2xl font-extrabold mt-1">
      {value}
    </div>
  </div>
);

const DetailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
    <div className="text-blue-600 mb-2">
      {icon}
    </div>

    <div className="text-[10px] text-slate-500">
      {label}
    </div>

    <div className="text-xs font-bold text-slate-900 mt-0.5">
      {value}
    </div>
  </div>
);

const ProofItem: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="bg-white/70 border border-green-200 rounded-lg p-3">
    <div className="text-[10px] font-bold uppercase text-green-700">
      {label}
    </div>

    <div className="text-xs font-bold text-green-950 mt-1 break-words">
      {value}
    </div>
  </div>
);
