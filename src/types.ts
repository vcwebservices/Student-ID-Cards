export interface Student {
  id?: string;
  rtoId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  status: string;
  campus: string;
  commencedDate: string;
  dob: string;
  photoData: string; // Base64
  createdAt: number;
}

