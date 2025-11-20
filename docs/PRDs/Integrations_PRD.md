# Feature: Integrations & API

## 1. Overview
Connect KeyBoardCity with the broader educational ecosystem.

## 2. LMS Integrations
* **Google Classroom**:
    * Roster Sync: Import classes and students.
    * Assignments: Push KBC assignments to GC stream.
    * Grades: Sync scores back to GC gradebook.
* **Clever**: SSO and Roster sync.

## 3. Enterprise SSO
* **SAML 2.0**: Support for generic IdPs (Okta, Azure AD).
* **SCIM**: Just-in-time provisioning and deprovisioning of users.

## 4. Public API
* **Endpoints**:
    * Fetch user stats/attempts.
    * Fetch leaderboards.
    * Verify assignment completion.
* **Webhooks**:
    * `attempt.completed`
    * `assignment.overdue`
* **Access**: OAuth 2.0 based access tokens.
