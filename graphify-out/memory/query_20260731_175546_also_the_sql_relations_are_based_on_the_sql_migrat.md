---
type: "query"
date: "2026-07-31T17:55:46.156977+00:00"
question: "also the sql relations are based on the sql migrations available in the git or all the sql migrations available locally??"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20260720_meta_lead_platform.sql", "Database Schema Catalog"]
---

# Q: also the sql relations are based on the sql migrations available in the git or all the sql migrations available locally??

## Answer

Expanded via graph vocabulary: [sql, migrate, database, schema, drizzle, local]. Graphify scans the local working tree but honors .gitignore and .graphifyignore. This repository has 19 local db_migrations SQL files, 6 Git-tracked SQL files, and the graph records exactly those same 6 because .gitignore ignores *.sql except six explicit db_migrations negations. Therefore current SQL relations are based on those 6 eligible/tracked migration files, not all 19 local files. An untracked SQL file would still be included if it were not ignored.

## Outcome

- Signal: useful

## Source Nodes

- 20260720_meta_lead_platform.sql
- Database Schema Catalog