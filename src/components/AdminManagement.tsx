import React, { useState, useEffect } from 'react';
import { PhotocopyRequest } from '../types';
import { Building2, Download, Trash2, Search, RefreshCw, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const [requests, setRequests] = useState<PhotocopyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error('Error loading admin list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Yakin ingin menghapus pengajuan ${id}?`)) return;

    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMsg(`Pengajuan ${id} berhasil dihapus.`);
        fetchAllRequests();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleExportCSV = () => {
    if (requests.length === 0) return;

    const headers = ['Tracking ID', 'Tanggal Submission', 'Nama Guru', 'Mata Pelajaran', 'Judul', 'Halaman', 'Salinan', 'Total HVS', 'Ukuran', 'Warna', 'Sisi', 'Status', 'Catatan Kepsek'];
    const rows = requests.map((r) => [
      r.id,
      new Date(r.submittedAt).toLocaleDateString('id-ID'),
      `"${r.teacherName}"`,
      `"${r.subjectClass}"`,
      `"${r.title}"`,
      r.pagesCount,
      r.copiesCount,
      r.totalSheets,
      r.paperSize,
      r.colorOption,
      r.printSide,
      r.status,
      `"${r.rejectionReason || r.approvalNotes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Fotokopi_Lazuardi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = requests.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Administrator Kurikulum</span>
          </div>
          <h2 className="text-2xl font-bold">Kelola System & Rekap Pengajuan</h2>
          <p className="text-xs text-slate-300">
            Ekspor rekapitulasi data pengajuan fotokopi seluruh guru untuk pertanggungjawaban kuota kertas sekolah.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan (CSV / Excel)</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-900 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="font-bold underline">Tutup</button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 text-base">Seluruh Pengajuan ({filtered.length})</h3>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Tracking ID</th>
                <th className="py-3 px-4">Guru & Mapel</th>
                <th className="py-3 px-4">Judul Dokumen</th>
                <th className="py-3 px-4">Total HVS</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{req.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{req.teacherName}</div>
                    <div className="text-[10px] text-slate-500">{req.subjectClass}</div>
                  </td>
                  <td className="py-3 px-4 truncate max-w-xs font-medium text-slate-800">{req.title}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{req.totalSheets} Lembar</td>
                  <td className="py-3 px-4 font-bold text-[10px]">
                    <span className="px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
