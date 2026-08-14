import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  FileText,
  Eye,
  ExternalLink,
  AlertCircle,
  X,
  Printer,
  Play,
  History,
  ShieldCheck,
} from 'lucide-react';

type ResourceFilter =
  | 'ALL'
  | 'DISETUJUI'
  | 'SEDANG_DICETAK'
  | 'SELESAI'
  | 'DITOLAK';

export const AdminResource: React.FC = () => {
  const [requests, setRequests] = useState<PhotocopyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<ResourceFilter>('ALL');
  const [selectedRequest, setSelectedRequest] =
    useState<PhotocopyRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [openingFile, setOpeningFile] = useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);
  const [msg, setMsg] = useState('');

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

      setRequests((data || []).map(mapRequest));
    } catch (err: any) {
      console.error('Resource load error:', err);
      setErrorMsg(
        err?.message ||
          'Gagal memuat data pengajuan untuk tim Resource.'
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

  const rejectedCount = requests.filter(
    (r) => r.status === 'DITOLAK'
  ).length;

  const approvedSheets = requests
  .filter(
    (r) =>
      r.status === 'DISETUJUI' ||
      r.status === 'SEDANG_DICETAK'
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      const matchesStatus =
        selectedStatus === 'ALL' || r.status === selectedStatus;

      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        (r.teacherEmail || '').toLowerCase().includes(q) ||
        r.subjectClass.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, selectedStatus]);

  const updatePrintStatus = async (
    request: PhotocopyRequest,
    newStatus: 'SEDANG_DICETAK' | 'SELESAI'
  ) => {
    const confirmation =
      newStatus === 'SEDANG_DICETAK'
        ? `Mulai proses fotokopi "${request.title}"?`
        : `Tandai "${request.title}" sebagai selesai dicetak?`;

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

      if (newStatus === 'SEDANG_DICETAK') {
        setMsg(`${request.id} sekarang sedang diproses oleh Resource.`);
        setSelectedStatus('SEDANG_DICETAK');
      } else {
        setMsg(`${request.id} selesai dicetak dan masuk Riwayat Fotokopi.`);
        setSelectedStatus('SELESAI');
      }

      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      console.error('Resource update error:', err);
      setErrorMsg(
        err?.message ||
          'Gagal memperbarui status pencetakan.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDocument = async (
    request: PhotocopyRequest
  ) => {
    if (request.status === 'DITOLAK') {
      setErrorMsg(
        'Dokumen yang ditolak tidak masuk proses fotokopi Resource.'
      );
      return;
    }

    if (!request.fileUrl) {
      setErrorMsg('Dokumen tidak tersedia.');
      return;
    }

    setOpeningFile(true);
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
      console.error('Open resource document error:', err);
      setErrorMsg(
        err?.message || 'Gagal membuka dokumen.'
      );
    } finally {
      setOpeningFile(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'DISETUJUI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          SIAP DIPROSES
        </span>
      );
    }

    if (status === 'SEDANG_DICETAK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold">
          <Printer className="w-3 h-3" />
          SEDANG DICETAK
        </span>
      );
    }

    if (status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold">
          <History className="w-3 h-3" />
          PERNAH DIFOTOKOPI
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-200 text-red-700 rounded-lg text-[10px] font-bold">
        <XCircle className="w-3 h-3" />
        DITOLAK
      </span>
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Admin Resource</span>
          </div>

          <h2 className="text-2xl font-bold">
            Data Keputusan Pengajuan Fotokopi
          </h2>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Tim Resource hanya melihat pengajuan yang telah
            mendapat keputusan Kepala Sekolah. Pengajuan yang
            masih menunggu tidak ditampilkan di halaman ini.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Muat Ulang
        </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatus('DISETUJUI')}
          className="text-left bg-green-50 border border-green-200 rounded-xl p-5"
        >
          <div className="text-xs font-bold text-green-700 uppercase">
            Siap Diproses
          </div>
          <div className="text-3xl font-bold text-green-900 mt-2">
            {approvedCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('SEDANG_DICETAK')}
          className="text-left bg-blue-50 border border-blue-200 rounded-xl p-5"
        >
          <div className="text-xs font-bold text-blue-700 uppercase">
            Sedang Dicetak
          </div>
          <div className="text-3xl font-bold text-blue-900 mt-2">
            {printingCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('SELESAI')}
          className="text-left bg-slate-50 border border-slate-200 rounded-xl p-5"
        >
          <div className="text-xs font-bold text-slate-600 uppercase">
            Riwayat Fotokopi
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {completedCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('DITOLAK')}
          className="text-left bg-red-50 border border-red-200 rounded-xl p-5"
        >
          <div className="text-xs font-bold text-red-700 uppercase">
            Ditolak
          </div>
          <div className="text-3xl font-bold text-red-900 mt-2">
            {rejectedCount}
          </div>
        </button>

        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase">
            HVS Antrean
          </div>
          <div className="text-3xl font-bold text-indigo-300 mt-2">
            {approvedSheets}
          </div>
          <div className="text-[10px] text-slate-400">
            lembar
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama guru, kelas, judul, email, atau tracking ID..."
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              ['ALL', 'Semua'],
              ['DISETUJUI', 'Siap Diproses'],
              ['SEDANG_DICETAK', 'Sedang Dicetak'],
              ['SELESAI', 'Riwayat'],
              ['DITOLAK', 'Ditolak'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedStatus(value)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                selectedStatus === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Memuat data Resource...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800">
              Belum Ada Data
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Belum ada pengajuan yang sesuai dengan filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-bold">
                    Pengajuan
                  </th>
                  <th className="px-4 py-3 font-bold">
                    Guru / Kelas
                  </th>
                  <th className="px-4 py-3 font-bold">
                    Kebutuhan
                  </th>
                  <th className="px-4 py-3 font-bold">
                    Keputusan
                  </th>
                  <th className="px-4 py-3 font-bold text-center">
                    Detail
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="text-xs font-bold text-blue-700">
                        {request.id}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {request.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Diajukan {formatDate(request.submittedAt)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-xs font-bold text-slate-800">
                        {request.teacherName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {request.subjectClass}
                      </div>
                      {request.teacherEmail && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          {request.teacherEmail}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-xs font-semibold text-slate-800">
                        {request.pagesCount} halaman ×{' '}
                        {request.copiesCount} salinan
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {request.totalSheets} lembar •{' '}
                        {request.paperSize} •{' '}
                        {request.colorOption === 'BW'
                          ? 'Hitam Putih'
                          : 'Warna'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Dibutuhkan {formatDate(request.targetDate)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      {statusBadge(request.status)}
                      <div className="text-[10px] text-slate-500 mt-2">
                        {request.reviewedBy
                          ? `Oleh ${request.reviewedBy}`
                          : 'Keputusan Kepala Sekolah'}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4">
              <div>
                {statusBadge(selectedRequest.status)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Info
                  label="Nama Guru"
                  value={selectedRequest.teacherName}
                />
                <Info
                  label="Kelas / Mata Pelajaran"
                  value={selectedRequest.subjectClass}
                />
                <Info
                  label="Email"
                  value={selectedRequest.teacherEmail || '-'}
                />
                <Info
                  label="Tanggal Diperlukan"
                  value={formatDate(selectedRequest.targetDate)}
                />
                <Info
                  label="Jumlah Halaman"
                  value={`${selectedRequest.pagesCount}`}
                />
                <Info
                  label="Jumlah Salinan"
                  value={`${selectedRequest.copiesCount}`}
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
                      : 'Warna'
                  } • ${
                    selectedRequest.printSide === 'DOUBLE'
                      ? 'Bolak-balik'
                      : 'Satu sisi'
                  }`}
                />
              </div>

              {selectedRequest.notes && (
                <DetailBox
                  label="Catatan Guru"
                  value={selectedRequest.notes}
                />
              )}

              {selectedRequest.status !== 'DITOLAK' &&
                selectedRequest.approvalNotes && (
                  <DetailBox
                    label="Catatan Persetujuan Kepala Sekolah"
                    value={selectedRequest.approvalNotes}
                  />
                )}

              {selectedRequest.status === 'DITOLAK' && (
                <DetailBox
                  label="Alasan Penolakan"
                  value={
                    selectedRequest.rejectionReason ||
                    'Tidak ada alasan tambahan.'
                  }
                  danger
                />
              )}

              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2">
                  Keputusan Kepala Sekolah
                </div>
                <div className="text-xs text-slate-600">
                  {selectedRequest.reviewedBy || '-'} •{' '}
                  {formatDate(selectedRequest.reviewedAt)}
                </div>
              </div>

              {selectedRequest.status !== 'DITOLAK' &&
                selectedRequest.fileUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDocument(selectedRequest)
                    }
                    disabled={openingFile}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {selectedRequest.fileType === 'url/link' ? (
                      <ExternalLink className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {openingFile
                      ? 'Membuka Dokumen...'
                      : selectedRequest.status === 'SELESAI'
                      ? 'Buka File yang Pernah Difotokopi'
                      : 'Buka Dokumen untuk Dicetak'}
                  </button>
                )}

              {selectedRequest.status === 'DISETUJUI' && (
                <button
                  type="button"
                  disabled={processingId === selectedRequest.id}
                  onClick={() =>
                    updatePrintStatus(
                      selectedRequest,
                      'SEDANG_DICETAK'
                    )
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
                    updatePrintStatus(
                      selectedRequest,
                      'SELESAI'
                    )
                  }
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Selesai Dicetak
                </button>
              )}

              {selectedRequest.status === 'SELESAI' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <History className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-green-800">
                    PERNAH DIFOTOKOPI
                  </div>
                  {selectedRequest.completedAt && (
                    <div className="text-[11px] text-green-700 mt-2">
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
  danger?: boolean;
}> = ({ label, value, danger = false }) => (
  <div
    className={`rounded-xl p-4 border ${
      danger
        ? 'bg-red-50 border-red-200'
        : 'bg-slate-50 border-slate-200'
    }`}
  >
    <div
      className={`text-[10px] uppercase tracking-wide font-bold ${
        danger ? 'text-red-600' : 'text-slate-500'
      }`}
    >
      {label}
    </div>
    <div
      className={`text-xs mt-1 leading-relaxed ${
        danger ? 'text-red-800' : 'text-slate-700'
      }`}
    >
      {value}
    </div>
  </div>
);
