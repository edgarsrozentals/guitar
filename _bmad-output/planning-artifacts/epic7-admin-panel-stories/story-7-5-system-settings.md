# Story 7.5: System Settings and Configuration

**Epic:** Admin Panel (Future/Deferred)
**Priority:** P3 - Low (Future Enhancement)
**Size:** Medium
**Backend Required:** Yes

## User Story

As an administrator,
I want to manage system-wide settings,
So that I can configure platform behavior without code changes.

## Technical Context

System settings provide runtime configuration for feature flags, limits, and service integrations. Settings are stored in Supabase and cached for performance.

## Acceptance Criteria

### Settings Categories

**Given** an admin accesses system settings
**When** the page loads
**Then** settings are organized into categories:
- General (site name, description, maintenance mode)
- Feature Flags (enable/disable features)
- Limits (storage per user, songs per user)
- API Keys (external service keys with masked display)
- Email Templates (customizable email content)

### Feature Flags

**Given** feature flags section
**When** admin toggles a flag
**Then**:
- Flag change takes effect immediately
- Users see/don't see feature based on flag
- No deployment required
- Flag history is logged

**Available flags:**
- `enable_stem_separation` - Enable/disable LALAL.ai integration
- `enable_lyrics_sync` - Enable/disable lyrics feature
- `enable_demo_songs` - Show/hide demo songs
- `enable_new_user_signup` - Allow new registrations
- `maintenance_mode` - Show maintenance page

### User Limits

**Given** user limits section
**When** admin modifies a limit
**Then**:
- New limit applies to all users
- Existing users over limit are notified
- Limits are enforced on API endpoints
- Grace period option available

**Configurable limits:**
- `max_songs_per_user` - Maximum songs (default: 50)
- `max_storage_mb_per_user` - Storage limit (default: 500MB)
- `max_analyses_per_day` - Rate limit for analysis

### Maintenance Mode

**Given** maintenance mode is enabled
**When** a non-admin user accesses the site
**Then**:
- Maintenance page is displayed
- Custom message is shown
- Estimated end time is shown (optional)
- Admin can still access all features

### Settings Audit

**Given** any setting is changed
**When** the change is saved
**Then**:
- Previous value is logged
- Admin who made change is logged
- Timestamp is recorded
- Settings history is viewable

## Implementation Notes

### Settings Table Schema

```sql
-- System settings table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category, key)
);

-- Settings history for audit
CREATE TABLE settings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_id UUID REFERENCES system_settings(id),
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - only admins can access
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Initial settings
INSERT INTO system_settings (category, key, value, description) VALUES
  ('general', 'site_name', '"Guitar Practice App"', 'Site display name'),
  ('general', 'maintenance_mode', 'false', 'Enable maintenance mode'),
  ('general', 'maintenance_message', '"We are performing scheduled maintenance."', 'Maintenance page message'),
  ('features', 'enable_stem_separation', 'true', 'Enable LALAL.ai stem separation'),
  ('features', 'enable_lyrics_sync', 'true', 'Enable lyrics synchronization'),
  ('features', 'enable_demo_songs', 'true', 'Show demo songs to visitors'),
  ('features', 'enable_new_user_signup', 'true', 'Allow new user registration'),
  ('limits', 'max_songs_per_user', '50', 'Maximum songs per user'),
  ('limits', 'max_storage_mb_per_user', '500', 'Storage limit in MB per user'),
  ('limits', 'max_analyses_per_day', '20', 'Maximum chord analyses per day');
```

### Settings API

```typescript
// backend/src/routes/admin/settings.ts
import { Router } from "express";
import { requireAdmin } from "../../middleware/admin";
import { supabase } from "../../lib/supabase";

const router = Router();

// Settings cache
let settingsCache: Map<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

async function getSettingsFromCache() {
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  const { data } = await supabase
    .from("system_settings")
    .select("category, key, value, is_secret");

  settingsCache = new Map();
  data?.forEach((s) => {
    const fullKey = `${s.category}.${s.key}`;
    settingsCache!.set(fullKey, s.is_secret ? "[HIDDEN]" : s.value);
  });
  cacheTimestamp = Date.now();

  return settingsCache;
}

// Get all settings (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("category")
      .order("key");

    if (error) throw error;

    // Group by category
    const grouped = data?.reduce((acc, setting) => {
      if (!acc[setting.category]) acc[setting.category] = [];
      acc[setting.category].push({
        ...setting,
        value: setting.is_secret ? "[HIDDEN]" : setting.value,
      });
      return acc;
    }, {} as Record<string, any[]>);

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update a setting
router.put("/:category/:key", requireAdmin, async (req, res) => {
  const { category, key } = req.params;
  const { value } = req.body;

  try {
    // Get current value for history
    const { data: current } = await supabase
      .from("system_settings")
      .select("id, value")
      .eq("category", category)
      .eq("key", key)
      .single();

    if (!current) {
      return res.status(404).json({ error: "Setting not found" });
    }

    // Update setting
    const { error: updateError } = await supabase
      .from("system_settings")
      .update({
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
        updated_by: req.adminUser.id,
      })
      .eq("category", category)
      .eq("key", key);

    if (updateError) throw updateError;

    // Log history
    await supabase.from("settings_history").insert({
      setting_id: current.id,
      previous_value: current.value,
      new_value: value,
      changed_by: req.adminUser.id,
    });

    // Invalidate cache
    settingsCache = null;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// Get settings history
router.get("/history", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("settings_history")
      .select(`
        *,
        system_settings (category, key),
        admin:changed_by (email)
      `)
      .order("changed_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Public endpoint to check maintenance mode
router.get("/maintenance", async (req, res) => {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("category", "general")
      .eq("key", "maintenance_mode")
      .single();

    const isMaintenanceMode = data?.value === true || data?.value === "true";

    if (isMaintenanceMode) {
      const { data: messageData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("category", "general")
        .eq("key", "maintenance_message")
        .single();

      return res.json({
        maintenance: true,
        message: messageData?.value || "Site is under maintenance.",
      });
    }

    res.json({ maintenance: false });
  } catch (err) {
    res.json({ maintenance: false });
  }
});

export default router;

// Helper for other routes to check settings
export async function getSetting(category: string, key: string): Promise<any> {
  const cache = await getSettingsFromCache();
  return cache.get(`${category}.${key}`);
}
```

