import { getSupabaseAdmin } from '../lib/supabase'

import type { Request, Response, NextFunction } from 'express'

// Import Express types extension
import '../types/express'

/**
 * Authentication middleware that validates Supabase JWT tokens.
 *
 * Extracts the Bearer token from the Authorization header,
 * validates it with Supabase, and attaches user info to req.user.
 *
 * Returns 401 if:
 * - No Authorization header present
 * - Token is invalid or expired
 * - Supabase is not configured
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      res.status(503).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_UNAVAILABLE',
      })
      return
    }

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    const token = authHeader.substring(7)

    // Validate token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      // Check if it's an expiration error
      if (error?.message?.toLowerCase().includes('expired')) {
        res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED',
        })
        return
      }

      res.status(401).json({
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID',
      })
      return
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    })
  }
}

/**
 * Optional authentication middleware.
 *
 * Similar to authMiddleware but doesn't fail if no token is present.
 * Useful for endpoints that can work both authenticated and unauthenticated
 * (e.g., demo songs that are public but user songs that are private).
 *
 * Sets req.user to null if not authenticated.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    next()
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      req.user = null
      next()
      return
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    req.user = user
      ? {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata,
        }
      : null
  } catch {
    req.user = null
  }

  next()
}

/**
 * Require user to be authenticated and match the userId param.
 *
 * Use this for routes like /api/users/:userId/songs where
 * the user should only access their own resources.
 */
export const requireOwnUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // First run auth middleware
  await authMiddleware(req, res, () => {
    const { userId } = req.params

    if (!req.user) {
      // authMiddleware already sent 401
      return
    }

    if (userId && req.user.id !== userId) {
      res.status(403).json({
        error: 'Access denied to requested resource',
        code: 'ACCESS_DENIED',
      })
      return
    }

    next()
  })
}
