import React, { useState, useEffect } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import { Search, Clock, CheckCircle2, XCircle, Printer, FileText, Calendar, ArrowRight, ShieldAlert, Sparkles, RefreshCw, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { DigitalProofModal } from './DigitalProofModal';

interface TrackerProps {
  initialTrackingCode?: string;
}

export const StatusTracker: React.FC<TrackerProps> = ({ initialTrackingCode = '' }) => {
  const [searchCode, setSearchCode] = useState(initialTrackingCode);
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState<PhotocopyRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [recentRequests, setRecentRequests] = useState<PhotocopyRequest[]>([]);

  useEffect(() => {
    fetchRecentRequests();
    if (initialTrackingCode) {
      handleSearchCode(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  const fetchRecentRequests = async () => {
    try {
      const res = await fetch('/api/requests');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecentRequests(json.data.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching recent requests:', err);
    }
  };

  const handleSearchCode = async (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Masukkan kode pelacakan (misal: REQ-2026-0811-001)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setRequestData(null);

    try {
      const res = await fetch(`/api/requests/${code}`);
      const json = await res.json();

      if (json.success && json.data) {
        setRequestData(json.data);
      } else {
        setErrorMsg(json.message || `Kode pengajuan "${code}" tidak ditemukan. Pastikan format kode benar.`);
      }
    } catch (err) {
      console.error('Error searching request:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat mencari data.');
    } finally {
      setLoading(false);
    }
  };

  const getStepState = (req: PhotocopyRequest, stepIndex: number) => {
    // Steps: 0: Submitted, 1: Reviewed, 2: Approved/Rejected, 3: Printing, 4: Completed
    if (req.status === 'DITOLAK') {
      if (stepIndex === 0) return 'COMPLETED';
      if (stepIndex === 1) return 'REJECTED';
      return 'DISABLED';
    }

    if (req.status === 'MENUNGGU') {
      if (stepIndex === 0) return 'COMPLETED';
      if (stepIndex === 1) return 'CURRENT';
      return 'DISABLED';
    }

    if (req.status === 'DISETUJUI') {
      if (stepIndex <= 2) return 'COMPLETED';
      if (stepIndex === 3) return 'CURRENT';
      return 'DISABLED';
    }

    if (req.status === 'SEDANG_DICETAK') {
      if (stepIndex <= 3) return 'COMPLETED';
      if (stepIndex === 4) return 'CURRENT';
      return 'DISABLED';
    }

    if (req.status === 'SELESAI') {
      return 'COMPLETED';
    }

    return 'DISABLED';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-sm border border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <Search className="w-3.5 h-3.5" />
            <span>Sistem Pelacakan Publik</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Lacak Status Pengajuan Fotokopi
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">
            Masukkan Kode Pelacakan (Tracking ID) pengajuan Anda untuk melihat persetujuan Kepala Sekolah dan proses pencetakan.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchCode(searchCode);
            }}
            className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Masukkan Kode (misal: REQ-2026-0811-001)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full px-4 py-3 pl-11 text-xs bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider placeholder-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Lacak Status</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Select Buttons from recent requests */}
          {recentRequests.length > 0 && (
            <div className="mt-5 text-left bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <div className="text-[11px] text-slate-400 font-bold mb-2">
                Pilih Cepat Pengajuan Terbaru:
              </div>
              <div className="flex flex-wrap gap-2">
                {recentRequests.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSearchCode(r.id);
                      handleSearchCode(r.id);
                    }}
                    className={`text-xs px-2.5 py-1 rounded border font-mono transition-all flex items-center gap-1.5 ${
                      requestData?.id === r.id
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    <span>{r.id}</span>
                    <span className="text-[10px] font-sans opacity-70">({r.teacherName.split(' ')[0]})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-3 text-xs font-semibold">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Request Details View */}
      {requestData && (
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-fadeIn">
          
          {/* Header Status Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">TRACKING ID:</span>
                <span className="font-mono font-bold text-base text-slate-900">{requestData.id}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{requestData.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaju: <strong className="text-slate-800">{requestData.teacherName}</strong> ({requestData.subjectClass})
              </p>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {requestData.status === 'MENUNGGU' && (
                <div className="px-3.5 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Menunggu Persetujuan Kepsek</span>
                </div>
              )}

              {requestData.status === 'DISETUJUI' && (
                <div className="px-3.5 py-1.5 bg-green-100 text-green-800 border border-green-200 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Disetujui Kepala Sekolah</span>
                </div>
              )}

              {requestData.status === 'DITOLAK' && (
                <div className="px-3.5 py-1.5 bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Ditolak Kepala Sekolah</span>
                </div>
              )}

              {requestData.status === 'SEDANG_DICETAK' && (
                <div className="px-3.5 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <Printer className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span>Sedang Dicetak Tim Resource</span>
                </div>
              )}

              {requestData.status === 'SELESAI' && (
                <div className="px-3.5 py-1.5 bg-slate-200 text-slate-900 border border-slate-300 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-slate-700" />
                  <span>Selesai & Siap Diambil</span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Alert Box (REQUIRED IF REJECTED) */}
          {requestData.status === 'DITOLAK' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">
              <div className="flex items-center gap-2 font-bold text-xs mb-2 text-red-800">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Pengajuan Ditolak oleh Kepala Sekolah</span>
              </div>
              <p className="text-xs text-red-700 bg-white p-3 rounded-lg border border-red-200 font-medium leading-relaxed">
                "{requestData.rejectionReason || 'Tidak ada alasan khusus yang dicantumkan.'}"
              </p>
              <div className="mt-2 text-[11px] text-red-600 flex items-center justify-between">
                <span>Ditinjau oleh: {requestData.reviewedBy || 'Kepala Sekolah'}</span>
                <span>{requestData.reviewedAt ? new Date(requestData.reviewedAt).toLocaleString('id-ID') : ''}</span>
              </div>
            </div>
          )}

          {/* Approval Proof Ticket Download Banner */}
          {(requestData.status === 'DISETUJUI' || requestData.status === 'SEDANG_DICETAK' || requestData.status === 'SELESAI') && (
            <div className="bg-slate-900 text-white rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Bukti Digital Persetujuan Resmi Tersedia</span>
                </div>
                <p className="text-xs text-slate-300">
                  Tunjukkan bukti digital ini ke Tim Resource/Percetakan saat mengambil atau menyerahkan file.
                </p>
              </div>

              <button
                onClick={() => setShowProofModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Lihat & Cetak Bukti Digital</span>
              </button>
            </div>
          )}

          {/* Timeline Step Progress */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              ALUR & STATUS PERSETUJUAN KEPALA SEKOLAH
            </h4>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
              
              {/* Step 1: Submitted */}
              <div className="relative">
                <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">1. Pengajuan Dikirim Guru</div>
                  <div className="text-xs text-slate-500">
                    Formulir diterima oleh sistem pada{' '}
                    {new Date(requestData.submittedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              {/* Step 2: Kepsek Final Decision */}
              <div className="relative">
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    requestData.status === 'MENUNGGU'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : requestData.status === 'DITOLAK'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {requestData.status === 'DITOLAK' ? '✕' : requestData.status === 'MENUNGGU' ? '•' : '✓'}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    2. Keputusan Kepala Sekolah (Final)
                  </div>
                  <div className="text-xs text-slate-500">
                    {requestData.status === 'MENUNGGU' && (
                      <span className="text-amber-700 font-medium">
                        Sedang dalam proses evaluasi kuota & peninjauan oleh Dini Rahmadani / Sari Kusuma Dewi (Kepala Sekolah).
                      </span>
                    )}
                    {requestData.status === 'DITOLAK' && (
                      <span className="text-red-600 font-medium">
                        Pengajuan ditolak oleh {requestData.reviewedBy || 'Kepala Sekolah'}. Lihat alasan penolakan di atas.
                      </span>
                    )}
                    {(requestData.status === 'DISETUJUI' || requestData.status === 'SEDANG_DICETAK' || requestData.status === 'SELESAI') && (
                      <span className="text-green-700 font-medium">
                        Disetujui (OKE) oleh {requestData.reviewedBy || 'Kepala Sekolah'}. Bukti persetujuan resmi siap diunduh.
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Rincian Spesifikasi Box */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              RINCIAN DOKUMEN & CETAK
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-slate-400">File Dokumen:</div>
                <div className="font-semibold text-slate-800 truncate">{requestData.fileName}</div>
              </div>
              <div>
                <div className="text-slate-400">Jumlah Cetak:</div>
                <div className="font-semibold text-slate-800">
                  {requestData.pagesCount} hal × {requestData.copiesCount} salinan
                </div>
              </div>
              <div>
                <div className="text-slate-400">Total HVS:</div>
                <div className="font-bold text-blue-700">{requestData.totalSheets} Lembar</div>
              </div>
              <div>
                <div className="text-slate-400">Format:</div>
                <div className="font-semibold text-slate-800">
                  {requestData.paperSize} ({requestData.printSide === 'DOUBLE' ? '2 Sisi' : '1 Sisi'})
                </div>
              </div>
            </div>
            {requestData.fileUrl && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3 text-xs bg-blue-50/80 p-2.5 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 truncate">
                  <LinkIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-blue-900 truncate">Link Dokumen Online:</span>
                  <span className="font-mono text-blue-700 truncate">{requestData.fileUrl}</span>
                </div>
                <a
                  href={requestData.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                >
                  <span>Buka Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {requestData.notes && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                <strong>Catatan Guru:</strong> {requestData.notes}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Digital Proof Modal */}
      {showProofModal && requestData && (
        <DigitalProofModal request={requestData} onClose={() => setShowProofModal(false)} />
      )}
    </div>
  );
};
