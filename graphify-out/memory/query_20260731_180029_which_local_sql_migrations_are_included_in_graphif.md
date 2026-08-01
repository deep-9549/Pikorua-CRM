---
type: "query"
date: "2026-07-31T18:00:29.049932+00:00"
question: "Which local SQL migrations are included in Graphify?"
contributor: "graphify"
outcome: "corrected"
correction: "The graph now includes all 19 local SQL migrations; 7 produce relationships and 12 are isolated nodes."
source_nodes: ["20260710_terminal_lead_pools_backfill.sql", "20260701_ai_voice_integration.sql"]
---

# Q: Which local SQL migrations are included in Graphify?

## Answer

After updating .gitignore and rebuilding: all 19 local db_migrations/*.sql files are included in graph.json. Seven migrations contribute connected relationships; twelve are present as isolated file nodes because their SQL statement patterns yielded no supported edges.

## Outcome

- Signal: corrected
- Correction: The graph now includes all 19 local SQL migrations; 7 produce relationships and 12 are isolated nodes.

## Source Nodes

- 20260710_terminal_lead_pools_backfill.sql
- 20260701_ai_voice_integration.sql