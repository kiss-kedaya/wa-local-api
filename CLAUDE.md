# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a small CommonJS Node.js service that exposes a local HTTP API over a WhatsApp Web session using `whatsapp-web.js`.

The full application currently lives in `server.js`. It starts an Express API on `127.0.0.1:3000`, initializes a WhatsApp Web client with `LocalAuth`, prints a terminal QR code for login, stores recent incoming messages in memory, and exposes authenticated endpoints for messages and chats.

## Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
API_TOKEN=your-token node server.js
```

On Windows shells, set `API_TOKEN` using the shell-appropriate syntax.

Configured test command:

```bash
npm test
```

This currently fails intentionally with `Error: no test specified`. There is no project test framework, single-test command, build script, lint script, formatter config, or dev/watch script configured.

## Runtime behavior

All API routes require the `x-api-key` header. The token comes from `process.env.API_TOKEN`; if unset, it defaults to `change-me`.

`whatsapp-web.js` stores local auth/session data in `.wwebjs_auth/` via `LocalAuth({ clientId: 'main' })`. Treat this directory as machine-local runtime state and avoid modifying it unless intentionally resetting the WhatsApp login.

The in-memory inbox is capped at 1000 incoming non-self messages and is lost on process restart.

## Architecture notes

`server.js` combines the service layers in one file:

- Express app creation and JSON middleware
- API key auth middleware
- in-memory message buffer
- WhatsApp Web client configuration and lifecycle handlers
- REST endpoints for `/messages`, `/chats`, and `/chat/:id/messages`
- client initialization and HTTP server startup

There are no route modules, service modules, persistence adapters, configuration modules, or tests yet.

## Important files

- `server.js` — actual app entrypoint and full implementation
- `package.json` — package metadata, CommonJS module type, dependencies, and placeholder test script
- `package-lock.json` — locked npm dependency tree
- `.wwebjs_auth/` — generated WhatsApp Web session state

Note: `package.json` declares `"main": "index.js"`, but no `index.js` exists; the runnable entrypoint is `server.js`.
