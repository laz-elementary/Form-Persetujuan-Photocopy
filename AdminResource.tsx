import React, { useEffect, useMemo, useState } from 'react';
import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import {
  Building2,
  CheckCircle2,
  Search,
  RefreshCw,
  FileText,
  ExternalLink,
  AlertCircle,
  X,
  Printer,
  Play,
  History,
  ShieldCheck,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Clock3,
  Eye,
} from 'lucide-react';

type ResourceRequest = Omit<PhotocopyRequest, 'status'> & {
  status: string;
};

type QueueView =
  | 'READY'
  | 'PRINTING'
  | 'TODAY'
  | 'TOMORROW'
  | 'UPCOMING'
  | 'HISTORY'
  | 'ALL';

type SpecFilter =
  | 'ALL'
  | 'A4'
  | 'F4'
  | 'A3'
  | 'BW'
  | 'COLOR'
  | 'SINGLE'
  | 'DOUBLE';

export const AdminResource: React.FC = () => {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('READY');
  const [specFilter, setSpecFilter] = useState<SpecFilter>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [selectedRequest, setSelectedRequest] =
    useState<ResourceRequest | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [msg, setMsg] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const mapRequest = (row: any): ResourceRequest => ({
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

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
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
          'Gagal memuat antrean fotokopi untuk Resource.'
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const timer = window.setInterval(() => fetchRequests(true), 10000);
    return () => window.clearInterval(timer);
  }, []);

  // =====================================================
  // DATE HELPERS - ASIA/JAKARTA
  // =====================================================

  const dateKeyInJakarta = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

  const todayKey = dateKeyInJakarta(new Date());
  const tomorrowKey = dateKeyInJakarta(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );

  const isActivePrintJob = (request: ResourceRequest) =>
    request.status === 'DISETUJUI' ||
    request.status === 'SEDANG_DICETAK';

  const isOverdue = (request: ResourceRequest) =>
    isActivePrintJob(request) &&
    !!request.targetDate &&
    request.targetDate < todayKey;

  const isTodayJob = (request: ResourceRequest) =>
    isActivePrintJob(request) &&
    !!request.targetDate &&
    request.targetDate <= todayKey;

  const isTomorrowJob = (request: ResourceRequest) =>
    isActivePrintJob(request) &&
    request.targetDate === tomorrowKey;

  const isUpcomingJob = (request: ResourceRequest) =>
    isActivePrintJob(request) &&
    !!request.targetDate &&
    request.targetDate > tomorrowKey;

  // =====================================================
  // COUNTS
  // =====================================================

  const readyCount = requests.filter(
    (r) => r.status === 'DISETUJUI'
  ).length;

  const printingCount = requests.filter(
    (r) => r.status === 'SEDANG_DICETAK'
  ).length;

  const todayCount = requests.filter(isTodayJob).length;
  const tomorrowCount = requests.filter(isTomorrowJob).length;
  const upcomingCount = requests.filter(isUpcomingJob).length;
  const historyCount = requests.filter(
    (r) => r.status === 'SELESAI'
  ).length;

  const queueSheets = requests
    .filter(isActivePrintJob)
    .reduce(
      (total, request) => total + (request.totalSheets || 0),
      0
    );

  const completedRequests = requests.filter(
    (request) => request.status === 'SELESAI'
  );

  const completedInSelectedMonth = completedRequests.filter((request) => {
    if (!request.completedAt) return false;
    return dateKeyInJakarta(new Date(request.completedAt)).slice(0, 7) === selectedMonth;
  });

  const usedSheetsSelectedMonth = completedInSelectedMonth.reduce(
    (total, request) => total + (request.totalSheets || 0),
    0
  );

  const totalUsedSheets = completedRequests.reduce(
    (total, request) => total + (request.totalSheets || 0),
    0
  );

  const monthA4 = completedInSelectedMonth
    .filter((request) => request.paperSize === 'A4')
    .reduce((total, request) => total + (request.totalSheets || 0), 0);

  const monthF4 = completedInSelectedMonth
    .filter((request) => request.paperSize === 'F4')
    .reduce((total, request) => total + (request.totalSheets || 0), 0);

  const monthA3 = completedInSelectedMonth
    .filter((request) => request.paperSize === 'A3')
    .reduce((total, request) => total + (request.totalSheets || 0), 0);

  // =====================================================
  // FILTER & SORT
  // =====================================================

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = requests.filter((request) => {
      let matchesView = true;

      if (queueView === 'READY') {
        matchesView = request.status === 'DISETUJUI';
      } else if (queueView === 'PRINTING') {
        matchesView = request.status === 'SEDANG_DICETAK';
      } else if (queueView === 'TODAY') {
        matchesView = isTodayJob(request);
      } else if (queueView === 'TOMORROW') {
        matchesView = isTomorrowJob(request);
      } else if (queueView === 'UPCOMING') {
        matchesView = isUpcomingJob(request);
      } else if (queueView === 'HISTORY') {
        matchesView = request.status === 'SELESAI';
      }

      let matchesSpec = true;

      if (specFilter === 'A4' || specFilter === 'F4' || specFilter === 'A3') {
        matchesSpec = request.paperSize === specFilter;
      } else if (specFilter === 'BW' || specFilter === 'COLOR') {
        matchesSpec = request.colorOption === specFilter;
      } else if (specFilter === 'SINGLE' || specFilter === 'DOUBLE') {
        matchesSpec = request.printSide === specFilter;
      }

      const matchesSearch =
        !q ||
        request.id.toLowerCase().includes(q) ||
        request.teacherName.toLowerCase().includes(q) ||
        request.subjectClass.toLowerCase().includes(q) ||
        request.title.toLowerCase().includes(q);

      return matchesView && matchesSpec && matchesSearch;
    });

    return result.sort((a, b) => {
      // Sedang dicetak selalu di atas.
      if (
        a.status === 'SEDANG_DICETAK' &&
        b.status !== 'SEDANG_DICETAK'
      ) {
        return -1;
      }

      if (
        b.status === 'SEDANG_DICETAK' &&
        a.status !== 'SEDANG_DICETAK'
      ) {
        return 1;
      }

      // Setelah itu prioritas tinggi.
      if (a.urgency === 'TINGGI' && b.urgency !== 'TINGGI') {
        return -1;
      }

      if (b.urgency === 'TINGGI' && a.urgency !== 'TINGGI') {
        return 1;
      }

      // Lalu target paling dekat.
      return String(a.targetDate || '').localeCompare(
        String(b.targetDate || '')
      );
    });
  }, [
    requests,
    search,
    queueView,
    specFilter,
    todayKey,
    tomorrowKey,
  ]);

  // =====================================================
  // PROCESS
  // =====================================================

  const updatePrintStatus = async (
    request: ResourceRequest,
    newStatus: 'SEDANG_DICETAK' | 'SELESAI'
  ) => {
    const confirmation =
      newStatus === 'SEDANG_DICETAK'
        ? `Mulai mencetak "${request.title}"?`
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
        setMsg(
          `${request.id} sekarang berstatus SEDANG DICETAK.`
        );
      } else {
        setMsg(
          `${request.id} selesai dicetak dan masuk Riwayat Fotokopi.`
        );
        setQueueView('HISTORY');
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
    request: ResourceRequest
  ) => {
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
        window.open(
          request.fileUrl,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }

      // Fallback untuk file lama sebelum migrasi Google Drive.
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
      setOpeningId(null);
    }
  };

  // =====================================================
  // DISPLAY HELPERS
  // =====================================================

  const formatDate = (date?: string) => {
    if (!date) return '-';

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00`).toLocaleDateString(
        'id-ID',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
      );
    }

    return new Date(date).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const statusBadge = (request: ResourceRequest) => {
    if (request.status === 'DISETUJUI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          ACC • SIAP DIPROSES
        </span>
      );
    }

    if (request.status === 'SEDANG_DICETAK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold">
          <Printer className="w-3 h-3" />
          SEDANG DICETAK
        </span>
      );
    }

    if (request.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold">
          <History className="w-3 h-3" />
          PERNAH DIFOTOKOPI
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold">
        STATUS TIDAK TERSEDIA
      </span>
    );
  };

  const queueViewLabel = {
    READY: 'Sudah ACC • Siap Diproses',
    PRINTING: 'Sedang Dicetak',
    TODAY: 'Pekerjaan Hari Ini',
    TOMORROW: 'Pekerjaan Besok',
    UPCOMING: 'Pekerjaan Mendatang',
    HISTORY: 'Riwayat Fotokopi',
    ALL: 'Semua Data Resource',
  }[queueView];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Admin Resource
          </div>

          <h2 className="text-2xl font-bold">
            Kelola Resource & Rekap Kertas
          </h2>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Hanya pengajuan yang sudah di-ACC Kepala Sekolah / Wakil Kepala Sekolah yang masuk ke portal ini. Resource dapat membuka file, memproses fotokopi, lalu menandai pekerjaan selesai.
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

      {/* MAIN QUEUE TABS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <QueueCard
          title="Sudah ACC"
          value={readyCount}
          icon={<ShieldCheck className="w-5 h-5" />}
          active={queueView === 'READY'}
          onClick={() => setQueueView('READY')}
          className="bg-green-50 border-green-200 text-green-800"
        />

        <QueueCard
          title="Sedang Dicetak"
          value={printingCount}
          icon={<Printer className="w-5 h-5" />}
          active={queueView === 'PRINTING'}
          onClick={() => setQueueView('PRINTING')}
          className="bg-blue-50 border-blue-200 text-blue-800"
        />

        <QueueCard
          title="Hari Ini"
          value={todayCount}
          icon={<CalendarDays className="w-5 h-5" />}
          active={queueView === 'TODAY'}
          onClick={() => setQueueView('TODAY')}
          className="bg-amber-50 border-amber-200 text-amber-800"
        />

        <QueueCard
          title="Besok"
          value={tomorrowCount}
          icon={<CalendarClock className="w-5 h-5" />}
          active={queueView === 'TOMORROW'}
          onClick={() => setQueueView('TOMORROW')}
          className="bg-indigo-50 border-indigo-200 text-indigo-800"
        />

        <QueueCard
          title="Mendatang"
          value={upcomingCount}
          icon={<CalendarRange className="w-5 h-5" />}
          active={queueView === 'UPCOMING'}
          onClick={() => setQueueView('UPCOMING')}
          className="bg-violet-50 border-violet-200 text-violet-800"
        />

        <QueueCard
          title="Riwayat"
          value={historyCount}
          icon={<History className="w-5 h-5" />}
          active={queueView === 'HISTORY'}
          onClick={() => setQueueView('HISTORY')}
          className="bg-slate-50 border-slate-200 text-slate-800"
        />
      </div>

      {/* REKAP KERTAS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Rekap Kertas yang Sudah Digunakan</h3>
            <p className="text-[11px] text-slate-500">
              Perhitungan hanya dari pengajuan berstatus SELESAI.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            Bulan
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="HVS Bulan Terpilih" value={`${usedSheetsSelectedMonth}`} suffix="lembar" />
          <StatCard label="Pekerjaan Selesai" value={`${completedInSelectedMonth.length}`} suffix="job" />
          <StatCard label="Total HVS Terpakai" value={`${totalUsedSheets}`} suffix="lembar" />
          <StatCard label="Sedang Dicetak" value={`${printingCount}`} suffix="job" />
          <StatCard label="HVS Antrean Aktif" value={`${queueSheets}`} suffix="lembar" dark />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="A4 bulan ini" value={monthA4} />
          <MiniStat label="F4 bulan ini" value={monthF4} />
          <MiniStat label="A3 bulan ini" value={monthA3} />
        </div>
      </div>

      {/* SEARCH + SPEC FILTER */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari guru, kelas, judul, atau Tracking ID..."
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={specFilter}
          onChange={(e) =>
            setSpecFilter(e.target.value as SpecFilter)
          }
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700"
        >
          <option value="ALL">Semua Spesifikasi</option>
          <option value="A4">Kertas A4</option>
          <option value="F4">Kertas F4</option>
          <option value="A3">Kertas A3</option>
          <option value="BW">Hitam Putih</option>
          <option value="COLOR">Berwarna</option>
          <option value="SINGLE">1 Sisi</option>
          <option value="DOUBLE">2 Sisi</option>
        </select>

        <button
          type="button"
          onClick={() => setQueueView('ALL')}
          className={`px-4 py-2.5 border rounded-lg text-xs font-bold ${
            queueView === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          Semua Data
        </button>
      </div>

      {/* QUEUE HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">
            {queueViewLabel}
          </h3>
          <p className="text-[11px] text-slate-500">
            {filtered.length} pengajuan ditampilkan
          </p>
        </div>

        {specFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => setSpecFilter('ALL')}
            className="text-xs font-bold text-blue-700 underline"
          >
            Hapus Filter Spesifikasi
          </button>
        )}
      </div>

      {/* QUEUE */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Memuat antrean Resource...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 text-center px-4">
            <Printer className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800">
              Tidak Ada Pekerjaan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tidak ada pengajuan pada kelompok ini.
            </p>
          </div>
        ) : (
          filtered.map((request) => (
            <div
              key={request.id}
              className={`bg-white border rounded-xl px-4 py-3 shadow-sm ${
                isOverdue(request)
                  ? 'border-red-300'
                  : request.status === 'SEDANG_DICETAK'
                  ? 'border-blue-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(request)}

                    {isOverdue(request) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-bold">
                        <Clock3 className="w-3 h-3" />
                        LEWAT TARGET
                      </span>
                    )}

                    {request.urgency === 'TINGGI' && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[9px] font-bold">
                        PRIORITAS TINGGI
                      </span>
                    )}

                    <span className="font-mono text-[10px] font-bold text-blue-700">
                      {request.id}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {request.title}
                  </h4>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 mt-1">
                    <span>
                      <strong className="text-slate-700">
                        {request.teacherName}
                      </strong>{' '}
                      • {request.subjectClass}
                    </span>

                    <span>
                      {request.pagesCount} hal ×{' '}
                      {request.copiesCount} salinan
                    </span>

                    <span>
                      <strong>{request.totalSheets}</strong> lembar
                    </span>

                    <span>
                      {request.paperSize} •{' '}
                      {request.colorOption === 'BW'
                        ? 'BW'
                        : 'Warna'}{' '}
                      •{' '}
                      {request.printSide === 'DOUBLE'
                        ? '2 sisi'
                        : '1 sisi'}
                    </span>

                    <span
                      className={
                        isOverdue(request)
                          ? 'font-bold text-red-600'
                          : 'font-semibold text-slate-600'
                      }
                    >
                      Target: {formatDate(request.targetDate)}
                    </span>
                  </div>

                  {request.status === 'DISETUJUI' &&
                    request.reviewedBy && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[10px] text-green-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          <strong>Sudah ACC</strong> oleh {request.reviewedBy}
                          {request.reviewedAt
                            ? ` • ${formatDate(request.reviewedAt)}`
                            : ''}
                          {' • '}siap diproses Resource
                        </span>
                      </div>
                    )}

                  {request.status === 'SEDANG_DICETAK' &&
                    request.printedBy && (
                      <div className="text-[10px] text-blue-700 mt-2">
                        Sedang dikerjakan oleh:{' '}
                        <strong>{request.printedBy}</strong>
                        {request.printedAt
                          ? ` • ${formatDate(request.printedAt)}`
                          : ''}
                      </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {request.status !== 'DITOLAK' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDocument(request)
                      }
                      disabled={openingId === request.id}
                      className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {request.fileType === 'url/link' ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Buka File
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>

                  {request.status === 'DISETUJUI' && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePrintStatus(
                          request,
                          'SEDANG_DICETAK'
                        )
                      }
                      disabled={processingId === request.id}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Proses Fotokopi
                    </button>
                  )}

                  {request.status === 'SEDANG_DICETAK' && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePrintStatus(request, 'SELESAI')
                      }
                      disabled={processingId === request.id}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4 z-10">
              <div>
                {statusBadge(selectedRequest)}
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
              {isOverdue(selectedRequest) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-xs font-bold flex items-center gap-2">
                  <Clock3 className="w-4 h-4" />
                  Target cetak sudah terlewati. Mohon diprioritaskan.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info
                  label="Nama Guru"
                  value={selectedRequest.teacherName}
                />
                <Info
                  label="Kelas / Mata Pelajaran"
                  value={selectedRequest.subjectClass}
                />
                <Info
                  label="Tanggal Diperlukan"
                  value={formatDate(selectedRequest.targetDate)}
                />
                <Info
                  label="Jumlah"
                  value={`${selectedRequest.pagesCount} halaman × ${selectedRequest.copiesCount} salinan`}
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
                      : 'Berwarna'
                  } • ${
                    selectedRequest.printSide === 'DOUBLE'
                      ? '2 Sisi'
                      : '1 Sisi'
                  }`}
                />
              </div>

              {selectedRequest.reviewedBy && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    Sudah Disetujui Kepsek / Wakasek
                  </div>
                  <div className="text-[11px] text-green-700 mt-2">
                    Oleh:{' '}
                    <strong>{selectedRequest.reviewedBy}</strong>
                    {selectedRequest.reviewedAt
                      ? ` • ${formatDate(
                          selectedRequest.reviewedAt
                        )}`
                      : ''}
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <DetailBox
                  label="Catatan Guru"
                  value={selectedRequest.notes}
                />
              )}

              {selectedRequest.approvalNotes &&
                selectedRequest.status !== 'DITOLAK' && (
                  <DetailBox
                    label="Catatan Persetujuan Kepala Sekolah"
                    value={selectedRequest.approvalNotes}
                  />
                )}

              <button
                  type="button"
                  onClick={() =>
                    handleOpenDocument(selectedRequest)
                  }
                  disabled={openingId === selectedRequest.id}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {selectedRequest.status === 'SELESAI'
                    ? 'Buka File Riwayat Fotokopi'
                    : 'Buka Dokumen untuk Dicetak'}
                </button>

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
                  Proses Fotokopi Sekarang
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
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <History className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-800">
                    PERNAH DIFOTOKOPI
                  </div>
                  {selectedRequest.completedAt && (
                    <div className="text-[11px] text-slate-500 mt-2">
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

const QueueCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className: string;
}> = ({
  title,
  value,
  icon,
  active,
  onClick,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-xl border p-4 shadow-sm transition-all ${className} ${
      active
        ? 'ring-2 ring-slate-900 ring-offset-1'
        : ''
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase font-bold">
        {title}
      </span>
      {icon}
    </div>

    <div className="text-2xl font-extrabold mt-2">
      {value}
    </div>
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  suffix: string;
  dark?: boolean;
}> = ({ label, value, suffix, dark = false }) => (
  <div
    className={`rounded-xl border p-4 ${
      dark
        ? 'bg-slate-900 border-slate-800 text-white'
        : 'bg-slate-50 border-slate-200 text-slate-900'
    }`}
  >
    <div className={`text-[10px] uppercase font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
      {label}
    </div>
    <div className="text-2xl font-extrabold mt-1">
      {value} <span className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{suffix}</span>
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
    <div className="text-[9px] uppercase font-bold text-slate-400">{label}</div>
    <div className="text-sm font-bold text-slate-800 mt-0.5">{value} lembar</div>
  </div>
);

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