### Settings Middleware

```typescript
// backend/src/middleware/settings.ts
import { Request, Response, NextFunction } from "express";
import { getSetting } from "../routes/admin/settings";

// Check if feature is enabled
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const enabled = await getSetting("features", featureKey);

    if (!enabled) {
      return res.status(403).json({ error: "Feature is disabled" });
    }

    next();
  };
}

// Check user limits
export async function checkUserLimits(userId: string, type: "songs" | "storage") {
  const maxSongs = await getSetting("limits", "max_songs_per_user");
  const maxStorage = await getSetting("limits", "max_storage_mb_per_user");

  // Implementation would check current usage against limits
  // Return { allowed: boolean, current: number, limit: number }
}

// Maintenance mode middleware
export async function maintenanceCheck(req: Request, res: Response, next: NextFunction) {
  // Skip for admin routes
  if (req.path.startsWith("/api/admin")) {
    return next();
  }

  const maintenanceMode = await getSetting("general", "maintenance_mode");

  if (maintenanceMode === true || maintenanceMode === "true") {
    const message = await getSetting("general", "maintenance_message");
    return res.status(503).json({
      error: "maintenance",
      message: message || "Site is under maintenance.",
    });
  }

  next();
}
```

### Settings UI

```typescript
// product/app/admin/settings/SettingsPage.tsx
"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { AdminGuard } from "../AdminGuard";

interface Setting {
  id: string;
  category: string;
  key: string;
  value: any;
  description: string;
  is_secret: boolean;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});
  const [activeCategory, setActiveCategory] = useState("general");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const response = await fetch("/api/admin/settings");
    const data = await response.json();
    setSettings(data);
  }

  async function updateSetting(category: string, key: string, value: any) {
    setSaving(`${category}.${key}`);

    await fetch(`/api/admin/settings/${category}/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    await fetchSettings();
    setSaving(null);
  }

  return (
    <AdminGuard>
      <Container>
        <Header>
          <h1>System Settings</h1>
        </Header>

        <Layout>
          <Sidebar>
            {Object.keys(settings).map((category) => (
              <CategoryButton
                key={category}
                className={activeCategory === category ? "active" : ""}
                onClick={() => setActiveCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </CategoryButton>
            ))}
          </Sidebar>

          <Content>
            <h2>{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</h2>

            {settings[activeCategory]?.map((setting) => (
              <SettingRow key={setting.key}>
                <SettingInfo>
                  <SettingKey>{setting.key}</SettingKey>
                  <SettingDesc>{setting.description}</SettingDesc>
                </SettingInfo>
                <SettingControl>
                  {renderControl(setting, updateSetting, saving)}
                </SettingControl>
              </SettingRow>
            ))}
          </Content>
        </Layout>
      </Container>
    </AdminGuard>
  );
}

function renderControl(
  setting: Setting,
  onChange: (cat: string, key: string, val: any) => void,
  saving: string | null
) {
  const isSaving = saving === `${setting.category}.${setting.key}`;

  // Boolean toggle
  if (typeof setting.value === "boolean" || setting.value === "true" || setting.value === "false") {
    const isOn = setting.value === true || setting.value === "true";
    return (
      <Toggle
        checked={isOn}
        disabled={isSaving}
        onChange={(e) => onChange(setting.category, setting.key, e.target.checked)}
      />
    );
  }

  // Number input
  if (typeof setting.value === "number" || !isNaN(Number(setting.value))) {
    return (
      <NumberInput
        type="number"
        value={setting.value}
        disabled={isSaving}
        onChange={(e) => onChange(setting.category, setting.key, Number(e.target.value))}
      />
    );
  }

  // Text input (default)
  return (
    <TextInput
      type={setting.is_secret ? "password" : "text"}
      value={setting.is_secret ? "" : setting.value}
      placeholder={setting.is_secret ? "••••••••" : ""}
      disabled={isSaving || setting.is_secret}
      onChange={(e) => onChange(setting.category, setting.key, e.target.value)}
    />
  );
}

// Styled components...
const Container = styled.div`padding: 2rem;`;
const Layout = styled.div`display: flex; gap: 2rem;`;
const Sidebar = styled.div`width: 200px;`;
const Content = styled.div`flex: 1;`;
// ... etc
```

## Testing Checklist
- [ ] Settings table created with initial values
- [ ] Settings CRUD endpoints work
- [ ] Settings history is logged
- [ ] Cache invalidates on change
- [ ] Feature flags toggle features
- [ ] User limits are enforced
- [ ] Maintenance mode works
- [ ] Secret values are hidden
- [ ] UI displays all categories
- [ ] Toggle/input controls work

## Dependencies
- Story 7.1 (Admin Auth)
- Supabase database access
- Settings consumed by other features

## Definition of Done
- [ ] Settings schema implemented
- [ ] History table with audit trail
- [ ] All settings endpoints working
- [ ] Feature flag middleware
- [ ] Limits enforcement
- [ ] Maintenance mode functional
- [ ] Settings UI complete
- [ ] Cache implementation tested
- [ ] Documentation updated
