/**
 * VAZEDGAME — Shared Session Store
 *
 * Note: Supabase authentication is used for user session management.
 * This module is kept for structural compatibility but Supabase
 * Auth handles all session state.
 *
 * If Supabase is not configured, this fallback uses sessionStorage
 * only for demo purposes (passwords never stored).
 */

// Supabase integration: no local storage needed
// User data managed by Supabase Auth
module.exports = {};