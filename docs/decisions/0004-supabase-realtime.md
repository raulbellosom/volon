# ADR-0004: Supabase self-hosted y Broadcast para tiempo real
- **Fecha:** 2026-10-17
- **Estado:** Propuesta condicionada
- **Contexto:** auth, Postgres/PostGIS, archivos, mensajes en vivo y operación propia en VPS.
- **Elección candidata:** Supabase Self-Hosted para datos comunes y Realtime Broadcast privado; Redis para presencia operativa/ubicación reciente; API para operaciones autoritativas.
- **Alternativas:** servicios separados Postgres/Identity/Socket server; proveedor Supabase gestionado; otra BaaS.
- **Motivos:** integrar funciones conocidas y retener control de infraestructura.
- **Riesgos:** mantenimiento y actualizaciones propios, licencias de dependencias, control de autorización, escala de mensajes, backups y HA.
- **Condición de aceptación:** POC de Broadcast privado + carga de GPS + restauración real + revisión de versiones/licencias.
- **No decisión:** Supabase no reemplazará mapas, GPS de dispositivo, pasarela de pago ni notificaciones push.
