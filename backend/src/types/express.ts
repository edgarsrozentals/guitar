// Express type extensions for authenticated requests
// Re-export from declaration file

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string
        email?: string
        metadata?: Record<string, unknown>
      } | null
    }
  }
}

export {}
