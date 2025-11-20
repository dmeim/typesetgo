# Product Vision & Roadmap — KeyBoardCity

## 1. Vision & Goals
Build a fast, classroom-ready typing platform with a clean, Monkeytype-style UI that’s delightful for individual learners and rock-solid for teachers.

### Core Pillars
* **Minimal UI, maximal focus** for practice and tests.
* **Teacher-friendly controls** (shareable presets, assignments, analytics).
* **Trustworthy assessments** (timed tests, accurate metrics, anti-cheat signals).
* **Supabase-native** stack for auth, storage, RLS security, and real-time features.

### Success Metrics (First 90–180 days)
* **<150ms** p95 time-to-first-keystroke (cold page → start typing).
* **>25%** weekly returning users (students) in active classrooms.
* **>90%** teacher satisfaction (survey) with preset sharing & test flows.
* **Zero P1 data issues** (no lost attempts, consistent WPM/accuracy).

---

## 2. Users & Personas
* **Student (K-12 & adult learners)**: Wants quick practice/tests, immediate feedback, personal stats.
* **Teacher**: Needs to configure environment once, share to students, run graded/secure assessments, view per-student analytics.
* **Admin (org/school IT)**: Wants domain-scoped controls, compliance, and simple onboarding.

---

## 3. Roadmap

### Phase 1: Foundation (MVP)
* **Focus**: Core typing experience, basic teacher tools, PWA.
* **Key Features**:
    * Practice modes (Time, Word, Text).
    * Teacher presets & share links.
    * Basic analytics & dashboard.
    * Anti-cheat signals (lightweight).
    * Supabase Auth & RLS.

### Phase 2: Guided Classrooms
* **Focus**: Assignments, content management, org controls.
* **Key Features**:
    * Assignments with due dates.
    * Content packs & discovery.
    * Organization management & roster import.
    * Longitudinal analytics.

### Phase 3: Global Scale
* **Focus**: Internationalization, enterprise integrations, gamification.
* **Key Features**:
    * Multilingual support (ES/FR).
    * Keyboard layout personalization.
    * Advanced anti-cheat & proctoring.
    * Leaderboards & events.
    * LMS Integrations (Google Classroom, Clever).

---

## 4. Tech Stack
* **Frontend**: Next.js/React + TypeScript, PWA.
* **Backend**: Supabase (Postgres, RLS, Auth, Storage, Edge Functions, Realtime).
* **Instrumentation**: PostHog or Supabase logs.
