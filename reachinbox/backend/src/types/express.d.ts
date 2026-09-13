import "cookie-session";

declare global {
  namespace Express {
    interface Request {
      session: (Record<string, any> & { userId?: string }) | null;
    }
  }
}

export {};
