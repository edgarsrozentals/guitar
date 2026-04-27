declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        isAdmin: boolean
      } | null
    }
  }
}

export {}
