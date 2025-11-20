# Feature: User Accounts & Profiles

## 1. Overview
Secure and flexible user management system powered by Supabase. Supports multiple roles and persistent data.

## 2. Authentication
* **Methods**: Email/Password, Google SSO.
* **Session Management**: Persistent sessions via Supabase Auth.

## 3. Roles & Permissions
* **Student**:
    * Can practice and take tests.
    * Can join classes via code/link.
    * View own stats and history.
* **Teacher**:
    * All Student capabilities.
    * Create and manage classes.
    * Create presets and assignments.
    * View student analytics.
* **Admin**:
    * Org-level controls (see Org Admin PRD).

## 4. Data Persistence
* **Profiles**: `display_name`, `role`, `avatar`.
* **Settings**: User preferences (theme, font size, toggles) stored in `settings` table.
* **Attempts**: All practice and test attempts are saved with full metrics.
* **Security**: Row Level Security (RLS) ensures users can only access their own data or data they are authorized to view (e.g., teachers viewing their students).
