/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Navbar } from './components/Navbar';
import { DriveFolderBanner } from './components/DriveFolderBanner';
import { DashboardStats } from './components/DashboardStats';
import { TrainingList } from './components/TrainingList';
import { TrainingFormModal } from './components/TrainingFormModal';
import { TrainingDetailModal } from './components/TrainingDetailModal';
import { TeacherAnalytics } from './components/TeacherAnalytics';
import { IntegrationStatusPage } from './components/IntegrationStatusPage';
import { INITIAL_TEACHERS } from './data/initialData';
import { Teacher, TrainingRecord, DRIVE_FOLDERS } from './types';

type AppTab = 'dashboard' | 'list' | 'analytics' | 'integration';

const TAB_PATHS: Record<AppTab, string> = {
  dashboard: '/',
  list: '/daftar-pelatihan',
  analytics: '/analisis-guru',
  integration: '/status-integrasi',
};

const PAGE_TITLES: Record<AppTab, string> = {
  dashboard: 'Dashboard | Arsip Pelatihan Guru SD',
  list: 'Daftar Pelatihan | Arsip Pelatihan Guru SD',
  analytics: 'Analisis Guru | Arsip Pelatihan Guru SD',
  integration: 'Status Integrasi | Arsip Pelatihan Guru SD',
};

const getTabFromPath = (pathname: string): AppTab => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const matchedEntry = (Object.entries(TAB_PATHS) as [AppTab, string][]).find(
    ([, path]) => path === normalizedPath,
  );

  return matchedEntry?.[0] || 'dashboard';
};

