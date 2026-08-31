import React, { useEffect, useMemo, useState } from 'react';
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
  Search,
  RotateCcw,
  Upload,
} from 'lucide-react';

interface StatusTrackerProps {
  initialTrackingCode?: string;
}

type HistoryFilter =
  | 'SEMUA'
  | 'MENUNGGU'
  | 'PERLU_REVISI'
  | 'DISETUJUI'
  | 'SEDANG_DICETAK'
  | 'SELESAI'
  | 'DITOLAK';

type TrackerRequest = {
  id: string;
  teacherName: string;
  subjectClass: string;
  title: string;
  pagesCount: number;
  copiesCount: number;
  totalSheets: number;
  paperSize: string;
  colorOption: string;
  printSide: string;
  urgency: string;
  targetDate: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  printedAt?: string;
  printedBy?: string;
  completedAt?: string;
  revisionNotes?: string;
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  revisionCount?: number;
  resubmittedAt?: string;
};

type RevisionFormState = {
  email: string;
  subjectClass: string;
  title: string;
  pagesCount: number;
  copiesCount: number;
  paperSize: string;
  colorOption: string;
  printSide: string;
  urgency: string;
  targetDate: string;
};

export const StatusTracker: React.FC<StatusTrackerProps> = ({
  initialTrackingCode = '',
}) => {
  const [requests, setRequests] = useState<TrackerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<TrackerRequest | null>(null);
  const [revisionRequest, setRevisionRequest] =
    useState<TrackerRequest | null>(null);

  const [filter, setFilter] =
    useState<HistoryFilter>('SEMUA');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [revisionForm, setRevisionForm] =
    useState<RevisionFormState>({
      email: '',
      subjectClass: '',
      title: '',
      pagesCount: 1,
      copiesCount: 1,
      paperSize: 'A4',
      colorOption: 'BW',
      printSide: 'DOUBLE',
      urgency: 'NORMAL',
      targetDate: '',
    });

  const [replacementFile, setReplacementFile] =
    useState<File | null>(null);
  const [revisionSubmitting, setRevisionSubmitting] =
    useState(false);

  const ITEMS_PER_PAGE = 12;

  const mapHistoryRequest = (row: any): TrackerRequest => ({
    id: row.id,
    teacherName: row.teacher_name,
    subjectClass: row.subject_class,
    title: row.title,
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
    revisionNotes: row.revision_notes || undefined,
    revisionRequestedAt:
      row.revision_requested_at || undefined,
    revisionRequestedBy:
      row.revision_requested_by || undefined,
    revisionCount: row.revision_count || 0,
    resubmittedAt: row.resubmitted_at || undefined,
  });

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc(
        'list_photocopy_request_history'
      );

      if (error) throw error;

      const mapped: TrackerRequest[] = (data || []).map(
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

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString('id-ID', {
      dateStyle: 'medium',
    });
  };

  const copyTrackingId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(''), 1800);
    } catch {
      setErrorMsg(
        'Tracking ID tidak dapat disalin otomatis.'
      );
    }
  };

  const escapeHtml = (value?: string | number) =>
    String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const printApprovalProof = (request: TrackerRequest) => {
    const isApproved = [
      'DISETUJUI',
      'SEDANG_DICETAK',
      'SELESAI',
    ].includes(request.status);

    if (!isApproved) {
      setErrorMsg(
        'Bukti persetujuan hanya tersedia untuk pengajuan yang sudah disetujui.'
      );
      return;
    }

    const printWindow = window.open(
      '',
      '_blank',
      'width=900,height=1100'
    );

    if (!printWindow) {
      setErrorMsg(
        'Popup diblokir browser. Izinkan popup untuk mencetak bukti.'
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Bukti Persetujuan ${escapeHtml(
            request.id
          )}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: Arial, sans-serif; color:#0f172a; font-size:12px; line-height:1.5; }
            h1 { font-size:22px; margin:0 0 5px; }
            .muted { color:#64748b; }
            .ok { margin:18px 0; padding:14px; border:2px solid #86efac; background:#f0fdf4; border-radius:10px; color:#166534; }
            .tracking { background:#0f172a; color:white; padding:14px; border-radius:10px; margin:18px 0; }
            .tracking strong { display:block; color:#60a5fa; font-size:20px; font-family:monospace; }
            table { width:100%; border-collapse:collapse; margin-top:12px; }
            td { border-bottom:1px solid #e2e8f0; padding:8px 4px; vertical-align:top; }
            td:first-child { width:36%; color:#64748b; }
            .btn { margin-bottom:15px; background:#2563eb; color:white; border:0; border-radius:8px; padding:9px 14px; font-weight:bold; }
            @media print { .no-print { display:none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
          </div>
          <div class="muted">E-Photocopy • Tahun Ajaran 2026/2027</div>
          <h1>Bukti Persetujuan Pengajuan Fotokopi</h1>
          <div class="ok">
            <strong>✓ DISETUJUI KEPALA SEKOLAH</strong><br/>
            Bukti digital persetujuan pengajuan bahan ajar.
          </div>
          <div class="tracking">
            Tracking ID
            <strong>${escapeHtml(request.id)}</strong>
          </div>
          <table>
            <tr><td>Nama Guru</td><td>${escapeHtml(
              request.teacherName
            )}</td></tr>
            <tr><td>Kelas / Mapel</td><td>${escapeHtml(
              request.subjectClass
            )}</td></tr>
            <tr><td>Judul</td><td>${escapeHtml(
              request.title
            )}</td></tr>
            <tr><td>Jumlah</td><td>${escapeHtml(
              request.pagesCount
            )} halaman × ${escapeHtml(
      request.copiesCount
    )} salinan</td></tr>
            <tr><td>Total Kertas</td><td>${escapeHtml(
              request.totalSheets
            )} lembar</td></tr>
            <tr><td>Target</td><td>${escapeHtml(
              formatTargetDate(request.targetDate)
            )}</td></tr>
            <tr><td>Disetujui Oleh</td><td>${escapeHtml(
              request.reviewedBy || 'Kepala Sekolah'
            )}</td></tr>
            <tr><td>Tanggal Persetujuan</td><td>${escapeHtml(
              formatDate(request.reviewedAt)
            )}</td></tr>
          </table>
          ${
            request.approvalNotes
              ? `<p><strong>Catatan:</strong> ${escapeHtml(
                  request.approvalNotes
                )}</p>`
              : ''
          }
          <p class="muted">Verifikasi melalui halaman Lacak Status dengan Tracking ID di atas.</p>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () { window.print(); }, 300);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const getStatusStyle = (status: string) => {
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

      case 'PERLU_REVISI':
        return {
          className:
            'bg-violet-100 text-violet-700 border-violet-200',
          cardBorder: 'border-violet-200',
          label: 'PERLU REVISI',
          shortLabel: 'Perlu Revisi',
          icon: <RotateCcw className="w-4 h-4" />,
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
          label: 'SELESAI / PERNAH DIFOTOKOPI',
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
        (r) => r.status === 'MENUNGGU'
      ).length,
      PERLU_REVISI: requests.filter(
        (r) => r.status === 'PERLU_REVISI'
      ).length,
      DISETUJUI: requests.filter(
        (r) => r.status === 'DISETUJUI'
      ).length,
      SEDANG_DICETAK: requests.filter(
        (r) => r.status === 'SEDANG_DICETAK'
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
    const q = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        filter === 'SEMUA' || request.status === filter;

      const matchesSearch =
        !q ||
        request.id.toLowerCase().includes(q) ||
        request.teacherName.toLowerCase().includes(q) ||
        request.subjectClass.toLowerCase().includes(q) ||
        request.title.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [filteredRequests, currentPage]);

  const filters: Array<{
    value: HistoryFilter;
    label: string;
    count: number;
  }> = [
    {
      value: 'SEMUA',
      label: 'Semua',
      count: requests.length,
    },
    {
      value: 'MENUNGGU',
      label: 'Menunggu',
      count: counts.MENUNGGU,
    },
    {
      value: 'PERLU_REVISI',
      label: 'Perlu Revisi',
      count: counts.PERLU_REVISI,
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

  const openRevisionEditor = (request: TrackerRequest) => {
    setSelectedRequest(null);
    setRevisionRequest(request);
    setReplacementFile(null);
    setErrorMsg('');

    setRevisionForm({
      email: '',
      subjectClass: request.subjectClass,
      title: request.title,
      pagesCount: request.pagesCount,
      copiesCount: request.copiesCount,
      paperSize: request.paperSize,
      colorOption: request.colorOption,
      printSide: request.printSide,
      urgency: request.urgency,
      targetDate: request.targetDate,
    });
  };

  const revisionSheets =
    revisionForm.printSide === 'DOUBLE'
      ? Math.ceil(revisionForm.pagesCount / 2) *
        revisionForm.copiesCount
      : revisionForm.pagesCount *
        revisionForm.copiesCount;

  const submitRevision = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!revisionRequest) return;

    if (!revisionForm.email.trim()) {
      setErrorMsg(
        'Email guru wajib diisi untuk verifikasi pengajuan.'
      );
      return;
    }

    if (
      !revisionForm.subjectClass.trim() ||
      !revisionForm.title.trim() ||
      revisionForm.pagesCount <= 0 ||
      revisionForm.copiesCount <= 0
    ) {
      setErrorMsg(
        'Lengkapi data revisi sebelum dikirim ulang.'
      );
      return;
    }

    setRevisionSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    let uploadedPath: string | null = null;

    try {
      let fileName: string | null = null;
      let fileSize: string | null = null;
      let fileType: string | null = null;
      let fileUrl: string | null = null;

      if (replacementFile) {
        if (
          replacementFile.size >
          20 * 1024 * 1024
        ) {
          throw new Error(
            'Ukuran file maksimal 20 MB.'
          );
        }

        let safeName = replacementFile.name
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');

        if (!safeName) safeName = 'document';

        uploadedPath = `${
          revisionRequest.id
        }/revision-${Date.now()}-${safeName}`;

        const { error: uploadError } =
          await supabase.storage
            .from('photocopy-files')
            .upload(
              uploadedPath,
              replacementFile,
              {
                cacheControl: '3600',
                upsert: false,
                contentType:
                  replacementFile.type ||
                  'application/octet-stream',
              }
            );

        if (uploadError) throw uploadError;

        fileName = replacementFile.name;
        fileSize = `${(
          replacementFile.size /
          (1024 * 1024)
        ).toFixed(1)} MB`;
        fileType =
          replacementFile.type ||
          'application/octet-stream';
        fileUrl = uploadedPath;
      }

      const { error } = await supabase.rpc(
        'teacher_resubmit_revision',
        {
          p_request_id: revisionRequest.id,
          p_teacher_email:
            revisionForm.email.trim(),
          p_subject_class:
            revisionForm.subjectClass.trim(),
          p_title: revisionForm.title.trim(),
          p_pages_count:
            revisionForm.pagesCount,
          p_copies_count:
            revisionForm.copiesCount,
          p_total_sheets: revisionSheets,
          p_paper_size:
            revisionForm.paperSize,
          p_color_option:
            revisionForm.colorOption,
          p_print_side:
            revisionForm.printSide,
          p_urgency: revisionForm.urgency,
          p_target_date:
            revisionForm.targetDate,
          p_notes: null,
          p_file_name: fileName,
          p_file_size: fileSize,
          p_file_type: fileType,
          p_file_url: fileUrl,
        }
      );

      if (error) throw error;

      setSuccessMsg(
        `${revisionRequest.id} berhasil diperbaiki dan dikirim ulang ke Kepala Sekolah.`
      );

      setRevisionRequest(null);
      setReplacementFile(null);
      await fetchHistory();
      setFilter('MENUNGGU');
    } catch (err: any) {
      if (uploadedPath) {
        await supabase.storage
          .from('photocopy-files')
          .remove([uploadedPath]);
      }

      console.error('Resubmit revision error:', err);

      const raw = String(err?.message || '');

      if (
        raw.toLowerCase().includes(
          'email guru tidak sesuai'
        )
      ) {
        setErrorMsg(
          'Email tidak sesuai dengan pengajuan ini. Gunakan email guru yang tercatat saat pengajuan dibuat.'
        );
      } else {
        setErrorMsg(
          raw ||
            'Gagal mengirim ulang pengajuan.'
        );
      }
    } finally {
      setRevisionSubmitting(false);
    }
  };

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
              Semua pengajuan tersimpan sebagai riwayat. Jika
              Kepala Sekolah meminta revisi, guru dapat
              memperbaiki pengajuan dari halaman ini.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold"
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

      {successMsg && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <SummaryCard
          label="Menunggu"
          value={counts.MENUNGGU}
          className="bg-amber-50 border-amber-200 text-amber-800"
        />
        <SummaryCard
          label="Perlu Revisi"
          value={counts.PERLU_REVISI}
          className="bg-violet-50 border-violet-200 text-violet-800"
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            placeholder="Cari Tracking ID, nama guru, kelas/mapel, atau judul..."
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-5 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
                filter === item.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                  filter === item.value
                    ? 'bg-white/20'
                    : 'bg-slate-100'
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">
            Memuat riwayat...
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-900">
            Belum Ada Pengajuan
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedRequests.map((request) => {
            const style = getStatusStyle(request.status);

            return (
              <div
                key={request.id}
                className={`bg-white border ${style.cardBorder} rounded-xl px-4 py-3 shadow-sm`}
              >
                <div className="grid grid-cols-1 md:grid-cols-[165px_minmax(0,1fr)_auto] md:items-center gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[10px] font-bold ${style.className}`}
                    >
                      {style.icon}
                      {style.shortLabel}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {request.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500">
                      <span>
                        <strong className="text-slate-700">
                          {request.teacherName}
                        </strong>{' '}
                        • {request.subjectClass}
                      </span>

                      <span className="font-mono text-blue-700 font-semibold">
                        {request.id}
                      </span>

                      <span>
                        {request.totalSheets} lembar
                      </span>

                      <span>
                        {formatDate(request.submittedAt)}
                      </span>
                    </div>

                    {request.status === 'PERLU_REVISI' &&
                      request.revisionNotes && (
                        <div className="mt-2 text-[10px] text-violet-800">
                          <strong>Revisi:</strong>{' '}
                          {request.revisionNotes}
                        </div>
                      )}
                  </div>

                  <div className="flex gap-2">
                    {request.status ===
                      'PERLU_REVISI' && (
                      <button
                        type="button"
                        onClick={() =>
                          openRevisionEditor(request)
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Perbaiki
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRequest(request)
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRequests.length > ITEMS_PER_PAGE && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Halaman{' '}
                <strong>{currentPage}</strong> dari{' '}
                <strong>{totalPages}</strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-xs font-bold border rounded-lg disabled:opacity-40"
                >
                  Sebelumnya
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-xs font-bold border rounded-lg disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedRequest.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRequest.teacherName} •{' '}
                  {selectedRequest.subjectClass}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(() => {
                const style = getStatusStyle(
                  selectedRequest.status
                );

                return (
                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${style.className}`}
                  >
                    {style.icon}
                    <div>
                      <div className="text-[10px] uppercase font-bold">
                        Status Saat Ini
                      </div>
                      <div className="text-sm font-bold">
                        {style.label}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">
                    Tracking ID
                  </div>
                  <div className="font-mono text-xl text-blue-400 font-bold">
                    {selectedRequest.id}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copyTrackingId(selectedRequest.id)
                  }
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copiedId === selectedRequest.id
                    ? 'Tersalin'
                    : 'Salin ID'}
                </button>
              </div>

              {selectedRequest.status ===
                'PERLU_REVISI' && (
                <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-5">
                  <div className="font-bold text-violet-900 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Perlu Diperbaiki
                  </div>

                  <p className="text-sm text-violet-900 mt-3">
                    {selectedRequest.revisionNotes ||
                      'Silakan perbaiki pengajuan sesuai arahan Kepala Sekolah.'}
                  </p>

                  {selectedRequest.revisionRequestedBy && (
                    <p className="text-[11px] text-violet-700 mt-2">
                      Diminta oleh:{' '}
                      <strong>
                        {
                          selectedRequest.revisionRequestedBy
                        }
                      </strong>
                      {selectedRequest.revisionRequestedAt
                        ? ` • ${formatDate(
                            selectedRequest.revisionRequestedAt
                          )}`
                        : ''}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      openRevisionEditor(
                        selectedRequest
                      )
                    }
                    className="w-full mt-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold"
                  >
                    Perbaiki Pengajuan
                  </button>
                </div>
              )}

              {[
                'DISETUJUI',
                'SEDANG_DICETAK',
                'SELESAI',
              ].includes(selectedRequest.status) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="font-bold text-green-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Disetujui Kepala Sekolah
                  </div>

                  <p className="text-xs text-green-700 mt-2">
                    Oleh:{' '}
                    <strong>
                      {selectedRequest.reviewedBy ||
                        'Kepala Sekolah'}
                    </strong>{' '}
                    •{' '}
                    {formatDate(
                      selectedRequest.reviewedAt
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      printApprovalProof(
                        selectedRequest
                      )
                    }
                    className="mt-4 w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Bukti / Simpan PDF
                  </button>
                </div>
              )}

              {selectedRequest.status ===
                'DITOLAK' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900">
                  <strong>Alasan Penolakan</strong>
                  <p className="mt-1">
                    {selectedRequest.rejectionReason ||
                      'Tidak ada keterangan tambahan.'}
                  </p>
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
                    selectedRequest.colorOption ===
                    'COLOR'
                      ? 'Berwarna'
                      : 'Hitam Putih'
                  } • ${
                    selectedRequest.printSide ===
                    'DOUBLE'
                      ? '2 Sisi'
                      : '1 Sisi'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(null)
                }
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {revisionRequest && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={submitRevision}
            className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 my-8"
          >
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold text-violet-700 uppercase">
                  Perbaiki & Kirim Ulang
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {revisionRequest.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tracking ID tetap:{' '}
                  <strong className="font-mono text-blue-700">
                    {revisionRequest.id}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRevisionRequest(null)
                }
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="text-xs font-bold text-violet-800">
                  Catatan Kepala Sekolah
                </div>
                <div className="text-sm text-violet-900 mt-1">
                  {revisionRequest.revisionNotes ||
                    '-'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Guru untuk Verifikasi *
                </label>
                <input
                  type="email"
                  required
                  value={revisionForm.email}
                  onChange={(e) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="nama@lazuardi.sch.id"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Email digunakan untuk memastikan pengajuan
                  hanya diperbaiki oleh guru yang bersangkutan.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Kelas / Mata Pelajaran"
                  value={revisionForm.subjectClass}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      subjectClass: value,
                    }))
                  }
                />
                <Field
                  label="Judul Bahan Ajar"
                  value={revisionForm.title}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      title: value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumberField
                  label="Halaman"
                  value={revisionForm.pagesCount}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      pagesCount: value,
                    }))
                  }
                />
                <NumberField
                  label="Salinan"
                  value={revisionForm.copiesCount}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      copiesCount: value,
                    }))
                  }
                />

                <SelectField
                  label="Kertas"
                  value={revisionForm.paperSize}
                  options={[
                    ['A4', 'A4'],
                    ['F4', 'F4'],
                    ['A3', 'A3'],
                  ]}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      paperSize: value,
                    }))
                  }
                />

                <SelectField
                  label="Warna"
                  value={revisionForm.colorOption}
                  options={[
                    ['BW', 'Hitam Putih'],
                    ['COLOR', 'Berwarna'],
                  ]}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      colorOption: value,
                    }))
                  }
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <SelectField
                  label="Sisi Cetak"
                  value={revisionForm.printSide}
                  options={[
                    ['SINGLE', '1 Sisi'],
                    ['DOUBLE', '2 Sisi'],
                  ]}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      printSide: value,
                    }))
                  }
                />

                <SelectField
                  label="Prioritas"
                  value={revisionForm.urgency}
                  options={[
                    ['NORMAL', 'Normal'],
                    ['TINGGI', 'Tinggi'],
                  ]}
                  onChange={(value) =>
                    setRevisionForm((prev) => ({
                      ...prev,
                      urgency: value,
                    }))
                  }
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Diperlukan
                  </label>
                  <input
                    type="date"
                    required
                    value={revisionForm.targetDate}
                    onChange={(e) =>
                      setRevisionForm((prev) => ({
                        ...prev,
                        targetDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4">
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  Perkiraan Kertas Setelah Revisi
                </div>
                <div className="text-2xl font-bold text-blue-400 mt-1">
                  {revisionSheets} lembar
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ganti File Dokumen (Opsional)
                </label>

                <label className="flex items-center gap-3 p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">
                      {replacementFile
                        ? replacementFile.name
                        : 'Pilih file baru bila dokumen perlu diganti'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Maksimal 20 MB. Jika tidak memilih file,
                      dokumen lama tetap digunakan.
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setReplacementFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRevisionRequest(null)
                  }
                  className="flex-1 py-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={revisionSubmitting}
                  className="flex-[2] py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {revisionSubmitting
                    ? 'Mengirim Ulang...'
                    : 'Kirim Ulang ke Kepala Sekolah'}
                </button>
              </div>
            </div>
          </form>
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
    <div className="text-[10px] uppercase font-bold text-slate-400">
      {label}
    </div>
    <div className="text-xs font-bold text-slate-800 mt-1">
      {value}
    </div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
    </label>
    <input
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
    />
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
    </label>
    <input
      type="number"
      min={1}
      required
      value={value}
      onChange={(e) =>
        onChange(
          Math.max(1, Number(e.target.value) || 1)
        )
      }
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option
          key={optionValue}
          value={optionValue}
        >
          {optionLabel}
        </option>
      ))}
    </select>
  </div>
);
