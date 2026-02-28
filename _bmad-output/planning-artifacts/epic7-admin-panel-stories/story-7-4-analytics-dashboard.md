# Story 7.4: Analytics Dashboard

**Epic:** Admin Panel (Future/Deferred)
**Priority:** P3 - Low (Future Enhancement)
**Size:** Medium
**Backend Required:** Yes

## User Story

As an administrator,
I want to view platform analytics,
So that I can understand usage patterns and make informed decisions.

## Technical Context

Analytics dashboard aggregates data from Supabase tables to show key metrics, trends, and usage statistics. This provides operational visibility into platform health and growth.

## Acceptance Criteria

### Overview Metrics

**Given** an admin accesses the analytics dashboard
**When** the page loads
**Then**:
- Total users count is displayed
- Total songs count is displayed
- Total storage used (GB) is displayed
- Active users (last 30 days) is shown
- New users this week/month is shown

### Growth Charts

**Given** the analytics dashboard is viewed
**When** charts render
**Then**:
- User signups over time (line chart)
- Songs created over time (line chart)
- Daily active users (bar chart)
- Time range selector (7d, 30d, 90d, 1y)

### Song Analytics

**Given** song statistics section
**When** data is displayed
**Then**:
- Most analyzed songs (top 10)
- Average chords per song
- Stem separation usage rate
- Lyrics sync usage rate
- Songs by analysis status

### User Behavior

**Given** user behavior section
**When** data is displayed
**Then**:
- Average songs per user
- Feature usage breakdown
- Session duration estimates
- Peak usage times (hours/days)

### Demo Song Performance

**Given** demo songs exist
**When** viewing demo analytics
**Then**:
- Demo song view counts
- Conversion rate (demo viewer to signup)
- Most popular demo songs

## Implementation Notes

### Analytics Endpoints

```typescript
// backend/src/routes/admin/analytics.ts
import { Router } from "express";
import { requireAdmin } from "../../middleware/admin";
import { supabase } from "../../lib/supabase";

const router = Router();

// Overview metrics
router.get("/overview", requireAdmin, async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Total songs
    const { count: totalSongs } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true });

    // Active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from("songs")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    // New users this week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: newUsersWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Storage usage (approximate from songs count * average size)
    // Real implementation would query storage API
    const estimatedStorageMB = (totalSongs || 0) * 15; // ~15MB average per song

    res.json({
      total_users: totalUsers || 0,
      total_songs: totalSongs || 0,
      active_users_30d: activeUsers || 0,
      new_users_7d: newUsersWeek || 0,
      storage_mb: estimatedStorageMB,
      storage_gb: (estimatedStorageMB / 1024).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch overview" });
  }
});

// Growth data
router.get("/growth", requireAdmin, async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // User signups by date
    const { data: userGrowth } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Songs by date
    const { data: songGrowth } = await supabase
      .from("songs")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Aggregate by date
    const usersByDate = aggregateByDate(userGrowth || [], "created_at");
    const songsByDate = aggregateByDate(songGrowth || [], "created_at");

    res.json({
      users: usersByDate,
      songs: songsByDate,
      period_days: days,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch growth data" });
  }
});

function aggregateByDate(items: any[], dateField: string) {
  const counts: Record<string, number> = {};

  items.forEach((item) => {
    const date = new Date(item[dateField]).toISOString().split("T")[0];
    counts[date] = (counts[date] || 0) + 1;
  });

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

// Song analytics
router.get("/songs", requireAdmin, async (req, res) => {
  try {
    // Total by status
    const { data: statusCounts } = await supabase
      .from("songs")
      .select("status")
      .then((result) => {
        const counts: Record<string, number> = {};
        result.data?.forEach((s) => {
          counts[s.status] = (counts[s.status] || 0) + 1;
        });
        return { data: counts };
      });

    // With stems
    const { count: withStems } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("has_stems", true);

    // With lyrics
    const { count: withLyrics } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("has_lyrics", true);

    // Average chord analyses per song
    const { data: chordStats } = await supabase
      .from("chord_analyses")
      .select("song_id");

    const uniqueSongsWithChords = new Set(chordStats?.map((c) => c.song_id)).size;
    const avgAnalysesPerSong = chordStats?.length
      ? (chordStats.length / uniqueSongsWithChords).toFixed(2)
      : 0;

    res.json({
      by_status: statusCounts,
      with_stems: withStems || 0,
      with_lyrics: withLyrics || 0,
      avg_analyses_per_song: avgAnalysesPerSong,
      total_analyses: chordStats?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch song analytics" });
  }
});

// Feature usage
router.get("/features", requireAdmin, async (req, res) => {
  try {
    const { count: totalSongs } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true });

    const { count: withStems } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("has_stems", true);

    const { count: withLyrics } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("has_lyrics", true);

    // Analysis library usage
    const { data: libraryUsage } = await supabase
      .from("chord_analyses")
      .select("library");

    const libraryCounts: Record<string, number> = {};
    libraryUsage?.forEach((a) => {
      libraryCounts[a.library] = (libraryCounts[a.library] || 0) + 1;
    });

    res.json({
      total_songs: totalSongs || 0,
      stem_separation_rate: totalSongs ? ((withStems || 0) / totalSongs * 100).toFixed(1) + "%" : "0%",
      lyrics_sync_rate: totalSongs ? ((withLyrics || 0) / totalSongs * 100).toFixed(1) + "%" : "0%",
      chord_library_usage: libraryCounts,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feature usage" });
  }
});

// Demo analytics
router.get("/demos", requireAdmin, async (req, res) => {
  try {
    const { data: demoSongs } = await supabase
      .from("songs")
      .select("id, title, artist, play_count")
      .eq("is_demo", true)
      .order("play_count", { ascending: false });

    // Note: Real conversion tracking would need event logging
    // This is a simplified example
    res.json({
      demo_songs: demoSongs || [],
      total_demos: demoSongs?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch demo analytics" });
  }
});

export default router;
```

