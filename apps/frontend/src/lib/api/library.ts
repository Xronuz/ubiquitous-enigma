import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  studentId: string;
  loanedAt: string;
  dueDate?: string;
  returnedAt?: string;
  isOverdue?: boolean;
  book?: Pick<LibraryBook, 'id' | 'title' | 'author'>;
  student?: { id: string; firstName: string; lastName: string };
}

export interface LibraryStats {
  totalBooks: number;
  availableBooks: number;
  activeLoans: number;
  overdueLoans: number;
}

export interface CreateBookDto {
  title: string;
  author: string;
  isbn?: string;
  totalCopies?: number;
}

export interface CreateLoanDto {
  bookId: string;
  studentId: string;
  dueDate?: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const libraryApi = {
  getStats: (): Promise<LibraryStats> =>
    apiClient.get('/library/stats').then(r => r.data),

  getBooks: (search?: string): Promise<LibraryBook[]> =>
    apiClient.get('/library/books', { params: search ? { search } : undefined }).then(r => r.data),

  createBook: (data: CreateBookDto): Promise<LibraryBook> =>
    apiClient.post('/library/books', data).then(r => r.data),

  removeBook: (id: string): Promise<void> =>
    apiClient.delete(`/library/books/${id}`).then(r => r.data),

  getLoans: (active?: boolean): Promise<LibraryLoan[]> =>
    apiClient.get('/library/loans', { params: active !== undefined ? { active } : undefined }).then(r => r.data),

  loanBook: (data: CreateLoanDto): Promise<LibraryLoan> =>
    apiClient.post('/library/loans', data).then(r => r.data),

  returnBook: (id: string): Promise<LibraryLoan> =>
    apiClient.put(`/library/loans/${id}/return`, {}).then(r => r.data),

  exportLoansPdf: async (active?: boolean): Promise<void> => {
    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken ?? ''
      : '';
    const query = active !== undefined ? `?active=${active}` : '';
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/library/loans/export/pdf${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) throw new Error('PDF yuklab olishda xato');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kutubxona-tarix-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
