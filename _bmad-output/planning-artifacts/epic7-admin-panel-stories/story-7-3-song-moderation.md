# Story 7.3: Song Moderation Interface

**Epic:** Admin Panel (Future/Deferred)
**Priority:** P3 - Low (Future Enhancement)
**Size:** Medium
**Backend Required:** Yes

## User Story

As an administrator,
I want to view and moderate all songs,
So that I can ensure content compliance and assist users.

## Technical Context

Song moderation allows admins to view all songs across all users, play them for verification, and take moderation actions like removing inappropriate content or promoting songs to demo status.

## Acceptance Criteria

### Song List View

**Given** an admin accesses the song moderation page
**When** the page loads
**Then**:
- All songs across all users are listed
- Songs show: title, artist, owner, created date, status
- Pagination with 50 songs per page
- Filter by status (all, active, flagged, demo)
- Search by title or artist

### Song Preview

**Given** an admin selects a song
**When** they click preview
**Then**:
- Audio can be played in-browser
- Chord timeline is visible
- Stems (if available) can be previewed
- Metadata is fully displayed

### Moderation Actions

**Given** an admin viewing a song
**When** they take a moderation action
**Then**:
- Can remove song (soft delete with reason)
- Can flag song for review
- Can promote song to demo status
- Can demote demo song back to private
- Can transfer song to another user

### Bulk Actions

**Given** multiple songs selected
**When** bulk action is performed
**Then**:
- Can bulk remove selected songs
- Can bulk flag selected songs
- Confirmation required for destructive actions
- Progress indicator for bulk operations

## Implementation Notes

### Song Moderation Endpoints

