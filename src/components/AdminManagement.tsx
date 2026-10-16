import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest, RequestStatus } from '../types';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Download,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  Printer,
  Eye,
  AlertCircle,
  X,
  History,
  RotateCcw,
  Clock3,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

type AdminFilter = RequestStatus | 'ALL';

type AdminRequest = PhotocopyRequest;

export const AdminManagement: React.FC = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AdminFilter>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [msg, setMsg] = useState('');

  const mapRequest = (row: any): AdminRequest => ({
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
    revisionNotes: row.revision_notes || undefined,
    revisionRequestedAt: row.revision_requested_at || undefined,
    revisionRequestedBy: row.revision_requested_by || undefined,
    revisionCount: row.revision_count || 0,
    resubmittedAt: row.resubmitted_at || undefined,
    printedAt: row.printed_at || undefined,
    printedBy: row.printed_by || undefined,
    completedAt: row.completed_at || undefined,
  });

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc('admin_list_photocopy_requests');
      if (error) throw error;
      setRequests((data || []).map(mapRequest));
    } catch (err: any) {
      console.error('Admin load error:', err);
      setErrorMsg(err?.message || 'Gagal memuat data Admin Kelola.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const timer = window.setInterval(() => fetchRequests(true), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const request of requests) {
      result[request.status] = (result[request.status] || 0) + 1;
    }
    return result;
  }, [requests]);

  const totalUsedSheets = useMemo(
    () =>
      requests
        .filter((request) => request.status === 'SELESAI')
        .reduce((total, request) => total + (request.totalSheets || 0), 0),
    [requests]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = selectedStatus === 'ALL' || request.status === selectedStatus;
      const matchesSearch =
        !q ||
        request.id.toLowerCase().includes(q) ||
        request.teacherName.toLowerCase().includes(q) ||
        (request.teacherEmail || '').toLowerCase().includes(q) ||
        request.subjectClass.toLowerCase().includes(q) ||
        request.title.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, selectedStatus]);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
        dateStyle: 'medium',
      });
    }
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const openDocument = async (request: AdminRequest) => {
    if (!request.fileUrl) {
      setErrorMsg('Dokumen tidak tersedia.');
      return;
    }

    setOpeningId(request.id);
    setErrorMsg('');

    try {
      if (
        request.fileType === 'url/link' ||
        request.fileUrl.startsWith('http://') ||
        request.fileUrl.startsWith('https://')
      ) {
        window.open(request.fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const { data, error } = await supabase.storage
        .from('photocopy-files')
        .createSignedUrl(request.fileUrl, 60 * 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('File tidak dapat dibuka.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membuka dokumen.');
    } finally {
      setOpeningId(null);
    }
  };

  const updatePrintStatus = async (
    request: AdminRequest,
    newStatus: 'SEDANG_DICETAK' | 'SELESAI'
  ) => {
    if (
      !window.confirm(
        newStatus === 'SEDANG_DICETAK'
          ? `Mulai proses "${request.title}"?`
          : `Tandai "${request.title}" sebagai selesai?`
      )
    ) {
      return;
    }

    setProcessingId(request.id);
    setErrorMsg('');
    setMsg('');

    try {
      const { error } = await supabase.rpc('resource_update_print_status', {
        p_request_id: request.id,
        p_new_status: newStatus,
      });
      if (error) throw error;
      setMsg(
        newStatus === 'SEDANG_DICETAK'
          ? `${request.id} sedang dicetak.`
          : `${request.id} selesai dan masuk riwayat.`
      );
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memperbarui status cetak.');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteRequestPermanently = async (request: AdminRequest) => {
    const firstConfirm = window.confirm(
      `Hapus permanen data "${request.title}" (${request.id})?\n\n` +
        'Data akan hilang dari Admin Kelola, Portal/riwayat aplikasi, dan Kelola Resource. ' +
        'Gunakan fitur ini hanya untuk data dummy/testing.'
    );

    if (!firstConfirm) return;

    const confirmationText = window.prompt(
      'Untuk mencegah salah hapus, ketik HAPUS lalu tekan OK.'
    );

    if (confirmationText !== 'HAPUS') {
      setErrorMsg('Penghapusan dibatalkan. Teks konfirmasi harus tepat: HAPUS');
      return;
    }

    setDeletingId(request.id);
    setErrorMsg('');
    setMsg('');

    try {
      const { error } = await supabase.rpc(
        'admin_delete_photocopy_request',
        {
          p_request_id: request.id,
        }
      );

      if (error) throw error;

      setMsg(
        `${request.id} berhasil dihapus permanen. Data juga otomatis hilang dari Kelola Resource.`
      );
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      console.error('Permanent delete error:', err);
      setErrorMsg(
        err?.message || 'Gagal menghapus data pengajuan.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Tracking ID',
      'Tanggal',
      'Guru',
      'Email',
      'Kelas',
      'Judul',
      'Halaman',
      'Salinan',
      'Total HVS',
      'Kertas',
      'Warna',
      'Sisi',
      'Status',
      'Reviewer',
      'Petugas Cetak',
      'Selesai',
    ];

    const rows = requests.map((r) => [
      r.id,
      formatDate(r.submittedAt),
      r.teacherName,
      r.teacherEmail || '',
      r.subjectClass,
      r.title,
      r.pagesCount,
      r.copiesCount,
      r.totalSheets,
      r.paperSize,
      r.colorOption,
      r.printSide,
      r.status,
      r.reviewedBy || '',
      r.printedBy || '',
      r.completedAt ? formatDate(r.completedAt) : '',
    ]);

    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_E-Photocopy_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const badge = (status: string) => {
    const style: Record<string, string> = {
      MENUNGGU: 'bg-amber-100 text-amber-700 border-amber-200',
      PERLU_REVISI: 'bg-violet-100 text-violet-700 border-violet-200',
      DISETUJUI: 'bg-green-100 text-green-700 border-green-200',
      SEDANG_DICETAK: 'bg-blue-100 text-blue-700 border-blue-200',
      SELESAI: 'bg-slate-100 text-slate-700 border-slate-200',
      DITOLAK: 'bg-red-100 text-red-700 border-red-200',
    };

    const label: Record<string, string> = {
      MENUNGGU: 'MENUNGGU',
      PERLU_REVISI: 'PERLU REVISI',
      DISETUJUI: 'SIAP DICETAK',
      SEDANG_DICETAK: 'SEDANG DICETAK',
      SELESAI: 'SELESAI',
      DITOLAK: 'DITOLAK',
    };

    return (
      <span className={`inline-flex px-2 py-1 border rounded-lg text-[9px] font-bold ${style[status] || 'bg-slate-100'}`}>
        {label[status] || status}
      </span>
    );
  };

  const filterOptions: Array<[AdminFilter, string]> = [
    ['ALL', `Semua (${requests.length})`],
    ['MENUNGGU', `Menunggu (${counts.MENUNGGU || 0})`],
    ['PERLU_REVISI', `Perlu Revisi (${counts.PERLU_REVISI || 0})`],
    ['DISETUJUI', `Disetujui (${counts.DISETUJUI || 0})`],
    ['SEDANG_DICETAK', `Sedang Dicetak (${counts.SEDANG_DICETAK || 0})`],
    ['SELESAI', `Selesai (${counts.SELESAI || 0})`],
    ['DITOLAK', `Ditolak (${counts.DITOLAK || 0})`],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Admin Kelola
          </div>
          <h2 className="text-2xl font-bold">Monitoring E-Photocopy</h2>
          <p className="text-xs text-slate-300 mt-1">
            Pantau seluruh alur dari pengajuan guru sampai selesai dicetak.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchRequests} className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
          <button onClick={exportCSV} className="px-4 py-2.5 bg-blue-600 rounded-lg text-xs font-bold flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {msg && <Notice text={msg} kind="success" onClose={() => setMsg('')} />}
      {errorMsg && <Notice text={errorMsg} kind="error" onClose={() => setErrorMsg('')} />}

      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs">
        <strong>Khusus Admin SD:</strong> tombol <strong>Hapus</strong> digunakan untuk
        membersihkan data dummy/testing. Penghapusan bersifat permanen dan otomatis
        menghilangkan data yang sama dari Kelola Resource.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary label="Menunggu Keputusan" value={counts.MENUNGGU || 0} icon={<Clock3 className="w-5 h-5" />} />
        <Summary label="Perlu Revisi" value={counts.PERLU_REVISI || 0} icon={<RotateCcw className="w-5 h-5" />} />
        <Summary label="Selesai Dicetak" value={counts.SELESAI || 0} icon={<CheckCircle2 className="w-5 h-5" />} />
        <Summary label="Total HVS Terpakai" value={totalUsedSheets} icon={<History className="w-5 h-5" />} suffix="lembar" dark />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-3 justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {filterOptions.map(([status, label]) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${
                selectedStatus === status ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari guru, email, kelas, judul, atau Tracking ID..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center text-slate-500">Tidak ada data pada kategori ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Pengajuan</th>
                  <th className="px-4 py-3 text-left">Guru / Kelas</th>
                  <th className="px-4 py-3 text-left">Kebutuhan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 align-top">
                      <div className="font-mono text-[10px] font-bold text-blue-700">{request.id}</div>
                      <div className="font-bold text-slate-900 mt-1">{request.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{formatDate(request.submittedAt)}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-slate-800">{request.teacherName}</div>
                      <div className="text-slate-500 mt-1">{request.subjectClass}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      <div>{request.pagesCount} hal × {request.copiesCount} salinan</div>
                      <div className="mt-1"><strong>{request.totalSheets}</strong> lembar • {request.paperSize}</div>
                    </td>
                    <td className="px-4 py-4 align-top">{badge(request.status)}</td>
                    <td className="px-4 py-4 align-top text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteRequestPermanently(request)}
                          disabled={deletingId === request.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-red-700 disabled:opacity-50"
                          title="Khusus Admin SD • gunakan hanya untuk data dummy/testing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === request.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4">
              <div>
                {badge(selectedRequest.status)}
                <h3 className="text-xl font-bold text-slate-900 mt-2">{selectedRequest.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedRequest.id}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Info label="Guru" value={selectedRequest.teacherName} />
                <Info label="Kelas / Mapel" value={selectedRequest.subjectClass} />
                <Info label="Total HVS" value={`${selectedRequest.totalSheets} lembar`} />
                <Info label="Target" value={formatDate(selectedRequest.targetDate)} />
              </div>

              {selectedRequest.reviewedBy && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-800">
                  <div className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Keputusan Portal Persetujuan</div>
                  <div className="mt-2">{selectedRequest.reviewedBy} • {formatDate(selectedRequest.reviewedAt)}</div>
                </div>
              )}

              {selectedRequest.status === 'PERLU_REVISI' && (
                <Detail label="Catatan Revisi" value={selectedRequest.revisionNotes || '-'} />
              )}

              {selectedRequest.status === 'DITOLAK' && (
                <Detail label="Alasan Penolakan" value={selectedRequest.rejectionReason || '-'} danger />
              )}

              {selectedRequest.fileUrl && (
                <button
                  type="button"
                  onClick={() => openDocument(selectedRequest)}
                  disabled={openingId === selectedRequest.id}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" /> Buka Dokumen
                </button>
              )}

              {selectedRequest.status === 'DISETUJUI' && (
                <button
                  type="button"
                  onClick={() => updatePrintStatus(selectedRequest, 'SEDANG_DICETAK')}
                  disabled={processingId === selectedRequest.id}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" /> Mulai Cetak (Backup Admin)
                </button>
              )}

              {selectedRequest.status === 'SEDANG_DICETAK' && (
                <button
                  type="button"
                  onClick={() => updatePrintStatus(selectedRequest, 'SELESAI')}
                  disabled={processingId === selectedRequest.id}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Tandai Selesai
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteRequestPermanently(selectedRequest)}
                disabled={deletingId === selectedRequest.id}
                className="w-full py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deletingId === selectedRequest.id
                  ? 'Menghapus Permanen...'
                  : 'Hapus Permanen Data Dummy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Summary: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  dark?: boolean;
}> = ({ label, value, icon, suffix, dark = false }) => (
  <div className={`rounded-xl border p-4 ${dark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[10px] uppercase font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-extrabold mt-2">{value} {suffix && <span className="text-[10px] text-slate-400">{suffix}</span>}</div>
  </div>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
    <div className="text-[10px] uppercase font-bold text-slate-400">{label}</div>
    <div className="text-xs font-semibold text-slate-800 mt-1">{value}</div>
  </div>
);

const Detail: React.FC<{ label: string; value: string; danger?: boolean }> = ({ label, value, danger }) => (
  <div className={`rounded-xl p-4 border ${danger ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
    <div className="text-[10px] uppercase font-bold opacity-70">{label}</div>
    <div className="text-xs mt-1">{value}</div>
  </div>
);

const Notice: React.FC<{
  text: string;
  kind: 'success' | 'error';
  onClose: () => void;
}> = ({ text, kind, onClose }) => (
  <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
    kind === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800'
  }`}>
    {kind === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
    <span className="flex-1">{text}</span>
    <button onClick={onClose}><X className="w-4 h-4" /></button>
  </div>
);
