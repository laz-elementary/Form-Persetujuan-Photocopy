import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { PhotocopyRequest } from '../types';
import { Download, CheckCircle2, ShieldCheck, FileText, X, Building2, Calendar, User, Clock, Loader2 } from 'lucide-react';

interface ProofProps {
  request: PhotocopyRequest;
  onClose: () => void;
}

export const DigitalProofModal: React.FC<ProofProps> = ({ request, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const qrData = JSON.stringify({
        id: request.id,
        status: request.status,
        teacher: request.teacherName,
        approvedBy: request.reviewedBy,
        sheets: request.totalSheets,
      });

      QRCode.toCanvas(
        canvasRef.current,
        qrData || request.id,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR Code error:', error);
        }
      );
    }
  }, [request]);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2; // 180 mm
      let y = 15;

      // 1. Header Box / Kop Sekolah
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.roundedRect(margin, y, 10, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LZ', margin + 2.2, y + 6.8);

      // Title
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFontSize(16);
      doc.text('Resource Lazuardi', margin + 14, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('Bukti Persetujuan Cetak Bahan Ajar', margin + 14, y + 9.5);

      // Official Stamp (Right side of header)
      doc.setDrawColor(5, 150, 105); // Emerald-600
      doc.setLineWidth(0.6);
      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.roundedRect(pageWidth - margin - 44, y - 2, 44, 15, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(5, 150, 105);
      doc.text('STATUS RESMI', pageWidth - margin - 37, y + 2.5);

      doc.setFontSize(9.5);
      doc.setTextColor(4, 120, 87);
      doc.text('DISETUJUI', pageWidth - margin - 37, y + 6.8);

      doc.setFontSize(6.5);
      doc.setTextColor(5, 150, 105);
      doc.text('KEPALA SD LAZUARDI', pageWidth - margin - 41, y + 10.5);

      y += 16;

      // Divider Line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);

      y += 6;

      // 2. Ticket ID & QR Code Box
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'FD');

      // ID Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text('KODE PERSETUJUAN CETAK', margin + 5, y + 7);

      doc.setFont('courier', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(request.id, margin + 5, y + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date(request.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'long' });
      doc.text(`Tanggal Pengajuan: ${dateStr}`, margin + 5, y + 20);

      const targetDateStr = request.targetDate || '-';
      doc.text(`Target Selesai: ${targetDateStr}`, margin + 5, y + 25);

      // QR Code
      if (canvasRef.current) {
        const qrImageData = canvasRef.current.toDataURL('image/png');
        doc.addImage(qrImageData, 'PNG', pageWidth - margin - 28, y + 2, 24, 24);
        doc.setFont('courier', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('Scan Verification', pageWidth - margin - 26, y + 28);
      }

      y += 38;

      // 3. Information Details Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 72, 3, 3, 'FD');

      let boxY = y + 8;

      const addRow = (label: string, value: string, isHighlight = false) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), margin + 5, boxY);

        doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(isHighlight ? 4 : 15, isHighlight ? 120 : 23, isHighlight ? 87 : 42);

        const splitValue = doc.splitTextToSize(value, contentWidth - 52);
        doc.text(splitValue, margin + 48, boxY);

        boxY += Math.max(7, splitValue.length * 4.2);
      };

      addRow('Guru / Pengaju', request.teacherName);
      addRow('Mata Pelajaran / Kelas', request.subjectClass);
      addRow('Judul Bahan Ajar', request.title);
      addRow('Nama File / Sumber', request.fileName);

      if (request.fileUrl) {
        addRow('Link URL Dokumen', request.fileUrl, true);
      }

      const specText = `${request.pagesCount} Halaman × ${request.copiesCount} Salinan (${request.paperSize}, ${request.colorOption === 'COLOR' ? 'Berwarna' : 'Hitam Putih'}, ${request.printSide === 'DOUBLE' ? '2 Sisi' : '1 Sisi'})`;
      addRow('Spesifikasi Cetak', specText);

      const sheetsText = `${request.totalSheets} Lembar HVS (${request.paperSize})`;
      addRow('Estimasi Kertas', sheetsText, true);

      y += 78;

      // 4. Principal Approval & Notes Box
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Catatan Kepala Sekolah:', margin + 5, y + 7);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const noteText = `"${request.approvalNotes || 'Disetujui untuk dicetak sesuai rincian.'}"`;
      const splitNote = doc.splitTextToSize(noteText, contentWidth - 62);
      doc.text(splitNote, margin + 5, y + 13);

      // Signature stamp on right
      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(pageWidth - margin - 50, y + 4, 46, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(5, 150, 105);
      doc.text('OTORISASI RESMI', pageWidth - margin - 46, y + 9);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text('[SIGNED DIGITALLY]', pageWidth - margin - 46, y + 14);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Sari Kusuma Dewi', pageWidth - margin - 46, y + 19);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Kepala SD Lazuardi', pageWidth - margin - 46, y + 23);

      y += 38;

      // Footer notice
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      const footerText = 'Bukti digital persetujuan ini sah dan diterbitkan secara resmi oleh Sistem E-Photocopy. Silakan tunjukkan bukti ini ke Tim Resource untuk proses pencetakan bahan ajar.';
      const splitFooter = doc.splitTextToSize(footerText, contentWidth);
      doc.text(splitFooter, margin, y);

      doc.save(`Bukti_Persetujuan_${request.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Terjadi kesalahan saat mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-auto"
      >
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm">Bukti Digital Persetujuan Cetak</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              title="Unduh berkas PDF bukti persetujuan"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunduh PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              title="Tutup Modal (X)"
              className="px-3 py-2 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Floating X Button for quick close inside card header */}
        <button
          onClick={onClose}
          title="Tutup Bukti (X)"
          className="absolute top-14 right-4 z-10 w-8 h-8 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-full flex items-center justify-center transition-colors print:hidden shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Printable Ticket Canvas - Compact Design */}
        <div className="p-5 sm:p-6 bg-white text-slate-900" id="printable-proof-content">
          
          {/* Header Kop Sekolah */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-6 h-6 bg-emerald-600 text-white font-black rounded-lg flex items-center justify-center text-[10px]">
                  LZ
                </div>
                <h2 className="font-extrabold text-base tracking-tight text-slate-900">
                  Resource Lazuardi
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Bukti Persetujuan Cetak Bahan Ajar
              </p>
            </div>

            {/* Official Status Stamp */}
            <div className="border-2 border-emerald-600 bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg text-center transform rotate-1 shrink-0">
              <div className="text-[8px] uppercase tracking-widest text-emerald-600">STATUS RESMI</div>
              <div className="text-xs tracking-tight text-emerald-800 font-black">DISETUJUI</div>
              <div className="text-[9px] font-bold text-emerald-700">KEPALA SD LAZUARDI</div>
            </div>
          </div>

          {/* Ticket ID & QR Code Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                KODE PERSUTUJUAN CETAK
              </span>
              <h3 className="text-base sm:text-lg font-mono font-extrabold text-slate-900 tracking-wide">
                {request.id}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tanggal: {new Date(request.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
              </p>
            </div>

            {/* Compact QR Code Canvas */}
            <div className="flex flex-col items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <canvas ref={canvasRef} className="w-20 h-20"></canvas>
              <span className="text-[8px] text-slate-400 font-mono mt-0.5">Scan Tim Resource</span>
            </div>
          </div>

          {/* Compact Information List */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 mb-4 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Guru / Pengaju:</span>
                <span className="font-bold text-slate-900">{request.teacherName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Mata Pelajaran / Kelas:</span>
                <span className="font-semibold text-slate-900">{request.subjectClass}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Judul Dokumen:</span>
                <span className="font-semibold text-slate-900 truncate block">{request.title}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama File / Tautan:</span>
                <span className="font-mono text-slate-800 text-[11px] truncate block">{request.fileName}</span>
              </div>
            </div>

            {request.fileUrl && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Link URL Dokumen Online:</span>
                  <a href={request.fileUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-800 underline truncate block text-[11px]">
                    {request.fileUrl}
                  </a>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Spesifikasi Cetak:</span>
                <span className="font-semibold text-slate-900">
                  {request.pagesCount} Hal × {request.copiesCount} Salinan ({request.paperSize}, {request.colorOption === 'COLOR' ? 'Warna' : 'Hitam Putih'}, {request.printSide === 'DOUBLE' ? '2 Sisi' : '1 Sisi'})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Estimasi Kertas:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  {request.totalSheets} Lembar HVS {request.paperSize}
                </span>
              </div>
            </div>
          </div>

          {/* Catatan Persetujuan & Signatory */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between gap-4 text-xs">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Catatan Kepala Sekolah:</span>
              </div>
              <p className="text-slate-600 italic text-[11px] line-clamp-2">
                "{request.approvalNotes || 'Disetujui untuk dicetak sesuai rincian.'}"
              </p>
            </div>

            {/* Signature Block */}
            <div className="text-center shrink-0 border-l border-slate-200 pl-4">
              <div className="text-[9px] text-slate-400 font-bold uppercase">OTORISASI</div>
              <div className="my-1 py-0.5 px-2 border border-dashed border-emerald-500 bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold rounded">
                [SIGNED DIGITALLY]
              </div>
              <div className="font-bold text-xs text-slate-900">
                Sari Kusuma Dewi
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Kepala SD Lazuardi</div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
            Bukti digital persetujuan ini sah. Silakan tunjukkan bukti ini ke Tim Resource untuk proses pencetakan bahan ajar.
          </div>
        </div>

        {/* Modal Bottom Bar for easy closing on mobile */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Tutup Bukti Persetujuan</span>
          </button>
        </div>

      </div>
    </div>
  );
};