```typescript
// backend/src/routes/admin/songs.ts
import { Router } from "express";
import { requireAdmin } from "../../middleware/admin";
import { supabase } from "../../lib/supabase";

const router = Router();

// List all songs
router.get("/", requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const status = req.query.status as string;
  const search = req.query.search as string;

  try {
    let query = supabase
      .from("songs")
      .select(`
        id,
        title,
        artist,
        status,
        is_demo,
        created_at,
        user_id,
        users:user_id (email)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status === "demo") {
      query = query.eq("is_demo", true);
    } else if (status === "flagged") {
      query = query.eq("status", "flagged");
    } else if (status === "active") {
      query = query.eq("status", "active");
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    }

    const { data: songs, count, error } = await query;

    if (error) throw error;

    res.json({
      songs,
      page,
      limit,
      total: count,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Get song details with audio URL
router.get("/:songId", requireAdmin, async (req, res) => {
  const { songId } = req.params;

  try {
    const { data: song, error } = await supabase
      .from("songs")
      .select(`
        *,
        chord_analyses (*),
        users:user_id (id, email)
      `)
      .eq("id", songId)
      .single();

    if (error || !song) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Generate signed URL for admin preview
    const { data: urlData } = await supabase.storage
      .from("songs")
      .createSignedUrl(`${song.user_id}/${songId}/audio.mp3`, 3600);

    res.json({
      ...song,
      audio_url: urlData?.signedUrl,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch song" });
  }
});

// Flag song for review
router.post("/:songId/flag", requireAdmin, async (req, res) => {
  const { songId } = req.params;
  const { reason } = req.body;

  try {
    const { error } = await supabase
      .from("songs")
      .update({
        status: "flagged",
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
        moderated_by: req.adminUser.id,
      })
      .eq("id", songId);

    if (error) throw error;

    // Log action
    await supabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: "song_flagged",
      target_song_id: songId,
      details: { reason },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to flag song" });
  }
});

// Remove song (soft delete)
router.post("/:songId/remove", requireAdmin, async (req, res) => {
  const { songId } = req.params;
  const { reason } = req.body;

  try {
    const { error } = await supabase
      .from("songs")
      .update({
        status: "removed",
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
        moderated_by: req.adminUser.id,
      })
      .eq("id", songId);

    if (error) throw error;

    await supabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: "song_removed",
      target_song_id: songId,
      details: { reason },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove song" });
  }
});

// Promote to demo
router.post("/:songId/promote-demo", requireAdmin, async (req, res) => {
  const { songId } = req.params;

  try {
    const { error } = await supabase
      .from("songs")
      .update({
        is_demo: true,
        moderated_at: new Date().toISOString(),
        moderated_by: req.adminUser.id,
      })
      .eq("id", songId);

    if (error) throw error;

    await supabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: "song_promoted_demo",
      target_song_id: songId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to promote song" });
  }
});

// Demote from demo
router.post("/:songId/demote-demo", requireAdmin, async (req, res) => {
  const { songId } = req.params;

  try {
    const { error } = await supabase
      .from("songs")
      .update({
        is_demo: false,
        moderated_at: new Date().toISOString(),
        moderated_by: req.adminUser.id,
      })
      .eq("id", songId);

    if (error) throw error;

    await supabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: "song_demoted_demo",
      target_song_id: songId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to demote song" });
  }
});

// Bulk action
router.post("/bulk-action", requireAdmin, async (req, res) => {
  const { song_ids, action, reason } = req.body;

  if (!song_ids?.length) {
    return res.status(400).json({ error: "No songs selected" });
  }

  try {
    let updateData: Record<string, any> = {
      moderated_at: new Date().toISOString(),
      moderated_by: req.adminUser.id,
    };

    switch (action) {
      case "flag":
        updateData.status = "flagged";
        updateData.moderation_reason = reason;
        break;
      case "remove":
        updateData.status = "removed";
        updateData.moderation_reason = reason;
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    const { error } = await supabase
      .from("songs")
      .update(updateData)
      .in("id", song_ids);

    if (error) throw error;

    // Log bulk action
    await supabase.from("admin_audit_log").insert({
      admin_id: req.adminUser.id,
      action: `bulk_${action}`,
      details: { song_ids, reason },
    });

    res.json({ success: true, affected: song_ids.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to perform bulk action" });
  }
});

export default router;
```

### Extended Songs Table Schema

```sql
-- Add moderation columns to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

-- Index for filtering
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_is_demo ON songs(is_demo);
```

### Moderation UI Components

```typescript
// product/app/admin/songs/SongModerationPage.tsx
"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { AdminGuard } from "../AdminGuard";

interface Song {
  id: string;
  title: string;
  artist: string;
  status: string;
  is_demo: boolean;
  created_at: string;
  users: { email: string };
}

export function SongModerationPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewSong, setPreviewSong] = useState<Song | null>(null);

  async function handleFlag(songId: string) {
    const reason = prompt("Enter flag reason:");
    if (!reason) return;

    await fetch(`/api/admin/songs/${songId}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    fetchSongs();
  }

  async function handleBulkAction(action: string) {
    if (selected.size === 0) return;

    if (!confirm(`Are you sure you want to ${action} ${selected.size} songs?`)) {
      return;
    }

    const reason = action === "remove" ? prompt("Enter removal reason:") : undefined;

    await fetch("/api/admin/songs/bulk-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        song_ids: Array.from(selected),
        action,
        reason,
      }),
    });

    setSelected(new Set());
    fetchSongs();
  }

  return (
    <AdminGuard>
      <Container>
        <Header>
          <h1>Song Moderation</h1>
          <Controls>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Songs</option>
              <option value="active">Active</option>
              <option value="flagged">Flagged</option>
              <option value="demo">Demo Songs</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Controls>
        </Header>

        {selected.size > 0 && (
          <BulkActions>
            <span>{selected.size} selected</span>
            <button onClick={() => handleBulkAction("flag")}>Flag</button>
            <button onClick={() => handleBulkAction("remove")}>Remove</button>
          </BulkActions>
        )}

        <SongTable>
          {/* Table implementation */}
        </SongTable>

        {previewSong && (
          <PreviewModal song={previewSong} onClose={() => setPreviewSong(null)} />
        )}
      </Container>
    </AdminGuard>
  );
}
```

## Testing Checklist
- [ ] Song list shows all songs across users
- [ ] Filtering by status works
- [ ] Search by title/artist works
- [ ] Preview plays audio correctly
- [ ] Flag action updates status
- [ ] Remove action soft deletes
- [ ] Promote to demo works
- [ ] Demote from demo works
- [ ] Bulk actions work correctly
- [ ] Audit log captures actions

## Dependencies
- Story 7.1 (Admin Auth)
- Story 7.2 (User Management)
- Songs table with moderation columns
- Storage access for previews

## Definition of Done
- [ ] Song list endpoint with filters
- [ ] Song preview with signed URL
- [ ] Flag/remove/promote actions
- [ ] Bulk action support
- [ ] Moderation columns added
- [ ] Audit logging complete
- [ ] Frontend components done
- [ ] Security review passed
