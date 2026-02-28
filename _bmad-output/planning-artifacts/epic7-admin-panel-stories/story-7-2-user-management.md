# Story 7.2: User Management Dashboard

**Epic:** Admin Panel (Future/Deferred)
**Priority:** P3 - Low (Future Enhancement)
**Size:** Large
**Backend Required:** Yes

## User Story

As an administrator,
I want to view and manage all users,
So that I can monitor usage and handle account issues.

## Technical Context

User management requires Supabase Admin API access (service role key) to list, view, and modify user accounts. This should only be accessible to authenticated admins.

## Acceptance Criteria

### User List View

**Given** an admin accesses the user management page
**When** the page loads
**Then**:
- All users are listed with pagination (25 per page)
- Users show: email, created date, last sign-in, song count
- List is sortable by each column
- Search by email is available
- Total user count is displayed

### User Detail View

**Given** an admin clicks on a user
**When** the detail modal/page opens
**Then**:
- Full user profile is displayed
- List of user's songs is shown
- Account status (active/banned) is visible
- Last activity timestamp is shown
- Storage usage is calculated

### User Actions

**Given** an admin viewing a user
**When** they select an action
**Then**:
- Can disable/enable user account
- Can delete user (with confirmation)
- Can view user's songs directly
- Can send password reset email
- All actions are logged

### User Statistics

**Given** the admin dashboard
**When** viewing user statistics
**Then**:
- Total users count
- New users this week/month
- Active users (last 30 days)
- Users by signup method (email, OAuth)

## Implementation Notes

### Admin API Endpoints

```typescript
// backend/src/routes/admin/users.ts
import { Router } from "express";
import { requireAdmin } from "../../middleware/admin";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// List users with pagination
router.get("/", requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;
  const search = req.query.search as string;

  try {
    const { data: { users }, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (error) throw error;

    // Filter by search if provided
    let filteredUsers = users;
    if (search) {
      filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Get song counts for each user
    const userIds = filteredUsers.map(u => u.id);
    const { data: songCounts } = await adminSupabase
      .from("songs")
      .select("user_id")
      .in("user_id", userIds);

    const countMap = userIds.reduce((acc, id) => {
      acc[id] = songCounts?.filter(s => s.user_id === id).length || 0;
      return acc;
    }, {} as Record<string, number>);

    const enrichedUsers = filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      song_count: countMap[u.id] || 0,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
    }));

    res.json({
      users: enrichedUsers,
      page,
      limit,
      total: users.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user details
router.get("/:userId", requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: { user }, error } = await adminSupabase.auth.admin.getUserById(userId);

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's songs
    const { data: songs } = await adminSupabase
      .from("songs")
      .select("id, title, artist, created_at, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Calculate storage usage
    const { data: files } = await adminSupabase
      .storage
      .from("songs")
      .list(userId);

    const storageBytes = files?.reduce((acc, f) => acc + (f.metadata?.size || 0), 0) || 0;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        app_metadata: user.app_metadata,
        banned: user.banned_until ? new Date(user.banned_until) > new Date() : false,
      },
      songs,
      storage_bytes: storageBytes,
      storage_mb: (storageBytes / (1024 * 1024)).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// Ban/unban user
router.post("/:userId/ban", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { ban, duration_hours } = req.body;

  try {
    if (ban) {
      const banUntil = duration_hours
        ? new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString()
        : new Date("2099-12-31").toISOString(); // Permanent

      await adminSupabase.auth.admin.updateUserById(userId, {
        ban_duration: duration_hours ? `${duration_hours}h` : "876000h", // ~100 years
      });
    } else {
      await adminSupabase.auth.admin.updateUserById(userId, {
        ban_duration: "0h",
      });
    }

    // Log action
    await adminSupabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: ban ? "user_banned" : "user_unbanned",
      target_user_id: userId,
      details: { duration_hours },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Delete user
router.delete("/:userId", requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    // Delete user's songs from storage
    const { data: songs } = await adminSupabase
      .from("songs")
      .select("id")
      .eq("user_id", userId);

    for (const song of songs || []) {
      await adminSupabase.storage
        .from("songs")
        .remove([`${userId}/${song.id}/audio.mp3`]);
    }

    // Delete user (cascade deletes songs table entries)
    await adminSupabase.auth.admin.deleteUser(userId);

    // Log action
    await adminSupabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: "user_deleted",
      target_user_id: userId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
```

### User Management UI

```typescript
// product/app/admin/users/UsersPage.tsx
"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { AdminGuard } from "../AdminGuard";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  song_count: number;
  banned: boolean;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  async function fetchUsers() {
    setLoading(true);
    const response = await fetch(
      `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`
    );
    const data = await response.json();
    setUsers(data.users);
    setLoading(false);
  }

  return (
    <AdminGuard>
      <Container>
        <Header>
          <h1>User Management</h1>
          <SearchInput
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Header>

        {loading ? (
          <Loading>Loading users...</Loading>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Songs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>{user.song_count}</td>
                  <td>{user.banned ? "Banned" : "Active"}</td>
                  <td>
                    <ActionButton onClick={() => viewUser(user.id)}>
                      View
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <Pagination>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(page + 1)}>Next</button>
        </Pagination>
      </Container>
    </AdminGuard>
  );
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 300px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #f5f5f5;
    font-weight: 600;
  }
`;

const ActionButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
`;
```

### Audit Log Table

```sql
-- Admin audit log for tracking admin actions
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID,
  target_song_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
```

## Testing Checklist
- [ ] User list displays with pagination
- [ ] Search filters users by email
- [ ] User detail view shows all info
- [ ] Song count is accurate
- [ ] Storage usage is calculated
- [ ] Ban/unban functionality works
- [ ] Delete user removes all data
- [ ] Audit log captures all actions
- [ ] Only admins can access

## Dependencies
- Story 7.1 (Admin Auth)
- Supabase Admin API access
- Frontend admin layout

## Definition of Done
- [ ] User list endpoint implemented
- [ ] User detail endpoint implemented
- [ ] Ban/unban functionality working
- [ ] Delete user with cascade
- [ ] Audit logging in place
- [ ] Frontend components complete
- [ ] Pagination and search working
- [ ] Security review passed
