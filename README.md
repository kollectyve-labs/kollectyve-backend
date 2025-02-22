# kumulus-conductor

Kumulus Cloud and Relai orchestration codebase

## Running the app

With Postgres as a database

```bash
deno run --env -A app.ts
```

With Deno KV (locally Deno KV need the `--unstable-kv` flag)

```bash
deno run  -A --unstable-kv app.ts
```

## Testing endpoint
