import React, { useState } from 'react';
import {
  PaperSize,
  ColorOption,
  PrintSide,
  Urgency,
  PhotocopyRequest,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  FileUp,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  FileText,
  ArrowRight,
  ExternalLink,
  Folder,
  Link as LinkIcon,
  Mail,
  User,
  School,
  Copy,
} from 'lucide-react';

interface FormProps {
  onSubmitted: (request: PhotocopyRequest) => void;
  onGoToTrack: (trackingCode: string) => void;
}

export const LAZUARDI_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN?usp=drive_link';

export const TeacherSubmissionForm: React.FC<FormProps> = ({
  onSubmitted,
  onGoToTrack,
}) => {
  // =====================================================
  // IDENTITAS
  // =====================================================

  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [subjectClass, setSubjectClass] = useState('');
  const [title, setTitle] = useState('');

  // =====================================================
  // DOKUMEN
  // =====================================================

  const [docSourceType, setDocSourceType] =
    useState<'UPLOAD' | 'URL'>('UPLOAD');

  const [fileUrlInput, setFileUrlInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // =====================================================
  // SPESIFIKASI CETAK
  // =====================================================

  const [pagesCount, setPagesCount] = useState<number>(4);
  const [copiesCount, setCopiesCount] = useState<number>(30);

  const [paperSize, setPaperSize] =
    useState<PaperSize>('A4');

  const [colorOption, setColorOption] =
    useState<ColorOption>('BW');

  const [printSide, setPrintSide] =
    useState<PrintSide>('DOUBLE');

  const [urgency, setUrgency] =
    useState<Urgency>('NORMAL');

  const [targetDate, setTargetDate] =
    useState<string>(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    });

  const [notes, setNotes] = useState('');

  // =====================================================
  // UI
  // =====================================================

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submittedResult, setSubmittedResult] =
    useState<PhotocopyRequest | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // =====================================================
  // KALKULASI
  // =====================================================

  const calculatedSheets =
    printSide === 'DOUBLE'
      ? Math.ceil(pagesCount / 2) * copiesCount
      : pagesCount * copiesCount;

  // =====================================================
  // FILE HANDLING
  // =====================================================

  const processSelectedFile = (
    selectedFile: File
  ) => {
    setErrorMsg('');

    if (
      selectedFile.size >
      20 * 1024 * 1024
    ) {
      setErrorMsg(
        'Ukuran file terlalu besar. Maksimal 20 MB.'
      );

      setFile(null);
      setFileName('');
      setFileSize('');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);

    const sizeInMB = (
      selectedFile.size /
      (1024 * 1024)
    ).toFixed(1);

    setFileSize(`${sizeInMB} MB`);

    const lowerName =
      selectedFile.name.toLowerCase();

    if (
      lowerName.includes('lks') ||
      lowerName.includes('modul')
    ) {
      setPagesCount(8);
    } else if (
      lowerName.includes('kuis') ||
      lowerName.includes('soal')
    ) {
      setPagesCount(2);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      e.target.files &&
      e.target.files[0]
    ) {
      processSelectedFile(
        e.target.files[0]
      );
    }
  };

  const handleDrag = (
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      e.type === 'dragenter' ||
      e.type === 'dragover'
    ) {
      setDragActive(true);
    } else if (
      e.type === 'dragleave'
    ) {
      setDragActive(false);
    }
  };

  const handleDrop = (
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (
      e.dataTransfer.files &&
      e.dataTransfer.files[0]
    ) {
      processSelectedFile(
        e.dataTransfer.files[0]
      );
    }
  };

  // =====================================================
  // VALIDASI EMAIL
  // =====================================================

  const normalizeEmail = (
    value: string
  ) => value.trim().toLowerCase();

  const isValidEmail = (
    value: string
  ) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setErrorMsg('');

    const normalizedEmail =
      normalizeEmail(teacherEmail);

    if (!teacherName.trim()) {
      setErrorMsg(
        'Nama Lengkap Guru wajib diisi.'
      );
      return;
    }

    if (!normalizedEmail) {
      setErrorMsg(
        'Email Guru wajib diisi.'
      );
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMsg(
        'Format Email Guru tidak valid.'
      );
      return;
    }

    if (!subjectClass.trim()) {
      setErrorMsg(
        'Kelas wajib diisi.'
      );
      return;
    }

    if (!title.trim()) {
      setErrorMsg(
        'Judul Bahan Ajar / Materi wajib diisi.'
      );
      return;
    }

    if (
      docSourceType === 'UPLOAD' &&
      !file
    ) {
      setErrorMsg(
        'Dokumen file wajib diunggah.'
      );
      return;
    }

    if (
      docSourceType === 'URL' &&
      !fileUrlInput.trim()
    ) {
      setErrorMsg(
        'Tautan URL dokumen wajib diisi.'
      );
      return;
    }

    if (
      pagesCount <= 0 ||
      copiesCount <= 0
    ) {
      setErrorMsg(
        'Jumlah halaman dan salinan harus lebih dari 0.'
      );
      return;
    }

    setIsSubmitting(true);

    let uploadedStoragePath:
      | string
      | null = null;

    try {
      // ===============================================
      // TRACKING ID
      // ===============================================

      const jakartaDate =
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }
        )
          .format(new Date())
          .replace(/-/g, '');

      const randomCode = crypto
        .randomUUID()
        .replace(/-/g, '')
        .substring(0, 6)
        .toUpperCase();

      const trackingCode =
        `REQ-${jakartaDate}-${randomCode}`;

      // ===============================================
      // FILE
      // ===============================================

      let finalFileUrl = '';
      let finalFileName = '';
      let finalFileSize = '';
      let finalFileType = '';

      if (
        docSourceType === 'UPLOAD' &&
        file
      ) {
        let safeFileName =
          file.name
            .replace(/\s+/g, '_')
            .replace(
              /[^a-zA-Z0-9._-]/g,
              ''
            );

        if (!safeFileName) {
          safeFileName = 'document';
        }

        const storagePath =
          `${trackingCode}/${safeFileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from('photocopy-files')
            .upload(
              storagePath,
              file,
              {
                cacheControl: '3600',
                upsert: false,
                contentType:
                  file.type ||
                  'application/octet-stream',
              }
            );

        if (uploadError) {
          throw new Error(
            `Gagal mengunggah dokumen: ${uploadError.message}`
          );
        }

        uploadedStoragePath =
          storagePath;

        finalFileUrl =
          storagePath;

        finalFileName =
          file.name;

        finalFileSize =
          `${(
            file.size /
            (1024 * 1024)
          ).toFixed(1)} MB`;

        finalFileType =
          file.type ||
          'application/octet-stream';
      } else {
        let formattedUrl =
          fileUrlInput.trim();

        if (
          !formattedUrl.startsWith(
            'http://'
          ) &&
          !formattedUrl.startsWith(
            'https://'
          )
        ) {
          formattedUrl =
            `https://${formattedUrl}`;
        }

        finalFileUrl =
          formattedUrl;

        finalFileName =
          `[LINK URL] ${title.trim()}`;

        finalFileSize =
          'Tautan Link URL';

        finalFileType =
          'url/link';
      }

      // ===============================================
      // DATABASE
      // ===============================================

      const { error: insertError } =
        await supabase
          .from('photocopy_requests')
          .insert({
            id: trackingCode,

            teacher_name:
              teacherName.trim(),

            teacher_email:
              normalizedEmail,

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
        if (uploadedStoragePath) {
          await supabase.storage
            .from('photocopy-files')
            .remove([
              uploadedStoragePath,
            ]);
        }

        throw new Error(
          `Gagal menyimpan pengajuan: ${insertError.message}`
        );
      }

      const newRequest:
        PhotocopyRequest = {
        id: trackingCode,

        teacherName:
          teacherName.trim(),

        teacherEmail:
          normalizedEmail,

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
          notes.trim() ||
          undefined,

        status:
          'MENUNGGU',

        submittedAt:
          new Date().toISOString(),
      };

      setSubmittedResult(
        newRequest
      );

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

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setSubmittedResult(null);
    setTitle('');
    setFile(null);
    setFileName('');
    setFileSize('');
    setFileUrlInput('');
    setNotes('');
    setErrorMsg('');
    setCopied(false);
  };

  const copyTrackingId = async () => {
    if (!submittedResult) return;

    try {
      await navigator.clipboard.writeText(
        submittedResult.id
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        1800
      );
    } catch {
      // no-op
    }
  };

  // =====================================================
  // SUCCESS VIEW
  // =====================================================

  if (submittedResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 p-7 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-bold text-green-900">
              Pengajuan Berhasil Dikirim
            </h2>

            <p className="text-sm text-green-700 mt-2">
              Pengajuan diteruskan ke Portal Kepala Sekolah.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-slate-900 rounded-xl p-5 text-white">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Tracking ID
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                <div className="font-mono text-xl sm:text-2xl font-bold text-blue-400">
                  {submittedResult.id}
                </div>

                <button
                  type="button"
                  onClick={copyTrackingId}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold"
                >
                  <Copy className="w-4 h-4" />
                  {copied
                    ? 'Tersalin'
                    : 'Salin ID'}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Simpan Tracking ID ini untuk memeriksa status pengajuan.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <InfoBox
                label="Nama Guru"
                value={
                  submittedResult.teacherName
                }
              />

              <InfoBox
                label="Kelas"
                value={
                  submittedResult.subjectClass
                }
              />

              <InfoBox
                label="Judul"
                value={
                  submittedResult.title
                }
              />

              <InfoBox
                label="Total Kertas"
                value={`${submittedResult.totalSheets} lembar`}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
              <strong>
                Email verifikasi tersimpan.
              </strong>{' '}
              Jika Kepala Sekolah meminta revisi, gunakan email yang sama saat memperbaiki pengajuan.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() =>
                  onGoToTrack(
                    submittedResult.id
                  )
                }
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                Lacak Status
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-sm font-bold"
              >
                Buat Pengajuan Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // FORM VIEW
  // =====================================================

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-sm border border-slate-800 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Akses Publik Guru - Bebas Login
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Form Pengajuan Percetakan & Fotokopi Bahan Ajar
          </h2>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed mt-2">
            Unggah dokumen dan atur rincian cetak. Pengajuan akan diteruskan ke Kepala Sekolah untuk ditinjau.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs relative z-10">
          <Workflow
            number="1"
            title="Guru Isi Form"
            subtitle="Dokumen & spesifikasi"
            className="text-blue-400 bg-blue-500/20"
          />

          <Workflow
            number="2"
            title="Review Kepsek"
            subtitle="Setujui / Revisi / Tolak"
            className="text-amber-400 bg-amber-500/20"
          />

          <Workflow
            number="3"
            title="Tim Resource Cetak"
            subtitle="Proses sampai selesai"
            className="text-green-400 bg-green-500/20"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* IDENTITAS */}
        <Section
          number="1"
          title="Identitas Pengaju"
          subtitle="Email digunakan untuk verifikasi jika pengajuan perlu direvisi"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Nama Lengkap Guru"
              required
              icon={<User className="w-4 h-4" />}
              placeholder="misal: Ahmad Fauzi, S.Pd."
              value={teacherName}
              onChange={setTeacherName}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Guru{' '}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@lazuardi.sch.id"
                  value={teacherEmail}
                  onChange={(e) =>
                    setTeacherEmail(
                      e.target.value
                    )
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>

              <p className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                Email tidak ditampilkan di halaman Lacak Status. Gunakan email yang sama jika Kepala Sekolah meminta revisi.
              </p>
            </div>

            <TextInput
              label="Kelas"
              required
              icon={<School className="w-4 h-4" />}
              placeholder="misal: 1 Fuji"
              value={subjectClass}
              onChange={setSubjectClass}
            />
          </div>
        </Section>

        {/* DOKUMEN */}
        <Section
          number="2"
          title="Dokumen Bahan Ajar / Materi"
          subtitle="Unggah file atau gunakan tautan dokumen"
        >
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Folder className="w-5 h-5" />
                </div>

                <div>
                  <div className="font-bold text-xs">
                    Google Drive Repository Bahan Ajar
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Bisa upload langsung atau menggunakan link dokumen.
                  </p>
                </div>
              </div>

              <a
                href={
                  LAZUARDI_DRIVE_FOLDER_URL
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg"
              >
                Buka Folder Drive
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <TextInput
              label="Judul / Nama Materi Bahan Ajar"
              required
              placeholder="misal: Worksheet Matematika Pecahan"
              value={title}
              onChange={setTitle}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Metode Dokumen
              </label>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <SourceButton
                  active={
                    docSourceType === 'UPLOAD'
                  }
                  onClick={() =>
                    setDocSourceType(
                      'UPLOAD'
                    )
                  }
                  icon={<FileUp className="w-4 h-4" />}
                  label="Unggah File"
                />

                <SourceButton
                  active={
                    docSourceType === 'URL'
                  }
                  onClick={() =>
                    setDocSourceType(
                      'URL'
                    )
                  }
                  icon={<LinkIcon className="w-4 h-4" />}
                  label="Link URL"
                />
              </div>
            </div>

            {docSourceType ===
            'UPLOAD' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unggah File Dokumen{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : fileName
                      ? 'border-blue-300 bg-slate-50'
                      : 'border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {fileName ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 min-w-0 text-left">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {fileSize}
                          </p>
                        </div>
                      </div>

                      <label className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg cursor-pointer border border-blue-200 shrink-0">
                        Ganti File
                        <input
                          type="file"
                          onChange={
                            handleFileChange
                          }
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-10 h-10 mx-auto text-blue-600 mb-2" />

                      <p className="text-sm font-semibold text-slate-800">
                        Tarik & Lepas File di Sini
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        PDF, Word, PowerPoint, PNG, JPG — Maks. 20 MB
                      </p>

                      <input
                        type="file"
                        onChange={
                          handleFileChange
                        }
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                        className="hidden"
                        id="photocopy-file-upload"
                      />

                      <label
                        htmlFor="photocopy-file-upload"
                        className="inline-block mt-3 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg cursor-pointer"
                      >
                        Pilih Dokumen
                      </label>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tautan Dokumen{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-blue-600 absolute left-3 top-3" />

                  <input
                    type="url"
                    placeholder="https://drive.google.com/... atau https://canva.com/..."
                    value={
                      fileUrlInput
                    }
                    onChange={(e) =>
                      setFileUrlInput(
                        e.target.value
                      )
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5">
                  Pastikan tautan dapat dibuka oleh pihak sekolah.
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* SPESIFIKASI */}
        <Section
          number="3"
          title="Spesifikasi Fotokopi"
          subtitle="Atur jumlah, ukuran kertas, warna, dan sisi cetak"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberInput
              label="Jumlah Halaman"
              value={pagesCount}
              onChange={setPagesCount}
            />

            <NumberInput
              label="Jumlah Salinan"
              value={copiesCount}
              onChange={setCopiesCount}
            />

            <SelectInput
              label="Ukuran Kertas"
              value={paperSize}
              onChange={(value) =>
                setPaperSize(
                  value as PaperSize
                )
              }
              options={[
                ['A4', 'A4'],
                ['F4', 'F4'],
                ['A3', 'A3'],
              ]}
            />

            <SelectInput
              label="Warna"
              value={colorOption}
              onChange={(value) =>
                setColorOption(
                  value as ColorOption
                )
              }
              options={[
                ['BW', 'Hitam Putih'],
                ['COLOR', 'Berwarna'],
              ]}
            />

            <SelectInput
              label="Sisi Cetak"
              value={printSide}
              onChange={(value) =>
                setPrintSide(
                  value as PrintSide
                )
              }
              options={[
                ['SINGLE', '1 Sisi'],
                ['DOUBLE', '2 Sisi'],
              ]}
            />

            <SelectInput
              label="Prioritas"
              value={urgency}
              onChange={(value) =>
                setUrgency(
                  value as Urgency
                )
              }
              options={[
                ['NORMAL', 'Normal'],
                ['TINGGI', 'Tinggi'],
              ]}
            />

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Diperlukan *
              </label>

              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) =>
                  setTargetDate(
                    e.target.value
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-blue-700">
                Perkiraan Kebutuhan HVS
              </div>

              <div className="text-2xl font-bold text-blue-900">
                {calculatedSheets}{' '}
                <span className="text-sm">
                  lembar
                </span>
              </div>

              <div className="text-[11px] text-blue-700 mt-1">
                {pagesCount} halaman ×{' '}
                {copiesCount} salinan •{' '}
                {printSide === 'DOUBLE'
                  ? '2 sisi'
                  : '1 sisi'}
              </div>
            </div>
          </div>
        </Section>

        {/* CATATAN */}
        <Section
          number="4"
          title="Catatan Tambahan"
          subtitle="Opsional"
        >
          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            rows={4}
            placeholder="Contoh: mohon distaples per set, urutan halaman jangan dibalik, dll."
            className="w-full px-3.5 py-3 text-sm rounded-lg border border-slate-300 resize-y"
          />
        </Section>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />

            <p>
              Pastikan nama, <strong>email guru</strong>, jumlah salinan, target tanggal, dan dokumen sudah benar. Email akan dipakai jika pengajuan perlu dikembalikan untuk revisi.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Mengirim Pengajuan...
              </>
            ) : (
              <>
                Kirim Pengajuan ke Kepala Sekolah
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// =====================================================
// SMALL COMPONENTS
// =====================================================

const Section: React.FC<{
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({
  number,
  title,
  subtitle,
  children,
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
        {number}
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900">
          {title}
        </h3>

        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>

    {children}
  </div>
);

const Workflow: React.FC<{
  number: string;
  title: string;
  subtitle: string;
  className: string;
}> = ({
  number,
  title,
  subtitle,
  className,
}) => (
  <div className="flex items-center gap-2.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
    <div
      className={`w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {number}
    </div>

    <div>
      <div className="font-semibold text-white">
        {title}
      </div>

      <div className="text-slate-400 text-[11px]">
        {subtitle}
      </div>
    </div>
  </div>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  icon,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
      {label}{' '}
      {required && (
        <span className="text-red-500">
          *
        </span>
      )}
    </label>

    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-3 text-slate-400">
          {icon}
        </div>
      )}

      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className={`w-full ${
          icon ? 'pl-9' : 'pl-3.5'
        } pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500`}
      />
    </div>
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({
  label,
  value,
  onChange,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
      {label} *
    </label>

    <input
      type="number"
      min={1}
      required
      value={value}
      onChange={(e) =>
        onChange(
          Math.max(
            1,
            Number(e.target.value) || 1
          )
        )
      }
      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300"
    />
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}> = ({
  label,
  value,
  onChange,
  options,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
      {label}
    </label>

    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white"
    >
      {options.map(
        ([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {optionLabel}
          </option>
        )
      )}
    </select>
  </div>
);

const SourceButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
      active
        ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
        : 'text-slate-600 hover:text-slate-900'
    }`}
  >
    <span className="text-blue-600">
      {icon}
    </span>
    {label}
  </button>
);

const InfoBox: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
      {label}
    </div>

    <div className="text-xs font-semibold text-slate-800 mt-1">
      {value}
    </div>
  </div>
);
