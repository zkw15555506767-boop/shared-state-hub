# Local Storage Tiering Design

## Goal

Keep Shared State Hub single-device and local-only while preventing capture growth from making the database or UI unusable. The observable event, reducer, Join Context, and MCP behavior must remain compatible with the pre-tiering implementation.

## Storage layers

```text
SQLite index and state
  - event IDs, type, task, timestamp, source, payload, evidence, visibility, risk
  - task snapshots and compact query indexes

Local JSONL archive
  - original event envelope before redundant SQLite raw JSON is discarded
  - one file per date and task under Application Support/archive
  - retained for 30 days by default

Local assets (future)
  - user-selected attachments and large media, referenced from events
```

There is no cloud or cross-device sync.

## Compatibility rule

`listEvents()` must reconstruct the same event object fields consumed by the reducer, Join Context, HTTP API, and MCP tools. The source object is stored as JSON so non-standard source fields are preserved. Existing rows are migrated by archiving their old `raw_json`, then replacing that redundant duplicate with a compact marker. Direct and captured events preserve their structured payload and evidence.

## Archive and retention

- Every new event is appended locally to a JSONL archive before its compact index row is inserted.
- Archive paths, byte offsets, and lengths are stored with the indexed event.
- A maintenance command reports index/archive usage, compacts legacy rows, and prunes archive files older than 30 days.
- Pruning removes only archived raw envelopes. The task event index, summaries, decisions, claims, and Join Context remain in SQLite.

## Read behavior

- Dashboard and task state continue to query structured indexed events.
- Timeline and event API remain bounded by existing limits.
- No normal UI or MCP read has to scan archive JSONL files.

## Validation

1. Inserted event round-trips through `listEvents()` with identical semantic fields.
2. Legacy raw rows migrate to archive and still yield the same reduced state and Join Context.
3. Archive cleanup only deletes files past retention and leaves indexed task state intact.
4. Existing HTTP, MCP, capture, and handoff fixtures pass.
