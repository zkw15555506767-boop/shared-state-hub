# Local Storage Tiering Implementation Plan

1. Add archive paths and storage configuration under Application Support.
2. Extend the SQLite schema with source and archive reference columns.
3. Archive new event envelopes while storing compact SQLite rows.
4. Rehydrate indexed rows to preserve `listEvents()` behavior.
5. Add maintenance commands for status, legacy compaction, and retention pruning.
6. Run an idempotent maintenance pass from the background service.
7. Add compatibility fixtures and validate the production database.
