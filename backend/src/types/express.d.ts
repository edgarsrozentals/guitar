// Express type extensions for authenticated requests

declare global {
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
