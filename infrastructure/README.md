# Infraestructura local

El backend local usa [`supabase/config.toml`](../supabase/config.toml) y CLI oficial fijada para el stack Supabase. [`compose.yaml`](../compose.yaml) administra únicamente API/Redis; no contiene otro PostgreSQL.

Comandos y restricciones: [runbook del backend local](../docs/operations/local-backend.md). No hay despliegue público. Self-Hosted de producción, observabilidad, backup/restore y capacidad siguen pendientes: [hosting](../docs/operations/hosting.md).
