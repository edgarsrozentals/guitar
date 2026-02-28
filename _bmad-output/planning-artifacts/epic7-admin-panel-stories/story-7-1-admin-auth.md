# Story 7.1: Admin Role and Authentication

**Epic:** Admin Panel (Future/Deferred)
**Priority:** P3 - Low (Future Enhancement)
**Size:** Medium
**Backend Required:** Yes

## User Story

As an administrator,
I want secure admin-only authentication,
So that only authorized users can access admin functionality.

## Technical Context

Admin authentication extends the existing Supabase Auth system with role-based access control. A custom `admin_users` table or role metadata determines admin privileges.

## Acceptance Criteria

### Admin Role Configuration

**Given** the Supabase Auth system
**When** I configure admin roles
**Then**:
- Admin users are identified by email allowlist or role metadata
- Admin check is performed server-side, not client-side only
- Role information is available in JWT claims
- Non-admin users cannot access admin endpoints

### Admin Login Flow

**Given** a user with admin privileges
**When** they access `/admin`
**Then**:
- They are redirected to login if not authenticated
- After login, admin role is verified
- If admin, they see the admin dashboard
- If not admin, they see "Access Denied" message

### Admin Middleware

**Given** admin-protected API endpoints
**When** a request is made
**Then**:
- Middleware validates JWT token
- Middleware checks admin role claim
- Non-admin requests receive 403 Forbidden
- Admin requests proceed normally

### Session Management

**Given** an active admin session
**When** the session expires
**Then**:
- Admin is redirected to login
- All admin API calls fail gracefully
- Session refresh works for active admins

## Implementation Notes

### Database Schema

```sql
-- Option 1: Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- RLS Policy
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view admin table"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Option 2: Use app_metadata in auth.users
-- Set via Supabase Dashboard or Admin API:
-- { "role": "admin" }
```

### JWT Custom Claims (Edge Function)

```typescript
// supabase/functions/custom-claims/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { user_id } = await req.json();

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user_id)
    .single();

  const claims = {
    is_admin: !!adminUser,
    admin_role: adminUser?.role || null,
  };

  return new Response(JSON.stringify(claims), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Admin Middleware (Backend)

```typescript
// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check admin status
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.adminUser = { ...user, adminRole: adminUser.role };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Auth check failed" });
  }
}
```

### Admin Route Protection (Frontend)

```typescript
// product/app/admin/AdminGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login?redirect=/admin");
        return;
      }

      // Verify admin status via API (server-side check)
      const response = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, [router]);

  if (isAdmin === null) {
    return <div>Checking access...</div>;
  }

  if (!isAdmin) {
    return <div>Access Denied. Admin privileges required.</div>;
  }

  return <>{children}</>;
}
```

## Testing Checklist
- [ ] Admin users table created with RLS
- [ ] Admin check works server-side
- [ ] Non-admin users get 403 on admin endpoints
- [ ] Admin login flow works correctly
- [ ] Session expiry redirects appropriately
- [ ] JWT claims include admin status
- [ ] Frontend AdminGuard protects routes

## Dependencies
- Stories 1.1-1.3 (Auth system)
- Supabase project with Auth enabled
- Decision on role storage (table vs app_metadata)

## Definition of Done
- [ ] Admin role system designed
- [ ] Database schema implemented
- [ ] Admin middleware created
- [ ] Frontend guard component ready
- [ ] Admin verification endpoint working
- [ ] Security review passed
- [ ] Documentation updated