export default function App() {
  // Persistence with localStorage
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('lazuardi_teachers');
    const validNamesSet = new Set(INITIAL_TEACHERS.map(t => t.name.toLowerCase().trim()));
    
    let rawList: Teacher[] = INITIAL_TEACHERS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(t => t && typeof t.name === 'string' && t.name.trim() !== '' && validNamesSet.has(t.name.toLowerCase().trim()));
          const existingNames = new Set(filtered.map(t => t.name.toLowerCase().trim()));
          const missing = INITIAL_TEACHERS.filter(t => !existingNames.has(t.name.toLowerCase().trim()));
          rawList = [...filtered, ...missing];
        }
      } catch {
        rawList = INITIAL_TEACHERS;
      }
    }

    const seenIds = new Set<string>();
    return rawList.map((t, idx) => {
      if (!t.id || seenIds.has(t.id)) {
        const uniqueId = `t_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        return { ...t, id: uniqueId };
      }
      seenIds.add(t.id);
      return t;
    });
  });

  const [trainings, setTrainings] = useState<TrainingRecord[]>(() => {
    const saved = localStorage.getItem('lazuardi_trainings');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // UI state
  const [activeTab, setActiveTabState] = useState<AppTab>(() => getTabFromPath(window.location.pathname));

  const setActiveTab = useCallback((tab: AppTab) => {
    const nextPath = TAB_PATHS[tab];

    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab }, '', nextPath);
    }

    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep the visible menu in sync with the browser URL, including Back/Forward.
  useEffect(() => {
    const syncTabWithUrl = () => {
      const nextTab = getTabFromPath(window.location.pathname);
      setActiveTabState(nextTab);
      document.title = PAGE_TITLES[nextTab];
    };

    const currentTab = getTabFromPath(window.location.pathname);
    const canonicalPath = TAB_PATHS[currentTab];

    // Unknown paths return to the dashboard instead of leaving the app in an
    // inconsistent state. Valid routes remain shareable and refresh-safe.
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({ tab: currentTab }, '', canonicalPath);
    }

    syncTabWithUrl();
    window.addEventListener('popstate', syncTabWithUrl);

    return () => window.removeEventListener('popstate', syncTabWithUrl);
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLES[activeTab];
  }, [activeTab]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('lazuardi_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('lazuardi_trainings', JSON.stringify(trainings));
  }, [trainings]);

  // Load the shared archive from Supabase through the server. LocalStorage is
  // kept as an offline fallback so a temporary database issue does not erase
  // records already visible on this device.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/trainings')
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || 'Gagal membaca arsip dari Supabase.');
        }
        return data.records as TrainingRecord[];
      })
      .then(records => {
        if (cancelled || !Array.isArray(records)) return;

        // Supabase is the source of truth. Keep a backup of any older local
        // archive before replacing the UI with the shared database records.
        if (trainings.length > 0) {
          localStorage.setItem(
            'lazuardi_trainings_local_backup',
            JSON.stringify(trainings),
          );
        }

        setTrainings(records);
      })
      .catch(error => {
        console.warn('[Training Archive] Menggunakan cache lokal:', error?.message || error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Toast notifier
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Add teacher
  const handleAddTeacher = (newTeacher: Teacher) => {
    setTeachers(prev => [...prev, newTeacher]);
    showToast(`Guru "${newTeacher.name}" berhasil ditambahkan ke roster sekolah.`);
  };

  // Save or update training
  const handleSaveTraining = async (recordData: Omit<TrainingRecord, 'id' | 'createdAt'> & { id?: string }) => {
    const targetId = recordData.id || `tr-${crypto.randomUUID()}`;
    const existingRecord = trainings.find(item => item.id === targetId);
    const localRecord: TrainingRecord = {
      ...(existingRecord || {} as TrainingRecord),
      ...recordData,
      id: targetId,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
    };

    // IMPORTANT: do not mark the archive as saved locally before Supabase
    // confirms the write. This prevents a teacher from seeing a "saved"
    // record that is actually missing from the shared database.
    try {
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok || !data?.record) {
        throw new Error(data?.message || 'Supabase belum dapat menyimpan arsip pelatihan.');
      }

      const savedRecord = data.record as TrainingRecord;
      setTrainings(prev => {
        const exists = prev.some(item => item.id === targetId);
        return exists
          ? prev.map(item => item.id === targetId ? savedRecord : item)
          : [savedRecord, ...prev];
      });
      showToast(existingRecord
        ? 'Data pelatihan berhasil diperbarui di Supabase!'
        : 'Pelatihan guru berhasil diarsipkan ke database pusat!');
      setEditingRecord(null);
      return savedRecord;
    } catch (error: any) {
      console.error('[Training Save] Supabase gagal:', error?.message || error);
      // Re-throw so TrainingFormModal keeps the form open and shows the real
      // error instead of silently closing after only saving to localStorage.
      throw new Error(
        error?.message ||
        'Data belum berhasil masuk ke database pusat. Form tetap terbuka; silakan coba simpan lagi.'
      );
    }
  };

  // Delete training
  const handleDeleteTraining = async (id: string) => {
    try {
      const response = await fetch(`/api/trainings/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Gagal menghapus data dari Supabase.');
      }
      setTrainings(prev => prev.filter(t => t.id !== id));
      showToast('Data pelatihan dihapus dari arsip Supabase.');
    } catch (error: any) {
      console.error('[Training Delete] Supabase gagal:', error?.message || error);
      showToast(`Data belum dihapus karena database gagal: ${error?.message || 'coba lagi'}`);
    }
  };

  // Update AI Plan for record
  const handleUpdateRecordAiPlan = (recordId: string, aiSummary: string, aiActionPlan: string[]) => {
    setTrainings(prev =>
      prev.map(item =>
        item.id === recordId
          ? { ...item, aiSummary, aiActionPlan }
          : item
      )
    );
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord(prev => prev ? { ...prev, aiSummary, aiActionPlan } : null);
    }
    showToast('Rencana Aksi AI Gemini berhasil disusun!');
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = trainings.map(t => ({
      'Nama Guru': t.teacherName,
      'Peran / Jabatan': t.teacherRole,
      'Nama Pelatihan': t.trainingName,
      'Penyelenggara': t.organizer,
      'Kategori Pelatihan': t.category,
      'Tanggal Pelaksanaan': t.startDate,
      'Tanggal Selesai': t.endDate,
      'Jam Pelajaran (JP)': t.hours,
      'Lokasi': t.location,
      'Catatan & Ringkasan': t.notes || '',
      'Link Sertifikat Drive': t.certificateDriveUrl || DRIVE_FOLDERS.CERTIFICATES,
      'Link Bahan Materi': t.materialDriveUrl || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pelatihan Guru SD Lazuardi');
    XLSX.writeFile(workbook, `Rekap_Pelatihan_Guru_SD_Lazuardi_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Laporan rekapitulasi Excel berhasil diunduh!');
  };

  const handleSelectCategoryFromDash = (cat: string) => {
    setSelectedCategory(cat);
    setActiveTab('list');
  };

  const handleFilterByTeacherFromAnalytics = (name: string) => {
    setActiveTab('list');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C3327] font-sans flex flex-col antialiased">
      {/* Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingRecord(null);
          setIsFormOpen(true);
        }}
        onExportExcel={handleExportExcel}
        totalRecords={trainings.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Drive Sync Banner */}
        <DriveFolderBanner />

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardStats
            trainings={trainings}
            teachers={teachers}
            onNavigateToList={() => setActiveTab('list')}
            onOpenAddModal={() => {
              setEditingRecord(null);
              setIsFormOpen(true);
            }}
            onSelectCategory={handleSelectCategoryFromDash}
          />
        )}

        {activeTab === 'list' && (
          <TrainingList
            trainings={trainings}
            onSelectRecord={record => setSelectedRecord(record)}
            onEditRecord={record => {
              setEditingRecord(record);
              setIsFormOpen(true);
            }}
            onDeleteRecord={handleDeleteTraining}
            selectedCategoryFromDash={selectedCategory}
            onResetCategoryFilter={() => setSelectedCategory('Semua')}
          />
        )}

        {activeTab === 'analytics' && (
          <TeacherAnalytics
            teachers={teachers}
            trainings={trainings}
            onAddTeacher={handleAddTeacher}
            onFilterByTeacher={handleFilterByTeacherFromAnalytics}
          />
        )}

        {activeTab === 'integration' && <IntegrationStatusPage />}
      </main>

      {/* Footer */}
      <footer className="bg-[#F2EFE9] border-t border-[#E5E2D9] text-xs text-[#7A756D] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#1c59c6]">SD Lazuardi Global Compassionate School</span>
            <span>•</span>
            <span>Arsip Pelatihan & Sertifikat Guru</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href={DRIVE_FOLDERS.CERTIFICATES} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#1c59c6] font-semibold">
              Drive Sertifikat
            </a>
            <a href={DRIVE_FOLDERS.MATERIALS} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#1c59c6] font-semibold">
              Drive Materi
            </a>
          </div>
        </div>
      </footer>

      {/* Form Modal */}
      <TrainingFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveTraining}
        initialData={editingRecord}
        teachers={teachers}
        onAddTeacher={handleAddTeacher}
      />

      {/* Detail Pelatihan Modal */}
      <TrainingDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdateRecordAiPlan={handleUpdateRecordAiPlan}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
