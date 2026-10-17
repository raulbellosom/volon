# GPS y eventos en tiempo real

**Estado:** requisito funcional con diseño propuesto; validar sobre teléfonos reales.

## Flujo de tracking
1. courier-mobile solicita permisos explícitos y recoge GPS cuando corresponda.
2. App envía ubicaciones autenticadas a un endpoint del backend mediante HTTPS; admite lotes limitados y reintentos.
3. API comprueba identidad, servicio activo, precisión, orden temporal, velocidad anómala y pertenencia.
4. Ubicación reciente se actualiza en Redis con TTL y marca de tiempo.
5. Eventos/hitos relevantes se guardan en PostgreSQL/PostGIS conforme a retención definida.
6. Servicio publica actualización reducida a canal de la entrega para participantes autorizados.
7. Cliente y comercio muestran mapa y antigüedad del dato. Reconexión consulta API para recuperar estado.

## Separación de tecnologías
- Realtime Broadcast: actualizaciones transitorias en interfaces conectadas.
- Realtime Presence: señales de sesión; NO equiparar presencia de socket con turno laboral.
- HTTP API: recepción GPS y cambios autoritativos de pedidos/entregas.
- Push: notificación de actividades importantes para apps en segundo plano o cerradas.
- Worker/Outbox: mensajes de negocio confiables y reintentos.
- Postgres Changes: reservar para casos precisos; no convertir cada modificación GPS en evento global.

## Canales conceptuales
    merchant:{merchantId}:orders
    delivery:{deliveryId}:tracking
    courier:{courierId}:assignments
    fleet:{fleetId}:operations
    dispatch:{zoneId}:overview

Requieren autenticación, reglas de acceso, revocación y expiración; el simple conocimiento del nombre de un canal NO concede acceso.

## Frecuencias candidatas (no garantías)
En ruta 5–15 s; cerca del destino 3–5 s; disponible sin entrega 30–60 s; fuera de turno detener tracking. Diseñar adaptación por movimiento, batería, privacidad, conectividad y políticas de cada sistema operativo. Medir capacidad; no guardar cada punto indiscriminadamente.

## Riesgos
- iOS/Android pueden pausar o limitar localización en background, especialmente tras cierre forzado.
- Ubicación simulada, pérdida de red, batería y GPS impreciso.
- Canales no garantizan entrega ni orden global de eventos.
- Privacidad: un cliente observa exclusivamente el reparto que le concierne durante una ventana justificada.
- Concurrencia: ofertas y asignaciones se resuelven en la base autoritativa.

## Pruebas
Seguir [spikes técnicos](../validation/technical-spikes.md); no afirmar funcionamiento real antes de ejecutar y registrar evidencias.
