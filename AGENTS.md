<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Memory & Environment

- **Production Domain:** `https://siapkinerja.dev-ims.net/` (diubah dari domain lama `siaptugas.dev-ims.net`)
- **Production Server:** `45.76.154.46` (port `29453`, user `task_mgt_devops`, SSH key: `~/.ssh/task_mgt_devops_ims`)
- **Deployment Target Branch:** `prod` (GitHub `origin/prod`)
- **Database:** PostgreSQL lokal `127.0.0.1:5432/task_mgt` di server
- **Container Service:** Docker Compose `task_mgt-app-1` via `/usr/local/sbin/task-mgt-docker`

