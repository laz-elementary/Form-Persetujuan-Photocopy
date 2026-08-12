import React, { useEffect, useState } from 'react';
import { PhotocopyRequest } from '../types';
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
} from 'lucide-react';

interface StatusTrackerProps {
  initialTrackingCode?: string;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({
  initialTrackingCode = '',
}) => {
  const [pendingRequests, setPendingRequests] = useState<
    PhotocopyRequest[]
  >([]);

  const [selectedRequest, setSelectedRequest] =
    useState<PhotocopyRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // =====================================================
  // MAPPING DATA PENDING
  // =====================================================

  const mapPendingRequest = (row: any): PhotocopyRequest => ({
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
  });

  // =====================================================
  // LOAD SEMUA PENGAJUAN MENUNGGU
  // =====================================================

  const fetchPendingRequests = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc(
        'list_pending_photocopy_requests'
      );

      if (error) {
        console.error(
          'Load pending requests error:',
          error
        );

        throw error;
      }

      const mapped = (data || []).map(
        mapPendingRequest
      );

      setPendingRequests(mapped);
    } catch (err: any) {
      console.error(
        'Error loading pending:',
        err
      );

      setErrorMsg(
        err?.message ||
          'Gagal memuat daftar pengajuan.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD DETAIL BERDASARKAN TRACKING ID
  // =====================================================

  const loadRequestDetail = async (
    trackingCode: string
  ) => {
    if (!trackingCode) return;

    setDetailLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc(
        'track_photocopy_request',
        {
          p_tracking_code:
            trackingCode.trim().toUpperCase(),
        }
      );

      if (error) {
        console.error(
          'Tracking detail error:',
          error
        );

        throw error;
      }

      if (!data || data.length === 0) {
        setErrorMsg(
          'Pengajuan tidak ditemukan.'
        );
        return;
      }

      const row = data[0];

      const request: PhotocopyRequest = {
        id: row.id,

        teacherName:
          row.teacher_name,

        subjectClass:
          row.subject_class,

        title:
          row.title,

        fileName:
          'Dokumen bahan ajar',

        fileSize: '',
        fileType: '',

        pagesCount:
          row.pages_count,

        copiesCount:
          row.copies_count,

        totalSheets:
          row.total_sheets,

        paperSize:
          row.paper_size,

        colorOption:
          row.color_option,

        printSide:
          row.print_side,

        urgency:
          row.urgency,

        targetDate:
          row.target_date,

        status:
          row.status,

        submittedAt:
          row.submitted_at,

        reviewedAt:
          row.reviewed_at || undefined,

        reviewedBy:
          row.reviewed_by || undefined,

        rejectionReason:
          row.rejection_reason || undefined,

        approvalNotes:
          row.approval_notes || undefined,

        printedAt:
          row.printed_at || undefined,

        printedBy:
          row.printed_by || undefined,

        completedAt:
          row.completed_at || undefined,
      };

      setSelectedRequest(request);
    } catch (err: any) {
      console.error(
        'Error loading detail:',
        err
      );

      setErrorMsg(
        err?.message ||
          'Gagal membuka detail pengajuan.'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchPendingRequests();

    // Kalau user baru selesai submit form,
    // otomatis buka detail pengajuannya.
    if (initialTrackingCode) {
      loadRequestDetail(
        initialTrackingCode
      );
    }
  }, [initialTrackingCode]);

  // =====================================================
  // FORMAT TANGGAL
  // =====================================================

  const formatDate = (
    value?: string
  ) => {
    if (!value) return '-';

    return new Date(value).toLocaleString(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  };

  const formatTargetDate = (
    value?: string
  ) => {
    if (!value) return '-';

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      'id-ID',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (
    status: string
  ) => {
    switch (status) {
      case 'DISETUJUI':
        return {
          className:
            'bg-green-100 text-green-700 border-green-200',
          label: 'DISETUJUI',
          icon: (
            <CheckCircle2 className="w-4 h-4" />
          ),
        };

      case 'DITOLAK':
        return {
          className:
            'bg-red-100 text-red-700 border-red-200',
          label: 'DITOLAK',
          icon: (
            <XCircle className="w-4 h-4" />
          ),
        };

      case 'SEDANG_DICETAK':
        return {
          className:
            'bg-blue-100 text-blue-700 border-blue-200',
          label: 'SEDANG DICETAK',
          icon: (
            <Printer className="w-4 h-4" />
          ),
        };

      case 'SELESAI':
        return {
          className:
            'bg-slate-200 text-slate-700 border-slate-300',
          label: 'SELESAI',
          icon: (
            <CheckCircle2 className="w-4 h-4" />
          ),
        };

      default:
        return {
          className:
            'bg-amber-100 text-amber-700 border-amber-200',
          label:
            'MENUNGGU PERSETUJUAN',
          icon: (
            <Clock className="w-4 h-4" />
          ),
        };
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* HEADER */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 mb-6 border border-slate-800 shadow-sm">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-3">
              <Clock className="w-3.5 h-3.5" />
              Pengajuan Menunggu
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold">
              Lacak Status Pengajuan Fotokopi
            </h2>

            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Daftar di bawah menampilkan pengajuan yang masih menunggu persetujuan Kepala Sekolah.
            </p>
          </div>

          <button
            type="button"
            onClick={
              fetchPendingRequests
            }
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Perbarui
          </button>

        </div>
      </div>

      {/* ERROR */}
      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm flex items-center gap-3">

          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />

          <span>
            {errorMsg}
          </span>

        </div>
      )}

      {/* SUMMARY */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">
              Menunggu Persetujuan
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Pengajuan yang belum mendapat keputusan Kepala Sekolah
            </p>
          </div>

          <div className="w-14 h-14 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-2xl font-bold">
            {pendingRequests.length}
          </div>

        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">

          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />

          <p className="text-sm font-semibold text-slate-600">
            Memuat pengajuan...
          </p>

        </div>
      ) : pendingRequests.length ===
        0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">

          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />

          <h3 className="font-bold text-slate-900">
            Tidak Ada Pengajuan Menunggu
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Semua pengajuan sudah ditinjau atau belum ada pengajuan baru.
          </p>

        </div>
      ) : (
        <div className="space-y-3">

          {pendingRequests.map(
            (request) => (
              <div
                key={request.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                  <div className="flex-1 min-w-0">

                    <div className="flex flex-wrap items-center gap-2 mb-2">

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3" />
                        MENUNGGU PERSETUJUAN
                      </span>

                      {request.urgency ===
                        'TINGGI' && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-[10px] font-bold">
                          URGENT
                        </span>
                      )}

                    </div>

                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {request.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      <strong className="text-slate-700">
                        {
                          request.teacherName
                        }
                      </strong>
                      {' • '}
                      {
                        request.subjectClass
                      }
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">

                      <span className="font-mono text-blue-700 font-semibold">
                        {request.id}
                      </span>

                      <span>
                        {
                          request.pagesCount
                        }{' '}
                        hal ×{' '}
                        {
                          request.copiesCount
                        }{' '}
                        salinan
                      </span>

                      <span>
                        {
                          request.totalSheets
                        }{' '}
                        lembar
                      </span>

                      <span>
                        Diajukan:{' '}
                        {formatDate(
                          request.submittedAt
                        )}
                      </span>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadRequestDetail(
                        request.id
                      )
                    }
                    disabled={detailLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat Detail
                  </button>

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

          <div className="bg-white max-w-xl w-full rounded-xl shadow-2xl border border-slate-200 my-8">

            {/* MODAL HEADER */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">

              <div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Detail Pengajuan
                </span>

                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {
                    selectedRequest.title
                  }
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {
                    selectedRequest.teacherName
                  }
                  {' • '}
                  {
                    selectedRequest.subjectClass
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>

            </div>

            <div className="p-6 space-y-5">

              {/* STATUS */}
              {(() => {
                const style =
                  getStatusStyle(
                    selectedRequest.status
                  );

                return (
                  <div
                    className={`flex items-center gap-2 p-4 rounded-xl border ${style.className}`}
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

              {/* TRACKING */}
              <div className="bg-slate-900 text-white rounded-xl p-4 text-center">

                <div className="text-[10px] uppercase text-slate-400 font-bold">
                  Tracking ID
                </div>

                <div className="font-mono text-lg text-blue-400 font-bold mt-1">
                  {
                    selectedRequest.id
                  }
                </div>

              </div>

              {/* DETAILS */}
              <div className="grid grid-cols-2 gap-3">

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">

                  <FileText className="w-4 h-4 text-blue-600 mb-2" />

                  <div className="text-[10px] text-slate-500">
                    Jumlah Cetak
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {
                      selectedRequest.pagesCount
                    }{' '}
                    halaman ×{' '}
                    {
                      selectedRequest.copiesCount
                    }{' '}
                    salinan
                  </div>

                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">

                  <Calculator className="w-4 h-4 text-blue-600 mb-2" />

                  <div className="text-[10px] text-slate-500">
                    Total Kertas
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {
                      selectedRequest.totalSheets
                    }{' '}
                    lembar
                  </div>

                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">

                  <Calendar className="w-4 h-4 text-blue-600 mb-2" />

                  <div className="text-[10px] text-slate-500">
                    Tanggal Diperlukan
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {formatTargetDate(
                      selectedRequest.targetDate
                    )}
                  </div>

                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">

                  <FileText className="w-4 h-4 text-blue-600 mb-2" />

                  <div className="text-[10px] text-slate-500">
                    Spesifikasi
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {
                      selectedRequest.paperSize
                    }{' '}
                    •{' '}
                    {selectedRequest.colorOption ===
                    'COLOR'
                      ? 'Berwarna'
                      : 'Hitam Putih'}{' '}
                    •{' '}
                    {selectedRequest.printSide ===
                    'DOUBLE'
                      ? '2 Sisi'
                      : '1 Sisi'}
                  </div>

                </div>

              </div>

              {/* REVIEW INFO */}
              {selectedRequest.status ===
                'DISETUJUI' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-900">

                  <div className="font-bold mb-1">
                    Pengajuan Disetujui
                  </div>

                  {selectedRequest.reviewedBy && (
                    <p>
                      Disetujui oleh:{' '}
                      <strong>
                        {
                          selectedRequest.reviewedBy
                        }
                      </strong>
                    </p>
                  )}

                  {selectedRequest.approvalNotes && (
                    <p className="mt-1">
                      Catatan:{' '}
                      {
                        selectedRequest.approvalNotes
                      }
                    </p>
                  )}

                </div>
              )}

              {selectedRequest.status ===
                'DITOLAK' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900">

                  <div className="font-bold mb-1">
                    Pengajuan Ditolak
                  </div>

                  <p>
                    {
                      selectedRequest.rejectionReason ||
                      'Tidak ada keterangan tambahan.'
                    }
                  </p>

                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
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
