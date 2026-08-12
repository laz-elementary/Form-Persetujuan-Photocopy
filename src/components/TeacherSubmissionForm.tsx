import React, { useState } from 'react';
import { PaperSize, ColorOption, PrintSide, Urgency, PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';
import { FileUp, Calculator, AlertCircle, CheckCircle2, Clock, Info, ShieldAlert, Sparkles, FileText, ArrowRight, ExternalLink, Folder, Link as LinkIcon } from 'lucide-react';

interface FormProps {
  onSubmitted: (request: PhotocopyRequest) => void;
  onGoToTrack: (trackingCode: string) => void;
}

export const LAZUARDI_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN?usp=drive_link';

export const TeacherSubmissionForm: React.FC<FormProps> = ({ onSubmitted, onGoToTrack }) => {
  // Form state
  const [teacherName, setTeacherName] = useState('');
  const [subjectClass, setSubjectClass] = useState('');
  const [title, setTitle] = useState('');

  // File & Document Source state
  const [docSourceType, setDocSourceType] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  // Print spec state
  const [pagesCount, setPagesCount] = useState<number>(4);
  const [copiesCount, setCopiesCount] = useState<number>(30);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [colorOption, setColorOption] = useState<ColorOption>('BW');
  const [printSide, setPrintSide] = useState<PrintSide>('DOUBLE');
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [targetDate, setTargetDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<PhotocopyRequest | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate total sheets
  const calculatedSheets = printSide === 'DOUBLE' 
    ? Math.ceil(pagesCount / 2) * copiesCount 
    : pagesCount * copiesCount;

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    
    // Format size
    const sizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
    setFileSize(sizeInMB + ' MB');

    // Heuristic for default page count based on size or filename
    if (selectedFile.name.toLowerCase().includes('lks') || selectedFile.name.toLowerCase().includes('modul')) {
      setPagesCount(8);
    } else if (selectedFile.name.toLowerCase().includes('kuis') || selectedFile.name.toLowerCase().includes('soal')) {
      setPagesCount(2);
    } else {
      setPagesCount(4);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMsg('');

  // =====================================================
  // VALIDASI FORM
  // =====================================================

  if (!teacherName.trim()) {
    setErrorMsg('Nama Lengkap Guru wajib diisi.');
    return;
  }

  if (!subjectClass.trim()) {
    setErrorMsg('Kelas / Target Pembelajaran wajib diisi.');
    return;
  }

  if (!title.trim()) {
    setErrorMsg('Judul Bahan Ajar / Materi wajib diisi.');
    return;
  }

  if (docSourceType === 'UPLOAD' && !file) {
    setErrorMsg('Dokumen file wajib diunggah.');
    return;
  }

  if (docSourceType === 'URL' && !fileUrlInput.trim()) {
    setErrorMsg('Tautan link URL dokumen wajib diisi.');
    return;
  }

  if (pagesCount <= 0 || copiesCount <= 0) {
    setErrorMsg(
      'Jumlah halaman dan jumlah salinan harus lebih dari 0.'
    );
    return;
  }

  // Maksimal 20 MB
  if (
    docSourceType === 'UPLOAD' &&
    file &&
    file.size > 20 * 1024 * 1024
  ) {
    setErrorMsg(
      'Ukuran file terlalu besar. Maksimal 20 MB.'
    );
    return;
  }

  setIsSubmitting(true);

  try {
    // =====================================================
    // BUAT TRACKING CODE
    // contoh:
    // REQ-20260812-ABC123
    // =====================================================

    const jakartaDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .replace(/-/g, '');

    const randomCode = crypto
      .randomUUID()
      .replace(/-/g, '')
      .substring(0, 6)
      .toUpperCase();

    const trackingCode =
      `REQ-${jakartaDate}-${randomCode}`;

    // =====================================================
    // SIAPKAN URL / STORAGE PATH
    // =====================================================

    let finalFileUrl: string | undefined;
    let finalFileName: string;
    let finalFileSize: string;
    let finalFileType: string;

    // =====================================================
    // JIKA GURU UPLOAD FILE
    // =====================================================

    if (docSourceType === 'UPLOAD' && file) {
      const safeFileName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');

      const storagePath =
        `${trackingCode}/${safeFileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from('photocopy-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type || 'application/octet-stream',
          });

      if (uploadError) {
        console.error(
          'Storage upload error:',
          uploadError
        );

        throw new Error(
          `Gagal mengunggah dokumen: ${uploadError.message}`
        );
      }

      // Karena bucket PRIVATE,
      // kita hanya simpan path file.
      finalFileUrl = storagePath;

      finalFileName = file.name;

      finalFileSize =
        `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      finalFileType =
        file.type || 'application/octet-stream';
    }

    // =====================================================
    // JIKA GURU MENGGUNAKAN LINK
    // =====================================================

    else {
      let formattedUrl = fileUrlInput.trim();

      if (
        !formattedUrl.startsWith('http://') &&
        !formattedUrl.startsWith('https://')
      ) {
        formattedUrl =
          `https://${formattedUrl}`;
      }

      finalFileUrl = formattedUrl;
      finalFileName =
        `[LINK URL] ${title.trim()}`;
      finalFileSize =
        'Tautan Link URL';
      finalFileType =
        'url/link';
    }

    // =====================================================
    // SIMPAN DATA KE DATABASE SUPABASE
    // =====================================================

    const { error: insertError } =
      await supabase
        .from('photocopy_requests')
        .insert({
          id: trackingCode,

          teacher_name:
            teacherName.trim(),

          subject_class:
            subjectClass.trim(),

          title:
            title.trim(),

          file_name:
            finalFileName,

          file_size:
            finalFileSize,

          file_type:
            finalFileType,

          file_url:
            finalFileUrl,

          drive_folder_url:
            LAZUARDI_DRIVE_FOLDER_URL,

          pages_count:
            pagesCount,

          copies_count:
            copiesCount,

          total_sheets:
            calculatedSheets,

          paper_size:
            paperSize,

          color_option:
            colorOption,

          print_side:
            printSide,

          urgency:
            urgency,

          target_date:
            targetDate,

          notes:
            notes.trim() || null,

          status:
            'MENUNGGU',
        });

    if (insertError) {
      console.error(
        'Database insert error:',
        insertError
      );

      throw new Error(
        `Gagal menyimpan pengajuan: ${insertError.message}`
      );
    }

    // =====================================================
    // BENTUK DATA UNTUK UI
    // =====================================================

    const newRequest: PhotocopyRequest = {
      id:
        trackingCode,

      teacherName:
        teacherName.trim(),

      subjectClass:
        subjectClass.trim(),

      title:
        title.trim(),

      fileName:
        finalFileName,

      fileSize:
        finalFileSize,

      fileType:
        finalFileType,

      fileUrl:
        finalFileUrl,

      driveFolderUrl:
        LAZUARDI_DRIVE_FOLDER_URL,

      pagesCount,
      copiesCount,

      totalSheets:
        calculatedSheets,

      paperSize,
      colorOption,
      printSide,
      urgency,

      targetDate,

      notes:
        notes.trim() || undefined,

      status:
        'MENUNGGU',

      submittedAt:
        new Date().toISOString(),
    };

    // =====================================================
    // SUKSES
    // =====================================================

    setSubmittedResult(newRequest);

    onSubmitted(newRequest);

  } catch (err: any) {
    console.error(
      'Submit error:',
      err
    );

    setErrorMsg(
      err?.message ||
        'Terjadi kesalahan saat mengirim pengajuan.'
    );
  } finally {
    setIsSubmitting(false);
  }
};
    }

    setIsSubmitting(true);

    try {
      let formattedUrl = fileUrlInput.trim();
      if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      const payload = {
        teacherName,
        subjectClass,
        title,
        fileName: docSourceType === 'UPLOAD' ? (fileName || 'Bahan_Ajar.pdf') : `[LINK URL] ${title || 'Materi Online'}`,
        fileSize: docSourceType === 'UPLOAD' ? (fileSize || '1.2 MB') : 'Tautan Link URL',
        fileType: docSourceType === 'UPLOAD' ? (file ? file.type : 'application/pdf') : 'url/link',
        fileDataUrl: docSourceType === 'UPLOAD' ? fileDataUrl : undefined,
        fileUrl: docSourceType === 'URL' ? formattedUrl : undefined,
        driveFolderUrl: LAZUARDI_DRIVE_FOLDER_URL,
        pagesCount,
        copiesCount,
        paperSize,
        colorOption,
        printSide,
        urgency,
        targetDate,
        notes,
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (json.success && json.data) {
        setSubmittedResult(json.data);
        onSubmitted(json.data);
      } else {
        setErrorMsg(json.message || 'Gagal mengirim pengajuan. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMsg('Terjadi kesalahan jaringan/server saat mengirim form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Intro Header */}
      <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Akses Publik Guru - Bebas Login</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Form Pengajuan Percetakan & Fotokopi Bahan Ajar
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Silakan unggah dokumen materi pembelajaran dan atur rincian salinan. Pengajuan Anda akan otomatis diteruskan ke portal <strong className="text-blue-300 font-semibold">Kepala Sekolah</strong> untuk ditinjau dan disetujui.
            </p>
          </div>
        </div>

        {/* Workflow Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <div className="font-semibold text-white">Guru Isi Form</div>
              <div className="text-slate-400 text-[11px]">Unggah file & spesifikasi</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">2</div>
            <div>
              <div className="font-semibold text-white">Review Kepsek</div>
              <div className="text-slate-400 text-[11px]">Acc / Tolak via Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <div className="font-semibold text-white">Tim Resource Cetak</div>
              <div className="text-slate-400 text-[11px]">Tunjukkan bukti digital</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Section 1: Identitas Pengaju */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Identitas Pengaju</h3>
              <p className="text-xs text-slate-500">Masukkan nama lengkap dan kelas target pembelajaran</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap Guru <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: Ahmad Fauzi, S.Pd."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kelas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: Kelas 8A, 8B & 8C"
                value={subjectClass}
                onChange={(e) => setSubjectClass(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Unggah Dokumen Bahan Ajar & Sync Google Drive */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Dokumen Bahan Ajar / Materi</h3>
              <p className="text-xs text-slate-500">Unggah file atau sambungkan dengan Google Drive Repository Lazuardi</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Google Drive Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-2">
                    <span>Google Drive Folder Repository Bahan Ajar</span>
                    <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/40 px-1.5 py-0.2 rounded font-bold">Terhubung</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Bahan ajar dapat diunggah langsung di sini atau dimasukkan ke folder Drive resmi Lazuardi.
                  </p>
                </div>
              </div>

              <a
                href={LAZUARDI_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-sm"
              >
                <span>Buka Folder Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Judul / Nama Materi Bahan Ajar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: Modul Praktikum Sistem Peredaran Darah Manusia & Soal Latihan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Document Source Type Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Metode Dokumen Bahan Ajar:
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDocSourceType('UPLOAD')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    docSourceType === 'UPLOAD'
                      ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-4 h-4 text-blue-600" />
                  <span>Unggah File Dokumen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocSourceType('URL')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    docSourceType === 'URL'
                      ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  <span>Sematkan Link URL Dokumen</span>
                </button>
              </div>
            </div>

            {/* Upload File vs Link URL Inputs */}
            {docSourceType === 'UPLOAD' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unggah File Dokumen Bahan Ajar <span className="text-red-500">*</span>
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/60'
                      : fileName
                      ? 'border-blue-300 bg-slate-50'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  {fileName ? (
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden text-left">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-900 truncate">{fileName}</p>
                          <p className="text-xs text-slate-500">{fileSize || 'Dokumen Siap Cetak'}</p>
                        </div>
                      </div>
                      <label className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors border border-blue-200 shrink-0">
                        Ganti File
                        <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <FileUp className="w-10 h-10 mx-auto text-blue-600 mb-2 opacity-80" />
                      <p className="text-sm font-semibold text-slate-800">
                        Tarik & Lepas File di Sini atau <span className="text-blue-600 underline cursor-pointer font-bold">Cari di Perangkat</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Mendukung PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), PNG, JPG (Maks. 25MB)
                      </p>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                        className="hidden"
                        id="file-upload-input"
                      />
                      <label
                        htmlFor="file-upload-input"
                        className="inline-block mt-3 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer transition-colors"
                      >
                        Pilih Dokumen
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tautan Link URL Dokumen (Google Drive, Canva, Dropbox, OneDrive, atau Web) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/... atau https://canva.com/design/..."
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono text-slate-900 font-medium"
                    />
                    <LinkIcon className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pastikan hak akses tautan diatur ke <strong>"Siapa saja yang memiliki link dapat melihat"</strong> agar dapat dibuka saat dicetak.</span>
                  </p>
                </div>

                {/* Quick Platform Shortcuts */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">Pintasan Platform Penyimpanan:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFileUrlInput('https://drive.google.com/')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Folder className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Drive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileUrlInput('https://www.canva.com/')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Canva Design</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileUrlInput('https://www.dropbox.com/')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Dropbox / OneDrive</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Rincian Cetak & Estimasi Kertas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Spesifikasi & Rincian Cetak</h3>
                <p className="text-xs text-slate-500">Atur ukuran kertas, mode warna, dan jumlah eksemplar</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Halaman Dokumen
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={pagesCount}
                    onChange={(e) => setPagesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-semibold"
                  />
                  <span className="text-[11px] text-slate-400">Hal. per file</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Salinan (Eksemplar)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={copiesCount}
                    onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-semibold"
                  />
                  <span className="text-[11px] text-slate-400">Salinan/siswa</span>
                </div>
              </div>

              {/* Ukuran Kertas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ukuran Kertas</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A4', 'F4', 'A3'] as PaperSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPaperSize(size)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                        paperSize === size
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {size === 'F4' ? 'F4 / Folio' : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Warna */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mode Warna</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorOption('BW')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between ${
                      colorOption === 'BW'
                        ? 'bg-blue-50 text-blue-900 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Hitam Putih (B/W)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 font-bold">Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorOption('COLOR')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-left flex items-center justify-between ${
                      colorOption === 'COLOR'
                        ? 'bg-purple-50 text-purple-900 border-purple-500 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Cetak Berwarna</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 font-bold">Full Color</span>
                  </button>
                </div>
              </div>

              {/* Sisi Cetak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sisi Pencetakan Kertas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintSide('DOUBLE')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-left ${
                      printSide === 'DOUBLE'
                        ? 'bg-blue-50 text-blue-900 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">2 Sisi (Bolak-Balik)</div>
                    <div className="text-[10px] text-blue-700">Hemat 50% kertas HVS</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintSide('SINGLE')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-left ${
                      printSide === 'SINGLE'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">1 Sisi (Simplex)</div>
                    <div className="text-[10px] text-slate-400">Satu muka halaman</div>
                  </button>
                </div>
              </div>

              {/* Tanggal & Urgensi */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Diperlukan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Urgensi</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as Urgency)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold"
                  >
                    <option value="NORMAL">Normal (1-2 Hari)</option>
                    <option value="TINGGI">Tinggi (Segera / Hari Ini)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Calculation & Paper Summary Box */}
            <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-4 pb-2 border-b border-slate-800">
                  <Calculator className="w-4 h-4" />
                  <span>Kalkulasi Otomatis Lembar Kertas</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Jumlah Halaman File:</span>
                    <span className="font-semibold text-white">{pagesCount} halaman</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Jumlah Eksemplar:</span>
                    <span className="font-semibold text-white">{copiesCount} salinan</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Mode Pencetakan:</span>
                    <span className="font-semibold text-blue-400">
                      {printSide === 'DOUBLE' ? '2 Sisi (Bolak-Balik)' : '1 Sisi (Simplex)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Ukuran & Warna:</span>
                    <span className="font-semibold text-white">
                      {paperSize} - {colorOption === 'COLOR' ? 'Berwarna' : 'Hitam Putih'}
                    </span>
                  </div>
                </div>

                {/* Big Metric Display */}
                <div className="my-5 p-4 bg-slate-800/90 rounded-lg border border-slate-700/80 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Total Kebutuhan Kertas HVS
                  </div>
                  <div className="text-3xl font-bold text-blue-400 my-1">
                    {calculatedSheets} <span className="text-sm font-normal text-slate-300">Lembar</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {printSide === 'DOUBLE'
                      ? `Math.ceil(${pagesCount}/2) × ${copiesCount} salinan`
                      : `${pagesCount} × ${copiesCount} salinan`}
                  </p>
                </div>
              </div>

              {/* Notes Input */}
              <div className="mt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Tambahan untuk Tim Resource:
                </label>
                <textarea
                  rows={2}
                  placeholder="misal: Harap dijilid staples di pojok kiri atas / pemotongan kertas"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Pengajuan akan dikirim langsung ke Kepala Sekolah. Kode pelacakan akan otomatis dibuat.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengirim Form...</span>
              </>
            ) : (
              <>
                <span>Kirim Pengajuan Ke Kepala Sekolah</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Confirmation Modal */}
      {submittedResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-16 h-16 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4 border border-green-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
              Pengajuan Berhasil Dikirim!
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Permintaan cetak Anda sedang diajukan ke Kepala Sekolah untuk peninjauan.
            </p>

            <div className="bg-slate-900 text-white p-5 rounded-xl text-center mb-6 relative overflow-hidden">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">KODE PELAKACAKAN PENGAJUAN (TRACKING ID)</div>
              <div className="text-2xl font-mono font-bold text-blue-400 my-1 tracking-wider">
                {submittedResult.id}
              </div>
              <div className="text-[11px] text-slate-400">
                Gunakan kode ini untuk mengecek status persetujuan kapan saja.
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Judul Bahan:</span>
                <span className="font-semibold text-slate-800">{submittedResult.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pengaju:</span>
                <span className="font-semibold text-slate-800">{submittedResult.teacherName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Cetak:</span>
                <span className="font-semibold text-slate-800">
                  {submittedResult.copiesCount} salinan ({submittedResult.totalSheets} lembar)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Saat Ini:</span>
                <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] uppercase">
                  MENUNGGU
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSubmittedResult(null);
                  setTitle('');
                  setFileName('');
                  setNotes('');
                }}
                className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-colors"
              >
                Buat Pengajuan Baru
              </button>

              <button
                onClick={() => {
                  const code = submittedResult.id;
                  setSubmittedResult(null);
                  onGoToTrack(code);
                }}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
              >
                Lacak Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
