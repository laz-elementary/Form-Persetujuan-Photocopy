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
  Search,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

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

  const escapeHtml = (value?: string | number) => {
    return String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const printApprovalProof = (request: PhotocopyRequest) => {
    const isApproved =
      request.status === 'DISETUJUI' ||
      request.status === 'SEDANG_DICETAK' ||
      request.status === 'SELESAI';

    if (!isApproved) {
      setErrorMsg(
        'Bukti persetujuan hanya tersedia untuk pengajuan yang sudah disetujui Kepala Sekolah.'
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
        'Popup diblokir browser. Izinkan popup untuk mencetak bukti persetujuan.'
      );
      return;
    }

    const approvalDate = formatDate(request.reviewedAt);
    const targetDate = formatTargetDate(request.targetDate);
    const submittedDate = formatDate(request.submittedAt);
    const verificationUrl = `${window.location.origin}/lacak-status`;

    const colorLabel =
      request.colorOption === 'COLOR'
        ? 'Berwarna'
        : 'Hitam Putih';

    const sideLabel =
      request.printSide === 'DOUBLE'
        ? '2 Sisi / Bolak-balik'
        : '1 Sisi';

    const currentStatus =
      request.status === 'SELESAI'
        ? 'SELESAI / PERNAH DIFOTOKOPI'
        : request.status === 'SEDANG_DICETAK'
        ? 'SEDANG DIPROSES RESOURCE'
        : 'DISETUJUI';

    const fileName = `Bukti_Persetujuan_${request.id}`;

    printWindow.document.write(`
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(fileName)}</title>

          <style>
            @page {
              size: A4;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.45;
            }

            .sheet {
              width: 100%;
            }

            .header {
              border-bottom: 3px solid #0f172a;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }

            .eyebrow {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .08em;
              text-transform: uppercase;
              color: #2563eb;
              margin-bottom: 4px;
            }

            h1 {
              font-size: 22px;
              margin: 0;
              line-height: 1.2;
            }

            .subtitle {
              color: #64748b;
              margin-top: 5px;
              font-size: 11px;
            }

            .approval {
              border: 2px solid #86efac;
              background: #f0fdf4;
              border-radius: 10px;
              padding: 14px;
              margin-bottom: 18px;
            }

            .approval-title {
              color: #166534;
              font-size: 14px;
              font-weight: 800;
              margin-bottom: 4px;
            }

            .approval-desc {
              color: #15803d;
              font-size: 11px;
            }

            .tracking {
              background: #0f172a;
              color: white;
              border-radius: 10px;
              padding: 13px 15px;
              margin-bottom: 18px;
            }

            .tracking-label {
              font-size: 9px;
              color: #94a3b8;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: .08em;
            }

            .tracking-value {
              font-size: 20px;
              font-family: "Courier New", monospace;
              font-weight: 800;
              color: #60a5fa;
              margin-top: 3px;
            }

            .section {
              margin-bottom: 17px;
            }

            .section-title {
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 800;
              letter-spacing: .08em;
              color: #475569;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              padding: 7px 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }

            td:first-child {
              width: 34%;
              color: #64748b;
              font-weight: 700;
            }

            td:last-child {
              font-weight: 600;
              color: #0f172a;
            }

            .note {
              padding: 10px 12px;
              border: 1px solid #bbf7d0;
              background: #f0fdf4;
              border-radius: 8px;
              color: #166534;
              margin-top: 8px;
            }

            .verification {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px dashed #94a3b8;
              color: #64748b;
              font-size: 9.5px;
            }

            .verification strong {
              color: #334155;
            }

            .footer {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              font-size: 9px;
              color: #94a3b8;
            }

            .status-pill {
              display: inline-block;
              border: 1px solid #86efac;
              background: #dcfce7;
              color: #166534;
              font-size: 10px;
              font-weight: 800;
              border-radius: 999px;
              padding: 4px 8px;
              margin-top: 8px;
            }

            .no-print {
              margin-bottom: 14px;
              text-align: right;
            }

            .print-button {
              border: 0;
              background: #2563eb;
              color: white;
              border-radius: 8px;
              padding: 9px 14px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
            }

            @media print {
              .no-print {
                display: none !important;
              }

              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="sheet">
            <div class="no-print">
              <button class="print-button" onclick="window.print()">
                Cetak / Simpan PDF
              </button>
            </div>

            <div class="header">
              <div class="eyebrow">E-Photocopy</div>
              <h1>Bukti Persetujuan Pengajuan Fotokopi</h1>
              <div class="subtitle">
                Portal Persetujuan Digital Bahan Ajar Sekolah - Tahun Ajaran 2026/2027
              </div>
            </div>

            <div class="approval">
              <div class="approval-title">
                ✓ DISETUJUI KEPALA SEKOLAH
              </div>
              <div class="approval-desc">
                Dokumen ini merupakan bukti digital bahwa pengajuan fotokopi telah memperoleh persetujuan Kepala Sekolah.
              </div>
              <div class="status-pill">
                STATUS SAAT INI: ${escapeHtml(currentStatus)}
              </div>
            </div>

            <div class="tracking">
              <div class="tracking-label">Tracking ID</div>
              <div class="tracking-value">${escapeHtml(request.id)}</div>
            </div>

            <div class="section">
              <div class="section-title">Data Pengajuan</div>
              <table>
                <tr>
                  <td>Nama Guru</td>
                  <td>${escapeHtml(request.teacherName)}</td>
                </tr>
                <tr>
                  <td>Kelas / Mata Pelajaran</td>
                  <td>${escapeHtml(request.subjectClass)}</td>
                </tr>
                <tr>
                  <td>Judul Bahan Ajar</td>
                  <td>${escapeHtml(request.title)}</td>
                </tr>
                <tr>
                  <td>Tanggal Pengajuan</td>
                  <td>${escapeHtml(submittedDate)}</td>
                </tr>
                <tr>
                  <td>Tanggal Diperlukan</td>
                  <td>${escapeHtml(targetDate)}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Detail Fotokopi</div>
              <table>
                <tr>
                  <td>Jumlah</td>
                  <td>
                    ${escapeHtml(request.pagesCount)} halaman ×
                    ${escapeHtml(request.copiesCount)} salinan
                  </td>
                </tr>
                <tr>
                  <td>Total Kertas</td>
                  <td>${escapeHtml(request.totalSheets)} lembar</td>
                </tr>
                <tr>
                  <td>Ukuran Kertas</td>
                  <td>${escapeHtml(request.paperSize)}</td>
                </tr>
                <tr>
                  <td>Mode Warna</td>
                  <td>${escapeHtml(colorLabel)}</td>
                </tr>
                <tr>
                  <td>Sisi Cetak</td>
                  <td>${escapeHtml(sideLabel)}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Persetujuan Kepala Sekolah</div>
              <table>
                <tr>
                  <td>Keputusan</td>
                  <td>DISETUJUI</td>
                </tr>
                <tr>
                  <td>Disetujui Oleh</td>
                  <td>${escapeHtml(
                    request.reviewedBy || 'Kepala Sekolah'
                  )}</td>
                </tr>
                <tr>
                  <td>Tanggal Persetujuan</td>
                  <td>${escapeHtml(approvalDate)}</td>
                </tr>
              </table>

              ${
                request.approvalNotes
                  ? `
                    <div class="note">
                      <strong>Catatan Persetujuan:</strong><br />
                      ${escapeHtml(request.approvalNotes)}
                    </div>
                  `
                  : ''
              }
            </div>

            <div class="verification">
              <strong>Verifikasi:</strong>
              Bukti ini dapat dicocokkan melalui halaman Lacak Status E-Photocopy
              di ${escapeHtml(verificationUrl)} dengan Tracking ID
              <strong>${escapeHtml(request.id)}</strong>.
            </div>

            <div class="footer">
              <div>
                Bukti dibuat dari sistem E-Photocopy.
              </div>
              <div>
                Dicetak: ${escapeHtml(
                  new Date().toLocaleString('id-ID')
                )}
              </div>
            </div>
          </div>

          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
    const query = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        filter === 'SEMUA' || request.status === filter;

      const matchesSearch =
        !query ||
        request.id.toLowerCase().includes(query) ||
        request.teacherName.toLowerCase().includes(query) ||
        request.subjectClass.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query);

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
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

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

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari Tracking ID, nama guru, kelas/mapel, atau judul bahan..."
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchTerm && (
            <div className="text-xs text-slate-500 whitespace-nowrap">
              Ditemukan{' '}
              <strong className="text-slate-800">
                {filteredRequests.length}
              </strong>{' '}
              pengajuan
            </div>
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
        <div className="space-y-2">
          {paginatedRequests.map((request) => {
            const style = getStatusStyle(request.status);
            const isApprovedHistory =
              request.status === 'DISETUJUI' ||
              request.status === 'SEDANG_DICETAK' ||
              request.status === 'SELESAI';

            return (
              <div
                key={request.id}
                className={`bg-white border ${style.cardBorder} rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all`}
              >
                <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[10px] font-bold ${style.className}`}
                    >
                      {style.icon}
                      {style.shortLabel}
                    </span>

                    {request.urgency === 'TINGGI' && (
                      <span className="ml-1.5 px-2 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-[9px] font-bold">
                        URGENT
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate max-w-full">
                        {request.title}
                      </h3>

                      {isApprovedHistory && request.reviewedBy && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-700">
                          <ShieldCheck className="w-3 h-3" />
                          Disetujui Kepsek
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500">
                      <span>
                        <strong className="text-slate-700">
                          {request.teacherName}
                        </strong>
                        {' • '}
                        {request.subjectClass}
                      </span>

                      <span className="font-mono text-blue-700 font-semibold">
                        {request.id}
                      </span>

                      <span>
                        {request.pagesCount} hal × {request.copiesCount} salinan
                        {' • '}
                        {request.totalSheets} lembar
                      </span>

                      <span>
                        {formatDate(request.submittedAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRequests.length > ITEMS_PER_PAGE && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-slate-500">
                Menampilkan{' '}
                <strong className="text-slate-800">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </strong>
                {'–'}
                <strong className="text-slate-800">
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredRequests.length
                  )}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800">
                  {filteredRequests.length}
                </strong>{' '}
                pengajuan
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>

                <span className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
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

                  <div className="flex flex-col sm:flex-row gap-2">
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

                    {(selectedRequest.status === 'DISETUJUI' ||
                      selectedRequest.status === 'SEDANG_DICETAK' ||
                      selectedRequest.status === 'SELESAI') && (
                      <button
                        type="button"
                        onClick={() =>
                          printApprovalProof(selectedRequest)
                        }
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 border border-green-500 rounded-lg text-xs font-bold text-white"
                      >
                        <Printer className="w-4 h-4" />
                        Cetak / Simpan PDF
                      </button>
                    )}
                  </div>
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

                  <button
                    type="button"
                    onClick={() =>
                      printApprovalProof(selectedRequest)
                    }
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Bukti Persetujuan / Simpan PDF
                  </button>
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
