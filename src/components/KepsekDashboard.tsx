import React, { useState, useEffect } from 'react';
import { PhotocopyRequest, RequestStatus } from '../types';
import { ShieldCheck, CheckCircle2, XCircle, Clock, Search, Filter, Eye, AlertCircle, FileText, Calendar, Calculator, Check, X, RefreshCw, Sparkles, MessageSquare, ExternalLink, Folder, Link as LinkIcon } from 'lucide-react';
import { DigitalProofModal } from './DigitalProofModal';

interface KepsekDashboardProps {
  reviewerName: string;
  onRequestUpdated: () => void;
}

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({ reviewerName, onRequestUpdated }) => {
  const [requests, setRequests] = useState<PhotocopyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('MENUNGGU');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<PhotocopyRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Proof Ticket Modal state
  const [proofRequest, setProofRequest] = useState<PhotocopyRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedRequest) return;
    setActionError('');

    if (action === 'REJECT' && !rejectionReason.trim()) {
      setActionError('Alasan penolakan wajib diisi agar guru mengetahui penyebabnya.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        action,
        reviewerName,
        notes: approvalNotes,
        rejectionReason,
      };

      const res = await fetch(`/api/requests/${selectedRequest.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success && json.data) {
        // Refresh local state & notify parent
        fetchRequests();
        onRequestUpdated();
        setSelectedRequest(null);
        setApprovalNotes('');
        setRejectionReason('');
      } else {
        setActionError(json.message || 'Gagal memproses keputusan.');
      }
    } catch (err) {
      console.error('Review error:', err);
      setActionError('Terjadi kesalahan koneksi saat memproses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const pendingCount = requests.filter((r) => r.status === 'MENUNGGU').length;
  const approvedCount = requests.filter((r) => r.status === 'DISETUJUI' || r.status === 'SEDANG_DICETAK' || r.status === 'SELESAI').length;
  const rejectedCount = requests.filter((r) => r.status === 'DITOLAK').length;
  const totalSheetsApproved = requests
    .filter((r) => r.status !== 'DITOLAK')
    .reduce((acc, r) => acc + (r.totalSheets || 0), 0);

  // Filtered requests list
  const filteredRequests = requests.filter((r) => {
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'MENUNGGU' && r.status === 'MENUNGGU') ||
      (selectedStatus === 'DISETUJUI' && (r.status === 'DISETUJUI' || r.status === 'SEDANG_DICETAK' || r.status === 'SELESAI')) ||
      (selectedStatus === 'DITOLAK' && r.status === 'DITOLAK');

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.id.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.subjectClass.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Banner Portal Kepsek */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Otomatisasi Kepala Sekolah</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Dashboard Peninjauan & Persetujuan Cetak
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Selamat datang, <strong className="text-blue-400 font-bold">{reviewerName}</strong>. Evaluasi dan berikan persetujuan untuk pengajuan materi fotokopi guru.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-2 shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus('MENUNGGU')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'MENUNGGU'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">MENUNGGU REVIEW</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-900">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">Pengajuan perlu keputusan Anda</div>
        </div>

        <div
          onClick={() => setSelectedStatus('DISETUJUI')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'DISETUJUI'
              ? 'bg-green-50/90 border-green-300 ring-2 ring-green-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-green-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">DISETUJUI (ACC)</span>
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-900">{approvedCount}</div>
          <div className="text-[11px] text-green-700 mt-1 font-medium">Disetujui untuk dicetak</div>
        </div>

        <div
          onClick={() => setSelectedStatus('DITOLAK')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'DITOLAK'
              ? 'bg-red-50/90 border-red-300 ring-2 ring-red-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">DITOLAK</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-red-900">{rejectedCount}</div>
          <div className="text-[11px] text-red-700 mt-1 font-medium">Disertai alasan penolakan</div>
        </div>

        <div className="p-5 bg-slate-900 text-white rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">TOTAL HVS ACC</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-400">{totalSheetsApproved}</div>
          <div className="text-[11px] text-slate-400 mt-1">Lembar kertas disetujui</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedStatus('MENUNGGU')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              selectedStatus === 'MENUNGGU'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Menunggu Review</span>
            {pendingCount > 0 && (
              <span className="bg-slate-950 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedStatus('DISETUJUI')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
              selectedStatus === 'DISETUJUI'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disetujui ({approvedCount})
          </button>

          <button
            onClick={() => setSelectedStatus('DITOLAK')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
              selectedStatus === 'DITOLAK'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ditolak ({rejectedCount})
          </button>

          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Data ({requests.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari guru, judul, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-semibold">Memuat daftar pengajuan...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Tidak ada pengajuan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba ganti filter status atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Tracking ID & Waktu</th>
                  <th className="py-3.5 px-4">Nama Guru & Mapel</th>
                  <th className="py-3.5 px-4">Judul Bahan Ajar</th>
                  <th className="py-3.5 px-4">Spec Cetak</th>
                  <th className="py-3.5 px-4 text-center">Total HVS</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <div className="font-bold text-slate-900">{req.id}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{req.teacherName}</div>
                      <div className="text-[11px] text-slate-500">{req.subjectClass}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={req.title}>
                        {req.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{req.fileName}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {req.pagesCount} hal × {req.copiesCount} salinan
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {req.paperSize} | {req.colorOption === 'COLOR' ? 'Color' : 'B/W'} |{' '}
                        {req.printSide === 'DOUBLE' ? '2 Sisi' : '1 Sisi'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {req.totalSheets}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {req.status === 'MENUNGGU' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          MENUNGGU
                        </span>
                      )}

                      {req.status === 'DISETUJUI' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          DISETUJUI
                        </span>
                      )}

                      {req.status === 'SEDANG_DICETAK' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded inline-flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                          DICETAK
                        </span>
                      )}

                      {req.status === 'SELESAI' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-700" />
                          SELESAI
                        </span>
                      )}

                      {req.status === 'DITOLAK' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-600" />
                          DITOLAK
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setApprovalNotes(req.approvalNotes || '');
                            setRejectionReason(req.rejectionReason || '');
                            setActionError('');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tinjau</span>
                        </button>

                        {(req.status === 'DISETUJUI' || req.status === 'SEDANG_DICETAK' || req.status === 'SELESAI') && (
                          <button
                            onClick={() => setProofRequest(req)}
                            title="Lihat Bukti Digital"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 animate-scaleUp">
            
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold font-mono text-blue-600 uppercase tracking-widest">
                  PENINJAUAN KEPALA SEKOLAH
                </span>
                <h3 className="text-xl font-bold text-slate-900">{selectedRequest.title}</h3>
                <p className="text-xs text-slate-500">
                  Pengaju: <strong>{selectedRequest.teacherName}</strong> ({selectedRequest.subjectClass})
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="py-4 space-y-4">
              
              {/* Document Overview Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Nama File:</span>
                  <span className="font-semibold text-slate-900 truncate block">{selectedRequest.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Halaman x Salinan:</span>
                  <span className="font-bold text-slate-900">{selectedRequest.pagesCount} hal × {selectedRequest.copiesCount} salinan</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Estimasi Kertas:</span>
                  <span className="font-bold text-blue-700">{selectedRequest.totalSheets} Lembar HVS</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Format:</span>
                  <span className="font-semibold text-slate-900">{selectedRequest.paperSize} | {selectedRequest.colorOption} | {selectedRequest.printSide}</span>
                </div>
              </div>

              {/* Direct Link URL Box if available */}
              {selectedRequest.fileUrl && (
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-200">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5">
                        <span>Tautan Link Dokumen Bahan Ajar</span>
                        <span className="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold">ONLINE LINK</span>
                      </div>
                      <div className="text-[11px] text-blue-700 font-mono truncate">{selectedRequest.fileUrl}</div>
                    </div>
                  </div>
                  <a
                    href={selectedRequest.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <span>Buka Link Dokumen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Drive Repository Button */}
              <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate text-slate-300">Repository Drive Bahan Ajar Lazuardi:</span>
                </div>
                <a
                  href={selectedRequest.driveFolderUrl || 'https://drive.google.com/drive/folders/1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN?usp=drive_link'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span>Buka Drive Folder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {selectedRequest.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900">
                  <strong>Catatan dari Guru:</strong> "{selectedRequest.notes}"
                </div>
              )}

              {/* Action Error */}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Approval Notes Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Persetujuan (Opsional jika Disetujui):
                </label>
                <input
                  type="text"
                  placeholder="misal: ACC. Silakan dicetak oleh Tim Resource Center."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rejection Reason Input (REQUIRED FOR REJECT) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-red-500 font-normal">(Wajib diisi jika menolak)</span>:
                </label>
                <textarea
                  rows={2}
                  placeholder="misal: Jumlah salinan 100 eksemplar melebihi batas kuota harian. Mohon kurangi menjadi 30 eksemplar."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                ></textarea>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReviewAction('REJECT')}
                className="w-full sm:w-auto px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak Pengajuan</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReviewAction('APPROVE')}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui (ACC)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Proof Ticket Modal */}
      {proofRequest && (
        <DigitalProofModal request={proofRequest} onClose={() => setProofRequest(null)} />
      )}
    </div>
  );
};
