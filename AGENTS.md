## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
## Production and Git Operations

For any question or requested action involving:

- commits, staging, pushing, branches, pull requests, or merges;
- production, deployment, releases, rollbacks, or hotfixes;
- Cloud Build, GCP, Docker, DNS, databases, migrations, backups, secrets, or production troubleshooting;

you MUST consult the repository-root `production.md` before answering or acting.

Rules:

1. Read the table of contents, "Read This First", source-of-truth hierarchy, and every section relevant to the request.
2. Treat `production.md` as the repository's production runbook. Do not guess commands, branch names, infrastructure details, deployment behavior, or environment configuration.
3. If required information is missing, outdated, contradictory, or cannot be verified, state that clearly and ask for verification instead of making assumptions.
4. Follow the source-of-truth hierarchy documented in `production.md` whenever documentation and runtime state differ.
5. Before any commit or push, inspect the current branch, remote, status, and intended diff.
6. Remember that this repository's production branch is unusually named `origin`, and pushing to it can trigger production deployment. Never assume that `git push origin origin` is intended.
7. A question about production is not authorization to modify production. Do not push, deploy, merge, migrate, restart, delete, or change production resources unless the user explicitly requests that action.
8. Never expose production secrets or print production environment-file contents.
9. In the response, briefly mention which `production.md` sections were consulted.