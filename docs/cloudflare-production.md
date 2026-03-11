# Cloudflare Production

`apps/api` no longer exists. The backend now runs only as the native Fastify service in `apps/backend`, and the current production target remains Render as described in [`README.md`](/Users/webstar/Documents/projects/daton-revamp/README.md) and [`render.yaml`](/Users/webstar/Documents/projects/daton-revamp/render.yaml).

If Cloudflare deployment is needed again, it should be designed around the Fastify backend instead of reviving the old Hono worker path.