### Analytics Dashboard UI

```typescript
// product/app/admin/analytics/AnalyticsDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { AdminGuard } from "../AdminGuard";
import { LineChart, BarChart } from "./Charts";

interface OverviewMetrics {
  total_users: number;
  total_songs: number;
  active_users_30d: number;
  new_users_7d: number;
  storage_gb: string;
}

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    setLoading(true);

    const [overviewRes, growthRes] = await Promise.all([
      fetch("/api/admin/analytics/overview"),
      fetch(`/api/admin/analytics/growth?days=${timeRange}`),
    ]);

    setOverview(await overviewRes.json());
    setGrowthData(await growthRes.json());
    setLoading(false);
  }

  if (loading) return <Loading>Loading analytics...</Loading>;

  return (
    <AdminGuard>
      <Container>
        <Header>
          <h1>Analytics Dashboard</h1>
          <TimeRangeSelector>
            <button className={timeRange === 7 ? "active" : ""} onClick={() => setTimeRange(7)}>
              7 days
            </button>
            <button className={timeRange === 30 ? "active" : ""} onClick={() => setTimeRange(30)}>
              30 days
            </button>
            <button className={timeRange === 90 ? "active" : ""} onClick={() => setTimeRange(90)}>
              90 days
            </button>
          </TimeRangeSelector>
        </Header>

        <MetricsGrid>
          <MetricCard>
            <MetricValue>{overview?.total_users}</MetricValue>
            <MetricLabel>Total Users</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{overview?.total_songs}</MetricValue>
            <MetricLabel>Total Songs</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{overview?.active_users_30d}</MetricValue>
            <MetricLabel>Active Users (30d)</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{overview?.new_users_7d}</MetricValue>
            <MetricLabel>New Users (7d)</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{overview?.storage_gb} GB</MetricValue>
            <MetricLabel>Storage Used</MetricLabel>
          </MetricCard>
        </MetricsGrid>

        <ChartsSection>
          <ChartCard>
            <h3>User Growth</h3>
            <LineChart data={growthData?.users || []} />
          </ChartCard>
          <ChartCard>
            <h3>Songs Created</h3>
            <LineChart data={growthData?.songs || []} />
          </ChartCard>
        </ChartsSection>

        <FeatureUsageSection />
      </Container>
    </AdminGuard>
  );
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;

    &.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
`;

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  h3 {
    margin: 0 0 1rem 0;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 4rem;
`;
```

### Add Play Count Column

```sql
-- Add play count for demo analytics
ALTER TABLE songs ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(song_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE songs SET play_count = play_count + 1 WHERE id = song_id;
END;
$$ LANGUAGE plpgsql;
```

## Testing Checklist
- [ ] Overview metrics load correctly
- [ ] User counts are accurate
- [ ] Song counts are accurate
- [ ] Storage estimate reasonable
- [ ] Growth charts render
- [ ] Time range selector works
- [ ] Feature usage stats accurate
- [ ] Demo analytics display
- [ ] Charts are responsive

## Dependencies
- Story 7.1 (Admin Auth)
- Supabase tables with data
- Chart library (recharts or similar)

## Definition of Done
- [ ] Overview endpoint returns accurate data
- [ ] Growth data aggregation works
- [ ] Feature usage statistics implemented
- [ ] Demo analytics working
- [ ] Charts render correctly
- [ ] Time range filtering works
- [ ] Dashboard is responsive
- [ ] Performance acceptable (<2s load)
