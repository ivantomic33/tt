// Type definitions for Next.js helpers used in Supabase server/middleware utilities
declare module 'next/headers' {
  export interface CookieStore {
    getAll(): Array<{ name: string; value: string }>;
    get(name: string): { name: string; value: string } | undefined;
    set(name: string, value: string, options?: Record<string, unknown>): void;
  }
  export function cookies(): Promise<CookieStore>;
}

declare module 'next/server' {
  export interface NextRequest {
    headers: Headers;
    cookies: {
      getAll(): Array<{ name: string; value: string }>;
      get(name: string): { name: string; value: string } | undefined;
      set(name: string, value: string): void;
    };
  }
  export class NextResponse extends Response {
    static next(init?: Record<string, unknown>): NextResponse;
    cookies: {
      set(name: string, value: string, options?: Record<string, unknown>): void;
    };
  }
}
