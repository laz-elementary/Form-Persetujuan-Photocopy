import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_REQUESTS } from './src/data/mockData.js';
import { PhotocopyRequest, RequestStatus } from './src/types.js';

const DATA_FILE = path.join(process.cwd(), 'requests-db.json');

// Helper to load requests from JSON file or initialize with INITIAL_REQUESTS
function loadRequests(): PhotocopyRequest[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load requests-db.json:', err);
  }
  // Save initial default
  saveRequests(INITIAL_REQUESTS);
  return INITIAL_REQUESTS;
}

function saveRequests(data: PhotocopyRequest[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save requests-db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  let requests = loadRequests();

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get all requests or filter by status / query
  app.get('/api/requests', (req, res) => {
    const { status, search, teacher } = req.query;
    let filtered = [...requests];

    if (status && typeof status === 'string' && status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.teacherName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.subjectClass.toLowerCase().includes(q)
      );
    }

    if (teacher && typeof teacher === 'string') {
      filtered = filtered.filter((r) => r.teacherName.toLowerCase().includes(teacher.toLowerCase()));
    }

    // Sort by submittedAt descending
    filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    res.json({ success: true, count: filtered.length, data: filtered });
  });

  // Get single request by ID
  app.get('/api/requests/:id', (req, res) => {
    const reqId = req.params.id.toUpperCase();
    const found = requests.find((r) => r.id.toUpperCase() === reqId);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }
    res.json({ success: true, data: found });
  });

  // Create new request (Public Guru endpoint)
  app.post('/api/requests', (req, res) => {
    const body = req.body;
    
    // Generate unique ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = Math.floor(100 + Math.random() * 900); // 3 digit
    const newId = `REQ-${todayStr}-${randomSeq}`;

    const pages = Number(body.pagesCount) || 1;
    const copies = Number(body.copiesCount) || 1;
    const isDouble = body.printSide === 'DOUBLE';
    const totalSheets = isDouble ? Math.ceil(pages / 2) * copies : pages * copies;

    const newRequest: PhotocopyRequest = {
      id: newId,
      teacherName: body.teacherName || 'Guru Lazuardi',
      teacherNip: body.teacherNip || '',
      teacherEmail: body.teacherEmail || '',
      subjectClass: body.subjectClass || 'Umum',
      title: body.title || 'Materi Pembelajaran',
      fileName: body.fileName || 'Dokumen.pdf',
      fileSize: body.fileSize || '1.0 MB',
      fileType: body.fileType || 'application/pdf',
      fileDataUrl: body.fileDataUrl || undefined,
      fileUrl: body.fileUrl || undefined,
      driveFolderUrl: body.driveFolderUrl || 'https://drive.google.com/drive/folders/1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN?usp=drive_link',
      pagesCount: pages,
      copiesCount: copies,
      totalSheets: totalSheets,
      paperSize: body.paperSize || 'A4',
      colorOption: body.colorOption || 'BW',
      printSide: body.printSide || 'SINGLE',
      urgency: body.urgency || 'NORMAL',
      targetDate: body.targetDate || new Date().toISOString().slice(0, 10),
      notes: body.notes || '',
      status: 'MENUNGGU',
      submittedAt: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    saveRequests(requests);

    res.status(201).json({
      success: true,
      message: 'Pengajuan berhasil dikirim',
      data: newRequest,
    });
  });

  // Review request (Kepala Sekolah: Approve or Reject)
  app.patch('/api/requests/:id/review', (req, res) => {
    const { id } = req.params;
    const { action, reviewerName, notes, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

    const index = requests.findIndex((r) => r.id.toUpperCase() === id.toUpperCase());
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    const current = requests[index];

    if (action === 'APPROVE') {
      current.status = 'DISETUJUI';
      current.reviewedAt = new Date().toISOString();
      current.reviewedBy = reviewerName || 'Sari Kusuma Dewi (Kepala Sekolah)';
      current.approvalNotes = notes || 'Disetujui untuk dicetak oleh Tim Resource.';
      current.rejectionReason = undefined;
    } else if (action === 'REJECT') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
      }
      current.status = 'DITOLAK';
      current.reviewedAt = new Date().toISOString();
      current.reviewedBy = reviewerName || 'Sari Kusuma Dewi (Kepala Sekolah)';
      current.rejectionReason = rejectionReason;
      current.approvalNotes = undefined;
    } else {
      return res.status(400).json({ success: false, message: 'Aksi tidak valid (Gunakan APPROVE atau REJECT)' });
    }

    requests[index] = current;
    saveRequests(requests);

    res.json({
      success: true,
      message: action === 'APPROVE' ? 'Pengajuan berhasil disetujui' : 'Pengajuan ditolak dengan catatan',
      data: current,
    });
  });

  // Update status (Tim Resource: 'SEDANG_DICETAK' | 'SELESAI')
  app.patch('/api/requests/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, operatorName } = req.body;

    const index = requests.findIndex((r) => r.id.toUpperCase() === id.toUpperCase());
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    const current = requests[index];

    if (status === 'SEDANG_DICETAK') {
      current.status = 'SEDANG_DICETAK';
      current.printedAt = new Date().toISOString();
      current.printedBy = operatorName || 'Bambang S. (Tim Resource)';
    } else if (status === 'SELESAI') {
      current.status = 'SELESAI';
      current.completedAt = new Date().toISOString();
      if (!current.printedAt) {
        current.printedAt = new Date().toISOString();
        current.printedBy = operatorName || 'Bambang S. (Tim Resource)';
      }
    } else if (status === 'DISETUJUI') {
      // Revert to approved
      current.status = 'DISETUJUI';
    } else {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    requests[index] = current;
    saveRequests(requests);

    res.json({
      success: true,
      message: `Status pengajuan diperbarui menjadi ${current.status}`,
      data: current,
    });
  });

  // Delete single request (Admin)
  app.delete('/api/requests/:id', (req, res) => {
    const { id } = req.params;

    if (id.toLowerCase() === 'all') {
      requests = [];
      saveRequests(requests);
      return res.json({ success: true, message: 'Semua data pengajuan berhasil dihapus.' });
    }

    const initialLen = requests.length;
    requests = requests.filter((r) => r.id.toUpperCase() !== id.toUpperCase());
    
    if (requests.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    saveRequests(requests);
    res.json({ success: true, message: 'Pengajuan berhasil dihapus' });
  });

  // System Stats
  app.get('/api/stats', (_req, res) => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r) => r.status === 'MENUNGGU').length;
    const approvedRequests = requests.filter((r) => r.status === 'DISETUJUI' || r.status === 'SEDANG_DICETAK' || r.status === 'SELESAI').length;
    const rejectedRequests = requests.filter((r) => r.status === 'DITOLAK').length;
    const completedRequests = requests.filter((r) => r.status === 'SELESAI').length;

    const totalSheetsThisMonth = requests
      .filter((r) => r.status !== 'DITOLAK')
      .reduce((acc, r) => acc + (r.totalSheets || 0), 0);

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        completedRequests,
        totalSheetsThisMonth,
      },
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
