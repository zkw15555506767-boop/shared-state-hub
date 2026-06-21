# Task Plan: Local Storage Tiering

## Goal

Move redundant raw event envelopes out of the SQLite hot path while keeping a 30-day local archive and preserving all current task, MCP, and Join Context behavior.

## Phases

- [x] Audit current event dependencies and confirm compatibility boundary
- [x] Add local archive and compact event index
- [x] Add storage maintenance and retention
- [x] Migrate existing local data without semantic changes
- [x] Validate fixtures and production database

## Validation

- `storage:fixture` proves current and legacy events round-trip through `listEvents()` with the same semantic fields after compaction and archive pruning.
- Production database compacted 1,845 legacy duplicate raw JSON envelopes; archive retention is 30 days.
- Production pages and Join Context returned HTTP 200 after compaction.

## Constraints

- Single-device only; no cloud or cross-device sync.
- Preserve event semantics returned by `listEvents()`.
- Keep task state and Join Context after raw archive pruning.
- Never silently delete current or future task indexes.
