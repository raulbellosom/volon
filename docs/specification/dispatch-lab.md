# Núcleo interno de asignación — laboratorio #18

Estado: contrato local/sintético, RF-009/010, DEL-005, ARC-006, ENG-006.
No es API pública ni autorización comercial. [ADR-0014](../decisions/0014-dispatch-lab.md).

## Frontera y contrato v1

Delivery permanece requested/version 1 e inmutable. DispatchLabScenario identifica
una unidad logística artificial mediante UUID en un espacio independiente, sin FK
a Delivery, comercio o ubicación. Solo fixtures administrativos de integración
pueden crear escenarios; el runtime no puede crearlos ni leer su catálogo.
No hay comandos HTTP ni composición en main/app ni integración con móvil.

El módulo interno recibe actor obtenido de Supabase Auth verificada; nunca deriva
permisos de metadata. `execute(actor, command, idempotencyKey)` valida objetos
exactos. UUID canónico; expectedVersion entero positivo; clave 1–128 caracteres
alfanuméricos, guion o guion bajo. Comandos:

| operation | Campos adicionales exactos | Resultado |
| --- | --- | --- |
| offer | syntheticDeliveryRef, ttlSeconds (1–300) | offer offered/version 1 |
| accept | id (offer), expectedVersion | assignment active/version 1 |
| decline | id (offer), expectedVersion | offer declined |
| withdraw | id (offer), expectedVersion | offer withdrawn |
| expire | id (offer), expectedVersion | offer expired, solo si reloj DB ≥ expiresAt |
| revoke | id (assignment), expectedVersion | assignment revoked |

Son acciones de un harness interno sobre recursos propios del actor, **no nuevos
permisos operativos** de courier o dispatcher. No hay revocación de custodia real.
Los recibos exactos son `{kind, id, syntheticDeliveryRef, courierId, status,
version, changedAt}` y, solo para kind offer, `expiresAt`. Fechas UTC ISO de
PostgreSQL; kind offer admite offered/accepted/declined/withdrawn/expired y kind
assignment active/revoked. No subject, hashes, claves, JSON privado ni PII.

Errores internos estables: INVALID_COMMAND, NOT_FOUND (incluye perfil revocado,
oferta ajena o inexistente), FINANCIAL_INELIGIBLE, COURIER_UNAVAILABLE,
VERSION_CONFLICT, STATE_CONFLICT, OFFER_EXPIRED, NOT_EXPIRED,
IDEMPOTENCY_CONFLICT, INFRASTRUCTURE_UNAVAILABLE. Ningún detalle SQL se publica.
Una expiración rechazada no muta estado; expire es un comando explícito, no cron.

## Finanzas y aislamiento

FinancialEligibilityPort evalúa una condición de escenario de forma síncrona,
sin red bajo locks. La implementación por defecto deniega. La única respuesta
positiva se llama synthetic-fixture y solo la produce un adaptador en integration.
Se evalúa al ofrecer y aceptar; missing/pending/failed/revoked deniegan. Ningún
flag, env, JWT o header lo selecciona. Una condición sintética **no es Payment**.
El puerto real necesitará evidencia PSP autoritativa, revocación y consistencia
transaccional propias; no basta reemplazar una función por un booleano.

FORCE RLS en todas las tablas. El contexto transaccional de laboratorio y Courier
propio habilitado son necesarios para ofertas, assignments, recibos y outbox.
Escenarios no tienen grants runtime. Sin nuevos grants sobre datos comerciales.
El GUC es defensa del backend confiable, no credencial frente a robo del rol DB.
Sin service-role ni funciones SECURITY DEFINER. Conexión administrativa rechazada.

## Exclusión, reloj y auditoría

Orden de locks: subject Courier canónico (mismo que disponibilidad/revocación),
después syntheticDeliveryRef, después filas. Un comando toca una sola unidad.
RLS/perfil/turno se reconsultan después de esperar. Índices únicos parciales
imponen una assignment active por referencia y otra por courier, incluso si RLS
oculta al ganador ajeno. El conflicto de índice revierte toda la transacción.
Versión CAS, FK compuesta assignment→offer y triggers impiden saltos, mutación
de identidad, borrado o aceptación expirada. Se usa clock_timestamp después de
locks y nuevamente al aceptar en DB; nunca now() al inicio de la transacción.

Solo offered transita una vez a un terminal; active solo a revoked. No reactivar.
Ofertas competidoras no se retiran automáticamente: continúan sin poder ganar
mientras haya assignment activa; expire/withdraw propios conservan su historia.
No se implementan política secuencial, ranking ni reasignación operativa.
El turno sigue offline/available; ninguna aceptación declara busy ni impide el
offline de la API actual. La exclusión de assignment es independiente del turno.
Deshabilitar Courier bloquea comandos nuevos/replays; no borra asignación activa:
la reserva permanece hasta resolución futura controlada, sin reasignar a ciegas.

Recibos por courier/clave hasheada, hash canónico de todo el comando. Replay
autorizado retorna resultado original sin nueva transición/evento; otra carga
con la misma clave falla. Reautorizar precede al replay; una indisponibilidad
posterior no reescribe el hecho histórico. Claves fallidas no quedan consumidas.

Outbox inmutable: id UUID, courierId, syntheticDeliveryRef, aggregateKind,
aggregateId, aggregateVersion, eventType v1 y occurredAt. Unicidad por agregado
y versión. Cada transición y su recibo/evento usan la misma transacción; aceptar
produce offer.accepted.v1 y assignment.active.v1. Es también historia mínima,
sin payload libre ni publicador/consumidor. Un fallo diferido revierte todo.
No se promete entrega de mensajes ni retención productiva; no borrar al iniciar.

## Validación y continuidad

Pruebas reales de locks, 20+ aceptaciones, doble exclusión, expiración en espera,
revocación, replay, RLS, fallo DB/outbox y rollback diferido. No acreditan ACC-004,
005, 013, 020 o 022 completos del producto, PSP ni restauración física.
Desactivar el módulo conserva registros; no hay down migration destructiva.
Próximo corte: contrato financiero PSP, transición Delivery separada de snapshot,
política de datos temporales del courier y autorización de ofertas antes de HTTP.
