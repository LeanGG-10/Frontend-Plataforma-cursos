import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('PUBLIC_API_URL', 'http://localhost:3000');
});

import { libraryService } from '../src/services/library.service';
import { ACCESS_TOKEN_KEY, SESSION_ID_KEY } from '../src/services/auth.service';

describe('LibraryService Test Suite (Frontend)', () => {
  const mockApiUrl = 'http://localhost:3000';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getAllLibrary', () => {
    it('should send Bearer token and x-session-id headers and return unified library data', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'valid-token-123');
      localStorage.setItem(SESSION_ID_KEY, 'session-abc-456');

      const mockResponse = {
        totalCourses: 1,
        totalBooks: 1,
        courses: [
          {
            id: 'c1',
            productId: 'c1',
            title: 'Curso NestJS',
            slug: 'curso-nestjs',
            purchasedAt: '2026-11-20T10:00:00Z',
            progress: {
              totalLessons: 10,
              completedLessons: 5,
              percentage: 50,
              total_lessons: 10,
              completed_lessons: 5,
              percentage_completed: 50,
              completedLessonIds: ['l1', 'l2', 'l3', 'l4', 'l5'],
            },
          },
        ],
        books: [
          {
            id: 'b1',
            productId: 'b1',
            title: 'Libro TypeScript',
            slug: 'libro-typescript',
            author: 'Jane Doe',
            hasAccess: true,
            readUrlEndpoint: '/products/b1/read-url',
            purchasedAt: '2026-11-20T11:00:00Z',
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock;

      const result = await libraryService.getAllLibrary();

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/library/all`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token-123',
          'x-session-id': 'session-abc-456',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(mockResponse);
      expect(result.courses).toHaveLength(1);
      expect(result.books).toHaveLength(1);
      expect(result.courses[0].progress.percentage).toBe(50);
    });

    it('should throw UNAUTHORIZED if response status is 401', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expirado' }),
      });
      globalThis.fetch = fetchMock;

      await expect(libraryService.getAllLibrary()).rejects.toThrow(
        'UNAUTHORIZED',
      );
    });

    it('should throw error with backend message if response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Error interno en base de datos' }),
      });
      globalThis.fetch = fetchMock;

      await expect(libraryService.getAllLibrary()).rejects.toThrow(
        'Error interno en base de datos',
      );
    });
  });

  describe('getBookReadUrl', () => {
    it('should fetch signed read url and return it on 200', async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'token-xyz');
      localStorage.setItem(SESSION_ID_KEY, 'session-xyz');

      const signedUrl = 'https://supabase.co/storage/v1/object/sign/books/doc.pdf?token=abc';
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: signedUrl }),
      });
      globalThis.fetch = fetchMock;

      const result = await libraryService.getBookReadUrl('b1');

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/products/b1/read-url`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-xyz',
          'x-session-id': 'session-xyz',
          'Content-Type': 'application/json',
        },
      });
      expect(result).toBe(signedUrl);
    });

    it('should throw UNAUTHORIZED if read-url returns 401', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      globalThis.fetch = fetchMock;

      await expect(libraryService.getBookReadUrl('b1')).rejects.toThrow(
        'UNAUTHORIZED',
      );
    });

    it('should throw error if user does not have permission or purchase', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'No tienes acceso a este libro' }),
      });
      globalThis.fetch = fetchMock;

      await expect(libraryService.getBookReadUrl('b1')).rejects.toThrow(
        'No tienes acceso a este libro',
      );
    });
  });
});
