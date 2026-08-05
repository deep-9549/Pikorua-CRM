---
type: "query"
date: "2026-08-05T07:49:47.828174+00:00"
question: "also make sure that those freshly assigned leads get moved to normal leads section after they are visited once"
contributor: "graphify"
outcome: "useful"
source_nodes: [".detail()", "isFreshlyAssignedLead()", "serializeMetaLead()", "meta_leads Table"]
---

# Q: also make sure that those freshly assigned leads get moved to normal leads section after they are visited once

## Answer

Expanded from original query via graph vocab: [lead, freshly, assigned, detail, activity, open, reviewed, assignment, history]. The graph showed no durable lead-view marker. Implemented assignment_viewed_at on meta_leads; authorized lead detail opens by the assigned sales executive mark the assignment viewed, and isFreshlyAssignedLead compares assigned_at against assignment_viewed_at so transfers become fresh again.

## Outcome

- Signal: useful

## Source Nodes

- .detail()
- isFreshlyAssignedLead()
- serializeMetaLead()
- meta_leads Table