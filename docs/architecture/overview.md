# Arquitectura candidata

**Estado:** dirección de arquitectura, no implementación.

> Desglose detallado propuesto: [especificación integral](../specification/README.md). Consultar límites modulares, API, eventos, seguridad, fallos y escalabilidad antes de abrir tareas técnicas.

## Topología lógica
Apps web y móviles → API de negocio (monolito modular) → PostgreSQL/PostGIS y servicios → workers. Canal auxiliar de Broadcast/Presence para experiencia en vivo. GPS se ingiere mediante endpoint autenticado propio. Notificaciones push por servicio de entrega de mensajes externo.

## Subsistemas
- **Aplicaciones:** marketing, cliente, comercio, repartidor y administración.
- **API central:** authz, comercios, catálogo, pedidos, entregas, despacho, tarifas, pagos, soporte, auditoría.
- **Tracking API:** puede ser módulo de la API inicialmente; extraer solo por evidencia de carga o aislamiento.
- **Workers:** envío de notificaciones, reintentos, outbox, tareas programadas, conciliaciones.
- **Datos:** PostgreSQL + PostGIS como fuente autoritativa de entidades y estado de negocio.
- **Redis:** estados efímeros, ubicación más reciente, limitación de tasa, colas con políticas de persistencia.
- **Supabase Self-Hosted:** candidata para Auth, Storage y Realtime; no reemplaza autorización de negocio ni despacho.
- **Proveedores externos:** pasarela de pagos, mapas/rutas, correo, push, observabilidad y storage compatible, por interfaces intercambiables.

## Reglas de arquitectura
1. No aceptar cobros, transiciones críticas o asignaciones solo por eventos de cliente o sockets.
2. Escrituras críticas mediante API y transacciones con validación de autorización.
3. WebSockets no son fuente de verdad; clientes reconcilian por API al reconectar.
4. Domain events y transactional outbox para entrega confiable de eventos.
5. Separar Order (comercial) y Delivery (logística) y Money Movement (financiero).
6. Nombres de marca no deben aparecer en contratos o identificadores internos.
7. Limitar retención y difusión de geolocalización desde diseño.
8. Monitoreo, respaldos externos y restauración ensayada antes del piloto remunerado.

## Qué no necesitamos aún
Microservicios para cada dominio, Kafka, Kubernetes, distribución de paquetes privados ni aplicaciones duplicadas para cada rol. Extraer servicios solo ante necesidad verificable.

## Decisiones condicionadas
Elección final de framework backend/ORM, proveedor GPS/rutas, estrategia de auth para mobile, hosting específico, política de retención, umbrales de capacidad y solución push dependen de pruebas y decisiones comerciales.
