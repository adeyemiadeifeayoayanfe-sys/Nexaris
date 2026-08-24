# Security Notes

- Store privileged Supabase keys only in backend environment files.
- Expose only publishable Supabase credentials to frontend code.
- Never commit `.env` files.
- Treat future migrations as audited change sets.
- Do not run destructive commands against a linked remote database without confirmation.
- Add role-based authorization in backend and database policies before shipping feature work.
