export type RequestStatus =
  | 'MENUNGGU'
  | 'PERLU_REVISI'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'SEDANG_DICETAK'
  | 'SELESAI';

export type PaperSize = 'A4' | 'F4' | 'A3';

export type ColorOption = 'BW' | 'COLOR';

export type PrintSide = 'SINGLE' | 'DOUBLE';

export type Urgency = 'NORMAL' | 'TINGGI';

export type UserRole =
  | 'GURU'
  | 'KEPSEK'
  | 'WAKASEK'
  | 'ADMIN'
  | 'RESOURCE';

export interface PhotocopyRequest {
  id: string;
  teacherName: string;
  teacherNip?: string;
  teacherEmail?: string;
  subjectClass: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  fileDataUrl?: string;
  fileUrl?: string;
  driveFolderUrl?: string;
  pagesCount: number;
  copiesCount: number;
  totalSheets: number;
  paperSize: PaperSize;
  colorOption: ColorOption;
  printSide: PrintSide;
  urgency: Urgency;
  targetDate: string;
  notes?: string;
  status: RequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  printedAt?: string;
  printedBy?: string;
  completedAt?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  title: string;
  avatar?: string;
}

export interface SystemStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
  totalSheetsThisMonth: number;
}
