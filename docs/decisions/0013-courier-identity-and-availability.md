# ADR-0013 — Identidad y disponibilidad Courier en laboratorio

- Fecha: 2026-10-19. Aceptada solo para desarrollo local/sintético por solicitud
  explícita del usuario en #16; RF-004, UC-02, DEL-002, RNF-001/009, DEC-11/16.
- Contexto: CourierGateway en Expo sigue siendo demo. Sus displayName, vehículo,
  ofertas y busy no son evidencia de identidad/eligibilidad ni asignación real.

## Decisión

Courier tiene subject Auth único, ID opaco y habilitación por aprovisionamiento
controlado. No contiene nombre, teléfono, domicilio, placas ni merchantId. No hay
registro/contratación ni roles en user_metadata. Futuros FleetMembership pueden
vincular flotas y Courier sin convertir un comercio en propietario permanente.

CourierShift es una proyección actual offline/available con versión positiva;
no acredita jornada laboral ni almacena historia de turnos. Perfil sin proyección
no es operable. Deshabilitar invalida lecturas/replay y fuerza offline con nueva
versión; reactivar no restaura disponibilidad anterior. Busy queda rechazado.
TTL/heartbeat y elegibilidad real son decisiones posteriores, no defaults ocultos.

CourierAvailabilityCommand conserva hashes y recibo mínimo inmutable. Idempotencia
por Courier/clave; comparación de payload incluye expectedVersion. Un replay
antiguo devuelve el recibo original y nunca reescribe la proyección actual.
No se borra ledger al arrancar ni se inventa un TTL; retención productiva pendiente.

Se reutilizan Auth remota, app.subject_id transaccional y rol delivery_api. FORCE
RLS y grants limitados en tablas nuevas, sin nuevos permisos sobre tablas existentes.
Runtime no inserta perfiles/turnos ni edita identidad/habilitación/reloj. La API
no recibe identificadores de actor en el comando. Repositorio verifica rol seguro
también si se construye fuera del composition root, incluyendo session_user para
rechazar un login administrativo que use SET ROLE. No usa service-role.

Advisory lock por subject UUID canónico serializa comandos; trigger invoker de
Courier usa el mismo lock al modificar/revocar. RLS se relee después de esperar.
CAS por versión, clock_timestamp de PostgreSQL, actualización y recibo en una
transacción corta, sin llamadas Auth/red dentro del lock. La revocación que ya
obtuvo el lock impide nuevos comandos; una operación anterior puede confirmar
antes de que se complete la revocación. Hash collision solo añade serialización,
nunca concede autorización. GET hace un JOIN único para una vista coherente.

## Alternativas y límites

No reutilizar Membership comercial como identidad Courier ni conceder lectura
global de Delivery. No convertir disponible en asignado. No añadir ofertas,
PaymentVerified, transiciones ni acceso a ubicaciones. Las tablas se agregan sin
modificar registros/snapshots existentes; para retirar el módulo desactivar su
composición conservando datos, sin rollback destructivo.

El siguiente corte debe definir elegibilidad financiera autoritativa y verificable
por PSP (o un laboratorio aislado aprobado), exclusión de Assignment por Delivery
y Courier, expiraciones, outbox y reautorización. Requested no autoriza despacho.
Debe acordar qué datos aproximados se ven antes de aceptar y qué acceso temporal
al destino se concede después, con ADR-0011/KMS/retención reales; hoy ninguno.

## Verificación

Pruebas unitarias/contratos y PostgreSQL + Supabase Auth reales: aislamiento,
denegaciones, revocación concurrente, replay, CAS, rollback y rol administrativo.
Runbook y comandos en [laboratorio local](../operations/local-backend.md).
No certifica elegibilidad laboral, funcionamiento móvil ni operación productiva.
