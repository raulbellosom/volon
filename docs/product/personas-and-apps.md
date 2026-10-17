# Actores, canales y aplicaciones

**Estado:** diseño conceptual; cada aplicación no equivale necesariamente a un despliegue desde el primer día.

| Actor | Necesidades | Canal inicial propuesto |
| --- | --- | --- |
| Comprador | Explorar, comprar, pagar, seguimiento, soporte | Web responsive/PWA |
| Comercio/empleado | Catálogo, sucursales, pedidos, solicitudes de envío | Portal web |
| Repartidor | Disponibilidad, ofertas, ruta, GPS, evidencia, ingresos | Android/iOS con React Native |
| Coordinador de flota | Ver equipo, asignar, resolver excepciones | Módulo web de flotas inicialmente |
| Operador Volón | Despacho, incidencias, tarifas, soporte, auditoría | Consola web |
| Público y prospectos | Conocer propuesta y registrar interés | Marketing web |

## Aplicaciones candidatas
- marketing: Astro.
- customer-web: React/Next.js con prioridades de SEO, enlaces y checkout.
- merchant-web: interfaz responsive para comercios.
- courier-mobile: React Native + Expo; app nativa requerida para GPS y trabajo móvil.
- admin-web: consola operativa y comercial.
- api: backend de negocios con control de permisos y validaciones.
- worker: tareas de colas, eventos, notificaciones y conciliaciones.
- customer-mobile y fleet-web: **futuras, no desarrollar en MVP salvo datos contrarios**.

## Accesos
Una persona puede participar en más de una organización o rol. Evitar suponer un rol global único. Permisos por recurso: merchant, branch, fleet, courier, delivery y platform. El administrador de una tienda no se convierte en operador global.

## Experiencias críticas
- Cliente: reabrir link de rastreo y recuperar el estado confiable aunque se haya perdido el socket.
- Comercio: pedido entrante con confirmación explícita y tiempos de preparación.
- Repartidor: aceptar o rechazar sin condiciones de carrera; recuperación offline; gestos accesibles.
- Operador: mapa con localizaciones recientes y advertencias de ubicación desactualizada.
