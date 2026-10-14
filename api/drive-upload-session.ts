import crypto from 'node:crypto';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_FOLDER_ID = '1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
]);

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function safeText(value: unknown, max = 120) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function safeFileName(value: unknown) {
  const raw = safeText(value, 180);
  return raw.replace(/[\\/:*?"<>|]/g, '_') || 'document';
}

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );

  if (!email || !privateKey) {
    throw new Error(
      'Google Drive belum dikonfigurasi di Environment Variables Vercel.'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope: DRIVE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(privateKey));
  const assertion = `${unsigned}.${signature}`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData?.access_token) {
    throw new Error(
      tokenData?.error_description ||
        tokenData?.error ||
        'Gagal mengautentikasi Google Drive.'
    );
  }

  return tokenData.access_token as string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const allowedOrigin =
      process.env.APP_ORIGIN ||
      'https://form-persetujuan-photocopy.vercel.app';
    const origin = req.headers?.origin;

    if (origin && allowedOrigin && origin !== allowedOrigin) {
      return res.status(403).json({ message: 'Origin tidak diizinkan.' });
    }

    const fileName = safeFileName(req.body?.fileName);
    const fileSize = Number(req.body?.fileSize || 0);
    const mimeType =
      safeText(req.body?.mimeType, 120) || 'application/octet-stream';
    const trackingId = safeText(req.body?.trackingId, 64);
    const teacherName = safeText(req.body?.teacherName, 80);
    const title = safeText(req.body?.title, 120);

    if (!trackingId || !teacherName || !fileName) {
      return res.status(400).json({
        message: 'Metadata upload belum lengkap.',
      });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        message: 'Ukuran file harus lebih dari 0 dan maksimal 25 MB.',
      });
    }

    const extension = fileName.includes('.')
      ? fileName.split('.').pop()!.toLowerCase()
      : '';

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return res.status(400).json({
        message: 'Jenis file tidak diizinkan.',
      });
    }

    const folderId =
      process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
    const accessToken = await getGoogleAccessToken();
    const driveName = safeFileName(
      `${trackingId} - ${teacherName} - ${title || 'Bahan Ajar'} - ${fileName}`
    );

    const driveResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(fileSize),
          // Penting untuk resumable upload yang dilanjutkan langsung
          // dari browser. Google menggunakan Origin sesi awal untuk CORS.
          Origin: origin || allowedOrigin,
        },
        body: JSON.stringify({
          name: driveName,
          parents: [folderId],
          description: [
            'E-Photocopy SD Lazuardi',
            `Tracking ID: ${trackingId}`,
            `Guru: ${teacherName}`,
            title ? `Judul: ${title}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
        }),
      }
    );

    const sessionUrl = driveResponse.headers.get('location');

    if (!driveResponse.ok || !sessionUrl) {
      const detail = await driveResponse.text().catch(() => '');
      throw new Error(
        `Google Drive menolak sesi upload (${driveResponse.status}). ${detail}`
      );
    }

    return res.status(200).json({
      sessionUrl,
      fileName: driveName,
    });
  } catch (error: any) {
    console.error('Drive upload session error:', error);
    return res.status(500).json({
      message:
        error?.message || 'Gagal membuat sesi upload Google Drive.',
    });
  }
}
