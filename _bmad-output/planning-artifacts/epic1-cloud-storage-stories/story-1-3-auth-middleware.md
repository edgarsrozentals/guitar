# Story 1.3: Backend Auth Middleware and Signed URL Generation

**Epic:** Cloud Song Storage
**Priority:** P0 - Critical
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want to implement backend authentication middleware that validates Supabase JWTs,
So that all API endpoints can securely identify users and generate signed URLs for file access.

## Technical Context

The Express backend needs to validate Supabase JWT tokens from the frontend and generate time-limited signed URLs for secure file access. This ensures files remain private while allowing temporary access for playback.

## Acceptance Criteria

### JWT Validation Middleware

**Given** a request with a valid Supabase JWT in the Authorization header
**When** the request passes through the auth middleware
**Then** the middleware:
- Extracts the Bearer token from "Authorization: Bearer {token}"
- Validates the JWT signature using Supabase JWT secret
- Extracts user_id from the token payload
- Attaches user info to req.user
- Allows the request to proceed

**Given** a request with an expired JWT
**When** the request passes through the auth middleware
**Then** a 401 Unauthorized response is returned with:
```json
{
  "error": "Token expired",
  "code": "AUTH_TOKEN_EXPIRED"
}
```

**Given** a request with an invalid or malformed JWT
**When** the request passes through the auth middleware
**Then** a 401 Unauthorized response is returned with:
```json
{
  "error": "Invalid token",
  "code": "AUTH_TOKEN_INVALID"
}
```

**Given** a request with no Authorization header to a protected endpoint
**When** the request is processed
**Then** a 401 Unauthorized response is returned with:
```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

### Signed URL Generation

**Given** an authenticated user requests a signed URL for their file
**When** the `generateSignedUrl(userId, storagePath)` function is called
**Then** the function:
- Validates the path belongs to the requesting user
- Generates a signed URL with 1-hour expiry
- Returns the URL for client use

**Given** a user attempts to generate a signed URL for another user's file
**When** the function validates the path
**Then** an error is thrown:
```json
{
  "error": "Access denied to requested resource",
  "code": "ACCESS_DENIED"
}
```

### Optional Auth for Public Endpoints

**Given** certain endpoints need optional authentication (demo songs)
**When** using the `optionalAuth` middleware
**Then** the middleware:
- Attempts to validate JWT if present
- Attaches user info if valid
- Continues without error if no token present
- Sets req.user = null for unauthenticated requests

## Implementation Notes

### Auth Middleware Implementation
```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      if (error?.message?.includes('expired')) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  // Reuse auth logic but don't fail on error
  try {
    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user ? {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    } : null;
  } catch {
    req.user = null;
  }

  next();
};
```

### Signed URL Generation
```typescript
// backend/src/utils/storage.ts
export const generateSignedUrl = async (
  userId: string,
  storagePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> => {
  // Validate user owns the file
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('Access denied to requested resource');
  }

  const { data, error } = await supabase.storage
    .from('user-songs')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Signed URL generation failed:', error);
    throw new Error('Failed to generate file access URL');
  }

  return data.signedUrl;
};

// Batch signed URL generation for efficiency
export const generateSignedUrls = async (
  userId: string,
  paths: string[]
): Promise<Record<string, string>> => {
  const urls: Record<string, string> = {};

  await Promise.all(
    paths.map(async (path) => {
      try {
        urls[path] = await generateSignedUrl(userId, path);
      } catch (error) {
        console.error(`Failed to generate URL for ${path}:`, error);
        urls[path] = '';
      }
    })
  );

  return urls;
};
```

### Express Type Extensions
```typescript
// backend/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        metadata?: any;
      } | null;
    }
  }
}
```

## Testing Checklist
- [ ] Valid JWT allows access to protected endpoints
- [ ] Expired JWT returns proper error
- [ ] Invalid JWT returns proper error
- [ ] Missing auth header blocks protected endpoints
- [ ] Optional auth works for public endpoints
- [ ] Signed URLs generated with correct expiry
- [ ] Cross-user file access prevented
- [ ] Error messages are consistent and helpful

## Dependencies
- @supabase/supabase-js package
- jsonwebtoken package (optional, for manual validation)
- Express.js framework
- Environment variables configured

## Definition of Done
- [ ] Auth middleware implemented and tested
- [ ] Signed URL generation working
- [ ] TypeScript types properly extended
- [ ] Error handling comprehensive
- [ ] Unit tests written for middleware
- [ ] Integration tests for protected endpoints
- [ ] Documentation updated with auth flow