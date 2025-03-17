# Kollectyve Backend

### Pulling a postgres database via Drizzle

```bash
### Pull
deno --env -A --node-modules-dir npm:drizzle-kit pull
```

## Running the app

With Postgres as a database

```bash
deno run --env -A app.ts
```

## Testing local agent

```bash
deno run  --allow-env --allow-read --allow-net --unstable-cron --allow-run --allow-write local_agent/main.ts
```
