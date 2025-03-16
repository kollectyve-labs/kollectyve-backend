# kumulus-conductor

Kumulus Cloud and Relai orchestration codebase

## Pulling a postgres database via Drizzle

```bash
### Pull
deno --env -A --node-modules-dir npm:drizzle-kit pull
```
## Running the app

With Postgres as a database

```bash
deno run --env -A app.ts
```

With Deno KV (locally Deno KV need the `--unstable-kv` flag)

```bash
deno run -A app.ts
```

## Testing local agent

```bash
deno run -A --unstable-cron local_agent/main.ts
```
