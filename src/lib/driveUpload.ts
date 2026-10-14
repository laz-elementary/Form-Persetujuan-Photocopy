export const DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1NV-hf7FEP3jrFPK1r7Cc2PiCtnw6DGaN';

export interface DriveUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileType: string;
}

interface UploadContext {
  trackingId: string;
  teacherName: string;
  title: string;
}

export const uploadFileToDrive = async (
  file: File,
  context: UploadContext
): Promise<DriveUploadResult> => {
  const initResponse = await fetch('/api/drive-upload-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      trackingId: context.trackingId,
      teacherName: context.teacherName,
      title: context.title,
    }),
  });

  const initData = await initResponse.json().catch(() => null);

  if (!initResponse.ok || !initData?.sessionUrl) {
    throw new Error(
      initData?.message ||
        'Tidak dapat memulai upload ke Google Drive.'
    );
  }

  const uploadResponse = await fetch(initData.sessionUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  const uploadData = await uploadResponse.json().catch(() => null);

  if (!uploadResponse.ok || !uploadData?.id) {
    throw new Error(
      uploadData?.error?.message ||
        `Upload Google Drive gagal (${uploadResponse.status}).`
    );
  }

  return {
    fileId: uploadData.id,
    fileUrl:
      uploadData.webViewLink ||
      `https://drive.google.com/file/d/${uploadData.id}/view`,
    fileName: uploadData.name || file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    fileType: file.type || 'application/octet-stream',
  };
};
