# Travel Agent

A modern JavaScript project structured as a multi-part app with a web client and an edge/runtime worker, built with Vite, React 19, and Cloudflare Workers. It includes testing with Vitest and uses Wrangler for local development and deployment.

## Features

- React 19 app scaffolding with Vite for fast dev and builds
- Cloudflare Worker service for server/edge logic
- Type-safe, linted code with ESLint and Prettier configs
- Vitest for unit/integration testing
- Wrangler for local worker dev, preview, and deploy

## Project Structure

- app/ — Frontend web app (Vite + React)
- worker/ — Cloudflare Worker service (Wrangler, Vitest)
- .idea, .vscode — Editor/IDE settings
- Root-level gitignore and tooling configs

Note: The primary source code resides under app/ and worker/src/.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm (comes with Node.js)
- Cloudflare account and Wrangler CLI (for worker dev/deploy)

Install Wrangler globally if you plan to work on the worker:
- npm i -g wrangler

Alternatively, use npx wrangler in scripts.

## Getting Started

1) Clone and install dependencies
- npm install

This will install dependencies for the root and for the worker if workspaces/scripts are configured. If not, run npm install inside each subfolder (app and worker).

2) Environment setup
- For the Worker: copy worker/.wrangler/example files or set vars in worker/wrangler.jsonc as needed.
- For the App: create env files as required by your runtime (e.g., app/.env.local). Keep secrets out of version control.

3) Run in development
- App dev (inside app):
    - cd app
    - npm run dev
    - Open the printed local URL.

- Worker dev (inside worker):
    - cd worker
    - npm run dev
    - Wrangler will serve a local worker preview.

If the repo provides root-level scripts to orchestrate both, prefer those. Otherwise, run the two dev servers in separate terminals.

## Scripts

Commonly available scripts (run from the relevant folder):

App (Vite + React):
- npm run dev — Start Vite dev server
- npm run build — Production build
- npm run preview — Preview production build
- npm run lint — Lint code with ESLint
- npm run format — Format code with Prettier (if configured)

Worker (Cloudflare Workers + Wrangler + Vitest):
- npm run dev — Start Wrangler dev server
- npm run deploy — Deploy to Cloudflare
- npm run test — Run unit/integration tests with Vitest
- npm run lint — Lint code with ESLint
- npm run typecheck — Optional, if configured

Refer to package.json files in app/ and worker/ for the exact script names.

## Testing

- Uses Vitest for fast, ESM-friendly testing.
- Run tests from the worker directory (or where tests are defined):
    - cd worker
    - npm test
- Add tests under worker/test or appropriate test folders.

## Linting and Formatting

- ESLint configuration is included.
- Prettier is configured via .prettierrc.
- Recommended workflow:
    - npm run lint
    - npm run format

Consider enabling editor integrations to auto-fix on save.

## Building and Deployment

Frontend (App):
- cd app
- npm run build
- Output will be in app/dist by default.

Worker (Cloudflare):
- cd worker
- Configure wrangler.jsonc (name, routes, account_id, vars)
- npm run deploy

You can also use:
- npx wrangler deploy

## Configuration

- Vite configuration: app/vite.config
- Vitest configuration: worker/vitest.config.js
- Wrangler configuration: worker/wrangler.jsonc
- Editor config: .editorconfig
- Node/npm lockfiles ensure deterministic installs.

Adjust environment variables and bindings in wrangler.jsonc for KV, D1, Durable Objects, or environment-specific settings as needed.

## Troubleshooting

- Port conflicts: change Vite dev server port in app/vite config or via CLI flag, and Worker dev port via Wrangler flags.
- Permissions or auth errors with Wrangler: run npx wrangler login and ensure account_id is set in wrangler.jsonc.
- Type or lint errors: run npm run lint and fix warnings; ensure Node version meets project requirements.

## Contributing

- Create a feature branch
- Keep changes small and tested with Vitest
- Ensure lint passes and code is formatted
- Open a PR with a clear description
