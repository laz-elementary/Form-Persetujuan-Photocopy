import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { PhotocopyRequest } from '../types';
import { supabase } from '../lib/supabase';

import {
  Building2,
  Download,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  Printer,
  Clock,
  Eye,
  ExternalLink,
  Play,
  AlertCircle,
  X,
} from 'lucide-react';


export const AdminManagement: React.FC = () => {

  const [requests, setRequests] =
    useState<PhotocopyRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [selectedStatus, setSelectedStatus] =
    useState<
      'DISETUJUI' |
      'SEDANG_DICETAK' |
      'SELESAI' |
      'ALL'
    >('DISETUJUI');

  const [selectedRequest, setSelectedRequest] =
    useState<PhotocopyRequest | null>(null);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [openingFile, setOpeningFile] =
    useState(false);

  const [msg, setMsg] =
    useState('');

  const [errorMsg, setErrorMsg] =
    useState('');


  // =====================================================
  // MAPPING DATABASE -> UI
  // =====================================================

  const mapRequest = (
    row: any
  ): PhotocopyRequest => ({
    id:
      row.id,

    teacherName:
      row.teacher_name,

    teacherNip:
      row.teacher_nip || undefined,

    teacherEmail:
      row.teacher_email || undefined,

    subjectClass:
      row.subject_class,

    title:
      row.title,

    fileName:
      row.file_name ||
      'Dokumen bahan ajar',

    fileSize:
      row.file_size || '',

    fileType:
      row.file_type || '',

    fileUrl:
      row.file_url || undefined,

    driveFolderUrl:
      row.drive_folder_url || undefined,

    pagesCount:
      row.pages_count,

    copiesCount:
      row.copies_count,

    totalSheets:
      row.total_sheets,

    paperSize:
      row.paper_size,

    colorOption:
      row.color_option,

    printSide:
      row.print_side,

    urgency:
      row.urgency,

    targetDate:
      row.target_date,

    notes:
      row.notes || undefined,

    status:
      row.status,

    submittedAt:
      row.submitted_at,

    reviewedAt:
      row.reviewed_at || undefined,

    reviewedBy:
      row.reviewed_by || undefined,

    approvalNotes:
      row.approval_notes || undefined,

    rejectionReason:
      row.rejection_reason || undefined,

    printedAt:
      row.printed_at || undefined,

    printedBy:
      row.printed_by || undefined,

    completedAt:
      row.completed_at || undefined,
  });


  // =====================================================
  // LOAD DATA
  // =====================================================

  const fetchRequests =
    async () => {

      setLoading(true);
      setErrorMsg('');

      try {

        const {
          data,
          error,
        } = await supabase
          .from(
            'photocopy_requests'
          )
          .select('*')
          .in(
            'status',
            [
              'DISETUJUI',
              'SEDANG_DICETAK',
              'SELESAI',
            ]
          )
          .order(
            'submitted_at',
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        setRequests(
          (data || []).map(
            mapRequest
          )
        );

      } catch (err: any) {

        console.error(
          'Admin load error:',
          err
        );

        setErrorMsg(
          err?.message ||
          'Gagal memuat data pencetakan.'
        );

      } finally {

        setLoading(false);

      }
    };


  useEffect(() => {

    fetchRequests();

  }, []);


  // =====================================================
  // HITUNG STATUS
  // =====================================================

  const approvedCount =
    requests.filter(
      (r) =>
        r.status ===
        'DISETUJUI'
    ).length;


  const printingCount =
    requests.filter(
      (r) =>
        r.status ===
        'SEDANG_DICETAK'
    ).length;


  const completedCount =
    requests.filter(
      (r) =>
        r.status ===
        'SELESAI'
    ).length;


  const totalCompletedSheets =
    requests
      .filter(
        (r) =>
          r.status ===
          'SELESAI'
      )
      .reduce(
        (
          total,
          request
        ) =>
          total +
          (
            request.totalSheets ||
            0
          ),
        0
      );


  // =====================================================
  // FILTER
  // =====================================================

  const filtered =
    useMemo(() => {

      const q =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (r) => {

          const matchesStatus =
            selectedStatus ===
              'ALL' ||
            r.status ===
              selectedStatus;

          const matchesSearch =
            !q ||
            r.id
              .toLowerCase()
              .includes(q) ||
            r.teacherName
              .toLowerCase()
              .includes(q) ||
            r.subjectClass
              .toLowerCase()
              .includes(q) ||
            r.title
              .toLowerCase()
              .includes(q);

          return (
            matchesStatus &&
            matchesSearch
          );

        }
      );

    }, [
      requests,
      search,
      selectedStatus,
    ]);


  // =====================================================
  // UPDATE STATUS VIA RPC AMAN
  // =====================================================

  const updatePrintStatus =
    async (
      request:
        PhotocopyRequest,
      newStatus:
        'SEDANG_DICETAK' |
        'SELESAI'
    ) => {

      const confirmation =
        newStatus ===
        'SEDANG_DICETAK'
          ? `Mulai proses pencetakan "${request.title}"?`
          : `Tandai pencetakan "${request.title}" sebagai selesai?`;

      if (
        !window.confirm(
          confirmation
        )
      ) {
        return;
      }


      setProcessingId(
        request.id
      );

      setMsg('');
      setErrorMsg('');


      try {

        const {
          error,
        } = await supabase.rpc(
          'admin_update_print_status',
          {
            p_request_id:
              request.id,

            p_new_status:
              newStatus,
          }
        );


        if (error) {
          throw error;
        }


        if (
          newStatus ===
          'SEDANG_DICETAK'
        ) {

          setMsg(
            `${request.id} mulai diproses untuk pencetakan.`
          );

          setSelectedStatus(
            'SEDANG_DICETAK'
          );

        } else {

          setMsg(
            `${request.id} telah selesai dicetak.`
          );

          setSelectedStatus(
            'SELESAI'
          );

        }


        setSelectedRequest(
          null
        );

        await fetchRequests();


      } catch (err: any) {

        console.error(
          'Update print status error:',
          err
        );

        setErrorMsg(
          err?.message ||
          'Gagal memperbarui status pencetakan.'
        );

      } finally {

        setProcessingId(null);

      }
    };


  // =====================================================
  // BUKA FILE
  // =====================================================

  const handleOpenDocument =
    async (
      request:
        PhotocopyRequest
    ) => {

      if (
        !request.fileUrl
      ) {

        setErrorMsg(
          'Dokumen tidak tersedia.'
        );

        return;

      }


      setOpeningFile(true);
      setErrorMsg('');


      try {

        // File berupa link eksternal
        if (
          request.fileType ===
          'url/link'
        ) {

          window.open(
            request.fileUrl,
            '_blank',
            'noopener,noreferrer'
          );

          return;

        }


        // File Supabase Storage private
        const {
          data,
          error,
        } =
          await supabase.storage
            .from(
              'photocopy-files'
            )
            .createSignedUrl(
              request.fileUrl,
              60 * 60
            );


        if (error) {
          throw error;
        }


        if (
          !data?.signedUrl
        ) {

          throw new Error(
            'File tidak dapat dibuka.'
          );

        }


        window.open(
          data.signedUrl,
          '_blank',
          'noopener,noreferrer'
        );


      } catch (err: any) {

        console.error(
          'Open document error:',
          err
        );

        setErrorMsg(
          err?.message ||
          'Gagal membuka dokumen.'
        );

      } finally {

        setOpeningFile(false);

      }
    };


  // =====================================================
  // EXPORT CSV
  // =====================================================

  const handleExportCSV =
    () => {

      if (
        requests.length ===
        0
      ) {
        return;
      }


      const headers = [
        'Tracking ID',
        'Tanggal Pengajuan',
        'Nama Guru',
        'Kelas',
        'Judul',
        'Halaman',
        'Salinan',
        'Total HVS',
        'Ukuran',
        'Warna',
        'Sisi',
        'Status',
        'Disetujui Oleh',
        'Dicetak Oleh',
        'Mulai Dicetak',
        'Selesai Dicetak',
      ];


      const rows =
        requests.map(
          (r) => [
            r.id,

            new Date(
              r.submittedAt
            ).toLocaleDateString(
              'id-ID'
            ),

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

            `"${r.reviewedBy || ''}"`,

            `"${r.printedBy || ''}"`,

            r.printedAt
              ? `"${new Date(
                  r.printedAt
                ).toLocaleString(
                  'id-ID'
                )}"`
              : '',

            r.completedAt
              ? `"${new Date(
                  r.completedAt
                ).toLocaleString(
                  'id-ID'
                )}"`
              : '',
          ]
        );


      const csvContent =
        [
          headers.join(
            ','
          ),

          ...rows.map(
            (row) =>
              row.join(',')
          ),
        ].join('\n');


      const blob =
        new Blob(
          [
            '\uFEFF' +
            csvContent,
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


      link.href = url;

      link.download =
        `Laporan_Fotokopi_${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.csv`;


      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );
    };


  // =====================================================
  // STATUS BADGE
  // =====================================================

  const statusBadge =
    (
      status: string
    ) => {

      if (
        status ===
        'DISETUJUI'
      ) {

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            SIAP DICETAK
          </span>
        );

      }


      if (
        status ===
        'SEDANG_DICETAK'
      ) {

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold">
            <Printer className="w-3 h-3" />
            SEDANG DICETAK
          </span>
        );

      }


      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          SELESAI
        </span>
      );
    };


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">


      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">

        <div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">

            <Building2 className="w-3.5 h-3.5" />

            <span>
              Admin Resource
            </span>

          </div>


          <h2 className="text-2xl font-bold">
            Kelola Proses Fotokopi
          </h2>


          <p className="text-xs text-slate-300 mt-1">
            Proses pengajuan yang telah disetujui Kepala Sekolah hingga selesai dicetak.
          </p>

        </div>


        <div className="flex gap-2">

          <button
            type="button"
            onClick={
              fetchRequests
            }
            disabled={
              loading
            }
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Muat Ulang
          </button>


          <button
            type="button"
            onClick={
              handleExportCSV
            }
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />

            Ekspor CSV
          </button>

        </div>

      </div>


      {/* MESSAGE */}
      {msg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-3">

          <span>
            {msg}
          </span>

          <button
            onClick={() =>
              setMsg('')
            }
            className="font-bold underline"
          >
            Tutup
          </button>

        </div>
      )}


      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex gap-2 items-center">

          <AlertCircle className="w-4 h-4 shrink-0" />

          {errorMsg}

        </div>
      )}


      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">


        <button
          type="button"
          onClick={() =>
            setSelectedStatus(
              'DISETUJUI'
            )
          }
          className="text-left bg-green-50 border border-green-200 rounded-xl p-5"
        >

          <div className="flex items-center justify-between">

            <span className="text-xs font-bold text-green-700 uppercase">
              Siap Dicetak
            </span>

            <FileText className="w-5 h-5 text-green-600" />

          </div>

          <div className="text-3xl font-bold text-green-900 mt-2">
            {approvedCount}
          </div>

        </button>


        <button
          type="button"
          onClick={() =>
            setSelectedStatus(
              'SEDANG_DICETAK'
            )
          }
          className="text-left bg-blue-50 border border-blue-200 rounded-xl p-5"
        >

          <div className="flex items-center justify-between">

            <span className="text-xs font-bold text-blue-700 uppercase">
              Sedang Dicetak
            </span>

            <Printer className="w-5 h-5 text-blue-600" />

          </div>

          <div className="text-3xl font-bold text-blue-900 mt-2">
            {printingCount}
          </div>

        </button>


        <button
          type="button"
          onClick={() =>
            setSelectedStatus(
              'SELESAI'
            )
          }
          className="text-left bg-slate-50 border border-slate-200 rounded-xl p-5"
        >

          <div className="flex items-center justify-between">

            <span className="text-xs font-bold text-slate-600 uppercase">
              Selesai
            </span>

            <CheckCircle2 className="w-5 h-5 text-slate-600" />

          </div>

          <div className="text-3xl font-bold text-slate-900 mt-2">
            {completedCount}
          </div>

        </button>


        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5">

          <div className="flex items-center justify-between">

            <span className="text-xs font-bold text-slate-400 uppercase">
              HVS Selesai
            </span>

            <Clock className="w-5 h-5 text-blue-400" />

          </div>

          <div className="text-3xl font-bold text-blue-400 mt-2">
            {totalCompletedSheets}
          </div>

          <div className="text-[10px] text-slate-400">
            lembar
          </div>

        </div>

      </div>


      {/* FILTER */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between gap-4">


        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">

          {[
            [
              'DISETUJUI',
              `Siap Dicetak (${approvedCount})`,
            ],

            [
              'SEDANG_DICETAK',
              `Sedang Dicetak (${printingCount})`,
            ],

            [
              'SELESAI',
              `Selesai (${completedCount})`,
            ],

            [
              'ALL',
              `Semua (${requests.length})`,
            ],
          ].map(
            (
              [
                status,
                label,
              ]
            ) => (

              <button
                key={
                  status
                }
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    status as any
                  )
                }
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${
                  selectedStatus ===
                  status
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {label}
              </button>

            )
          )}

        </div>


        <div className="relative w-full lg:w-80">

          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />

          <input
            type="text"
            placeholder="Cari guru, kelas, judul, atau ID..."
            value={
              search
            }
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full px-3.5 py-2 pl-9 border border-slate-300 bg-slate-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

      </div>


      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {loading ? (

          <div className="p-12 text-center">

            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />

            <p className="text-sm text-slate-500">
              Memuat data...
            </p>

          </div>

        ) : filtered.length ===
          0 ? (

          <div className="p-12 text-center">

            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />

            <h3 className="font-bold text-slate-900">
              Tidak Ada Data
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Tidak ada pengajuan pada kategori ini.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>

                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">

                  <th className="py-3.5 px-4">
                    Tracking ID
                  </th>

                  <th className="py-3.5 px-4">
                    Guru & Kelas
                  </th>

                  <th className="py-3.5 px-4">
                    Bahan Ajar
                  </th>

                  <th className="py-3.5 px-4">
                    Jumlah
                  </th>

                  <th className="py-3.5 px-4">
                    Status
                  </th>

                  <th className="py-3.5 px-4 text-right">
                    Aksi
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filtered.map(
                  (
                    request
                  ) => (

                    <tr
                      key={
                        request.id
                      }
                      className="hover:bg-slate-50"
                    >

                      <td className="py-3.5 px-4">

                        <div className="font-mono font-bold">
                          {
                            request.id
                          }
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {new Date(
                            request.submittedAt
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </div>

                      </td>


                      <td className="py-3.5 px-4">

                        <div className="font-bold text-slate-900">
                          {
                            request.teacherName
                          }
                        </div>

                        <div className="text-[10px] text-slate-500">
                          {
                            request.subjectClass
                          }
                        </div>

                      </td>


                      <td className="py-3.5 px-4 max-w-xs">

                        <div className="font-semibold text-slate-900 truncate">
                          {
                            request.title
                          }
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          {
                            request.fileName
                          }
                        </div>

                      </td>


                      <td className="py-3.5 px-4">

                        <strong className="text-blue-700">
                          {
                            request.totalSheets
                          }{' '}
                          lembar
                        </strong>

                        <div className="text-[10px] text-slate-500">
                          {
                            request.copiesCount
                          }{' '}
                          salinan
                        </div>

                      </td>


                      <td className="py-3.5 px-4">

                        {statusBadge(
                          request.status
                        )}

                      </td>


                      <td className="py-3.5 px-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRequest(
                              request
                            )
                          }
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />

                          Kelola
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* MODAL */}
      {selectedRequest && (

        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200">


            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">

              <div>

                <span className="text-[10px] text-blue-600 font-bold uppercase">
                  Proses Fotokopi
                </span>

                <h3 className="text-xl font-bold text-slate-900">
                  {
                    selectedRequest.title
                  }
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {
                    selectedRequest.teacherName
                  }{' '}
                  •{' '}
                  {
                    selectedRequest.subjectClass
                  }
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >

                <X className="w-5 h-5 text-slate-500" />

              </button>

            </div>


            <div className="p-6 space-y-4">


              <div className="grid grid-cols-3 gap-3">

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">

                  <div className="text-[10px] text-slate-500">
                    Halaman
                  </div>

                  <div className="font-bold">
                    {
                      selectedRequest.pagesCount
                    }
                  </div>

                </div>


                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">

                  <div className="text-[10px] text-slate-500">
                    Salinan
                  </div>

                  <div className="font-bold">
                    {
                      selectedRequest.copiesCount
                    }
                  </div>

                </div>


                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">

                  <div className="text-[10px] text-blue-600">
                    HVS
                  </div>

                  <div className="font-bold text-blue-800">
                    {
                      selectedRequest.totalSheets
                    }
                  </div>

                </div>

              </div>


              <button
                type="button"
                disabled={
                  openingFile
                }
                onClick={() =>
                  handleOpenDocument(
                    selectedRequest
                  )
                }
                className="w-full p-4 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-between gap-3 disabled:opacity-50"
              >

                <div className="text-left">

                  <div className="text-xs font-bold text-blue-900">
                    Buka Dokumen Bahan Ajar
                  </div>

                  <div className="text-[10px] text-blue-700 mt-0.5">
                    {
                      selectedRequest.fileName
                    }
                  </div>

                </div>

                <ExternalLink className="w-4 h-4 text-blue-700" />

              </button>


              {selectedRequest.approvalNotes && (

                <div className="bg-green-50 border border-green-200 text-green-900 p-3 rounded-lg text-xs">

                  <strong>
                    Catatan Kepsek:
                  </strong>{' '}

                  {
                    selectedRequest.approvalNotes
                  }

                </div>

              )}


              {selectedRequest.printedBy && (

                <div className="text-xs text-slate-500">

                  Diproses oleh:{' '}

                  <strong className="text-slate-800">
                    {
                      selectedRequest.printedBy
                    }
                  </strong>

                </div>

              )}


              <div className="pt-4 border-t border-slate-100">


                {selectedRequest.status ===
                  'DISETUJUI' && (

                  <button
                    type="button"
                    disabled={
                      processingId ===
                      selectedRequest.id
                    }
                    onClick={() =>
                      updatePrintStatus(
                        selectedRequest,
                        'SEDANG_DICETAK'
                      )
                    }
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >

                    <Play className="w-4 h-4" />

                    Mulai Proses Fotokopi

                  </button>

                )}


                {selectedRequest.status ===
                  'SEDANG_DICETAK' && (

                  <button
                    type="button"
                    disabled={
                      processingId ===
                      selectedRequest.id
                    }
                    onClick={() =>
                      updatePrintStatus(
                        selectedRequest,
                        'SELESAI'
                      )
                    }
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >

                    <CheckCircle2 className="w-4 h-4" />

                    Tandai Selesai Dicetak

                  </button>

                )}


                {selectedRequest.status ===
                  'SELESAI' && (

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">

                    <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />

                    <div className="text-xs font-bold text-green-800">
                      Proses Fotokopi Selesai
                    </div>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};
