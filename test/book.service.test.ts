import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('PUBLIC_API_URL', 'http://localhost:3000');
});

import { bookService } from '../src/services/book.service';
import { ACCESS_TOKEN_KEY, SESSION_ID_KEY } from '../src/services/auth.service';

describe('BookService Test Suite (Frontend Editorial Flow)', () => {
  const mockApiUrl = 'http://localhost:3000';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getMyBooks', () => {
    it('should query /products/mine and map editorial status and rejectionReason', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'prof-token-123');
      localStorage.setItem(SESSION_ID_KEY, 'session-456');

      const mockResponse = {
        total: 2,
        page: 1,
        totalPages: 1,
        data: [
          {
            id: 'b1',
            title: 'Libro en Revisión',
            status: 'PENDING_REVIEW',
            rejectionReason: null,
            submittedAt: '2026-11-20T12:00:00Z',
            book: { author: 'Profesor Uno', category: { name: 'Física' } },
            display: { cover_image: 'cover1.jpg' },
          },
          {
            id: 'b2',
            title: 'Libro Rechazado',
            status: 'REJECTED',
            rejectionReason: 'Falta índice detallado',
            submittedAt: '2026-11-20T10:00:00Z',
            book: { author: 'Profesor Uno', category: { name: 'Química' } },
            display: { cover_image: 'cover2.jpg' },
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock;

      const result = await bookService.getMyBooks(1);

      expect(fetchMock).toHaveBeenCalledWith(
        `${mockApiUrl}/products/mine?page=1&limit=12`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer prof-token-123',
            'x-session-id': 'session-456',
          }),
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('PENDING_REVIEW');
      expect(result.data[0].rejectionReason).toBeNull();
      expect(result.data[1].status).toBe('REJECTED');
      expect(result.data[1].rejectionReason).toBe('Falta índice detallado');
    });
  });

  describe('createBook', () => {
    it('should send FormData to POST /products and return created book', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'prof-token-123');

      const mockCreated = {
        id: 'new-book-id',
        title: 'Nuevo Libro',
        status: 'PENDING_REVIEW',
        book: { author: 'Profesor Uno' },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockCreated,
      });
      globalThis.fetch = fetchMock;

      const formData = new FormData();
      formData.append('title', 'Nuevo Libro');

      const result = await bookService.createBook(formData);

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/products`, {
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer prof-token-123',
        }),
        body: formData,
      });

      expect(result.id).toBe('new-book-id');
      expect(result.status).toBe('PENDING_REVIEW');
    });

    it('should flag isDuplicateWarning = true on 409 DUPLICATE_TITLE_WARNING', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          statusCode: 409,
          code: 'DUPLICATE_TITLE_WARNING',
          message: 'Ya existe un libro con este título',
        }),
      });
      globalThis.fetch = fetchMock;

      const formData = new FormData();
      formData.append('title', 'Libro Repetido');

      try {
        await bookService.createBook(formData);
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.isDuplicateWarning).toBe(true);
        expect(err.message).toBe('Ya existe un libro con este título');
      }
    });
  });

  describe('updateBook', () => {
    it('should send FormData to PUT /products/:id and return updated book', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'prof-token-123');

      const mockUpdated = {
        id: 'book-123',
        title: 'Libro Corregido',
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        book: { author: 'Profesor Uno' },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUpdated,
      });
      globalThis.fetch = fetchMock;

      const formData = new FormData();
      formData.append('title', 'Libro Corregido');
      formData.append('overrideDuplicateWarning', 'true');

      const result = await bookService.updateBook('book-123', formData);

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/products/book-123`, {
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer prof-token-123',
        }),
        body: formData,
      });

      expect(result.id).toBe('book-123');
      expect(result.status).toBe('PENDING_REVIEW');
      expect(result.rejectionReason).toBeNull();
    });
  });

  describe('getPendingBooks (Admin)', () => {
    it('should query /admin/products/pending with auth headers', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'admin-token');

      const mockPending = [
        {
          id: 'b-pend',
          title: 'Libro por Revisar',
          status: 'PENDING_REVIEW',
          book: { author: 'Docente X' },
        },
      ];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPending,
      });
      globalThis.fetch = fetchMock;

      const result = await bookService.getPendingBooks();

      expect(fetchMock).toHaveBeenCalledWith(
        `${mockApiUrl}/admin/products/pending`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer admin-token',
          }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING_REVIEW');
    });
  });

  describe('approveBook & rejectBook (Admin)', () => {
    it('should call POST /products/:id/approve', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'admin-token');

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Aprobado' }),
      });
      globalThis.fetch = fetchMock;

      await bookService.approveBook('book-123');

      expect(fetchMock).toHaveBeenCalledWith(
        `${mockApiUrl}/products/book-123/approve`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer admin-token',
          }),
        }),
      );
    });

    it('should call POST /products/:id/reject with rejection_reason payload', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'admin-token');

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Rechazado' }),
      });
      globalThis.fetch = fetchMock;

      const reason = 'El archivo PDF está corrupto';
      await bookService.rejectBook('book-456', reason);

      expect(fetchMock).toHaveBeenCalledWith(
        `${mockApiUrl}/products/book-456/reject`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer admin-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ rejection_reason: reason }),
        }),
      );
    });
  });
});
