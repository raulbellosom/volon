# Supabase Self-Hosted — evaluación

**Estado:** candidato para infraestructura; NO desplegado ni validado para el tráfico de Volón.

## Capacidades a considerar
PostgreSQL, Auth, Storage, Realtime (Broadcast/Presence y Postgres Changes), políticas RLS y funciones adicionales según versión/stack seleccionado. PostGIS requiere instalación/habilitación y pruebas. Supabase no desarrolla nuestro algoritmo de despacho, geolocalización móvil, cartografía, pagos ni envía por sí mismo push a Android/iOS/Web.

## Uso comercial y cumplimiento
Los principales componentes open source de Supabase se distribuyen bajo licencias permisivas, pero antes de comercializar deben inventariarse **las licencias exactas de cada imagen/dependencia y versiones utilizadas** y respetar avisos y marcas. El uso comercial de la pila open source no equivale a derechos de marca ni a todas las prestaciones de su nube gestionada.

## Límites self-hosted
- Operación propia de seguridad, actualizaciones, incidentes, disponibilidad, capacidad, SMTP, backups, PITR y restore.
- Configuración correcta de JWT, RLS, claves de servicio, tokens de clientes y controles de red.
- Documentar qué funciones administradas no existen en el despliegue elegido.
- Probar Broadcast privado, reconexión y cantidad de conexiones bajo carga GPS.
- No exponer claves privilegiadas en apps cliente ni permitir escritura directa de estado crítico a tablas por conveniencia.

## Evaluaciones obligatorias
1. Versiones y licencias fijadas (Docker images y servicios dependientes).
2. SSO/Auth y sesión móvil segura; revocación de acceso por tienda y entrega.
3. Broadcast privado y throughput/límites medidos.
4. Compatibilidad PostGIS y costo de consultas geográficas.
5. Backup completo, restauración de prueba y punto de recuperación objetivo.
6. Requerimientos mínimos reales de RAM/CPU/disco según carga.
7. Alta disponibilidad y recuperación del servicio ante falla de un nodo.

## Fuentes a consultar al implementar
- https://supabase.com/docs/guides/self-hosting
- https://supabase.com/docs/guides/realtime
- https://github.com/supabase/supabase
- https://github.com/supabase/realtime

Estas referencias requieren verificación al fijar versiones.
