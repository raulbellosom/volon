# Operación e infraestructura inicial

**Estado:** estrategia, no archivos desplegables.

## Entornos
Local de desarrollo; staging aislado; producción con variables y credenciales propias. Datos de producción no se copian a equipos de desarrollo sin procedimiento y anonimización pertinentes.

## Servicios propuestos
Edge TLS/reverse proxy; sitios web desplegables independientemente; API; worker; PostgreSQL/PostGIS, Auth, Realtime y Storage self-hosted; Redis; proveedor externo de mapas, pagos y push; observabilidad y backups fuera del host.

## Decisiones operativas
- Docker es adecuado para piloto; **un monorepo no implica un solo contenedor**.
- Primer VPS se dimensiona tras prueba de cargas y presupuesto; evitar anunciar una capacidad arbitraria.
- Autoscaling/HA no son requisitos del primer commit, sí un plan previo a crecimiento.
- Certificados TLS renovables; secretos fuera de Git; redes internas y puertos públicos mínimos.
- Logs estructurados con correlationId, métricas de colas, GPS, tiempo real, base de datos, pagos y mensajes.
- Backups automáticos cifrados y una restauración practicada; documentar RPO/RTO.
- Migraciones reversibles cuando sea posible y compatibilidad de APIs con versiones móviles antiguas.
- Controlar costo de mapas, SMS, pagos, push, almacenamiento e infraestructura.

## Pruebas antes del piloto
Carga de conexiones, pérdida de VPS, recuperación Postgres, expiración de JWT, failover de red, cliente en versión antigua, duplicados de jobs/webhooks, fallos de notificación y operación manual durante degradación de Realtime.
