# Autorización, roles y visibilidad de datos

**Estado:** política general propuesta. El corte local de cotización implementa verificación Supabase Auth, membresía habilitada por comercio/sucursal y RLS con rol limitado según [ADR-0007](../decisions/0007-local-backend.md); los demás permisos siguen pendientes.

## Aplicación local de cotizaciones

El bearer se verifica mediante `/auth/v1/user` con clave publicable; un subject válido no concede acceso por sí mismo. `delivery_api` no es propietario, superusuario ni BYPASSRLS y no usa service role. Cada transacción Prisma establece `app.subject_id` con el subject ya verificado mediante `set_config(..., true)`, sin compartir contexto entre solicitudes. La credencial de ese rol es exclusivamente del servidor; no se entrega a usuarios. RLS no sustituye la autenticación de la API.

Merchant y Branch deben estar habilitados. Membership habilitada concede únicamente cotizar/leer en su Branch y Merchant, con FK compuesta. Se reconsulta al guardar/leer; revocación afecta nuevas operaciones aunque el JWT siga vigente. No hay permisos globales implícitos ni autorización por metadata. Las quotes solo permiten SELECT/INSERT al runtime; su snapshot no se actualiza. Una lectura ajena es indistinguible de una inexistente (404).

La conexión administrativa local solo se usa en migración/seed/pruebas de rechazo y nunca se inyecta al contenedor API. No se conceden permisos al rol runtime sobre `auth`, `storage` o `realtime`, ni se expone `app` por PostgREST. La gestión completa de sesiones revocadas, auditoría, MFA y retención sigue pendiente para operación real.

## Aplicación local de Delivery

POST y GET reutilizan la identidad verificada y la membresía vigente por Branch/Merchant. Una quote puede haber sido cotizada por otro miembro autorizado de la misma sucursal; no concede acceso a otra sucursal ni tenant. La clave de idempotencia pertenece al actor y scope: otro actor no obtiene un replay ajeno por conocerla. Revocación impide también los reintentos previamente exitosos.

`Delivery` tiene RLS SELECT por Branch visible e INSERT por subject propio, quote visible/vigente y snapshot coincidente. Sin permisos UPDATE/DELETE ni acceso desde PostgREST; un trigger privado INVOKER conserva inmutabilidad. FKs compuestas y unicidad de quote refuerzan las reglas fuera del repositorio. No se conceden permisos sobre pagos/asignaciones y no existe un campo cliente que autorice despacho.

### Contexto mínimo del portal (issue #9)

El historial `GET /v1/deliveries?branchId=...` exige la misma membresía vigente
por sucursal en cada página. RLS protege Branch y Delivery incluso sin filtros
de aplicación. Un cursor solo delimita orden y está ligado a la sucursal; no
acredita identidad ni autorización. Visibilidad y página se leen con el mismo
snapshot SQL. Sucursal no visible produce 404 indistinguible de inexistente;
una sucursal visible sin entregas devuelve una página vacía. Se proyecta solo
el DTO Delivery existente. No hay acceso administrativo ni service role.

`GET /v1/me` proyecta exclusivamente el UUID autenticado y las parejas
Merchant/Branch visibles mediante la política `branch_member` existente. No lee
perfiles Auth ni retorna directamente filas Membership, cuya política propia no
filtra el estado de Branch/Merchant. `GET /v1/merchants/{merchantId}/branches`
aplica esa misma visibilidad, además del filtro del identificador solicitado.
Conocer un merchantId no concede acceso; cero sucursales visibles produce 404
uniforme. Un sujeto sin membresías conserva acceso a `/me` con lista vacía.
No se derivan permisos de metadata ni se amplía acceso a sucursales hermanas.
DTOs y semántica de errores: [contrato propietario](api-contracts.md).

## Actores y scopes
- `customer`: acceso a sus propios pedidos/enlaces de seguimiento válidos.
- `merchant_owner`: configuración del Merchant y sucursales autorizadas.
- `merchant_staff`: operaciones limitadas a Branch habilitada.
- `courier`: gestionar disponibilidad y assignments propios, sin visibilidad de flotas ajenas.
- `fleet_manager`: ver equipo y entregas bajo membresía vigente y relación contractual.
- `dispatcher`: soporte/operación de zona o tenant explícitamente asignado.
- `support_agent`: acceso mínimo, propósito justificado y auditoría, sin permiso irrestricto por defecto.
- `platform_admin`: acciones privilegiadas excepcionales con MFA, trazabilidad y separación de funciones.

## Matriz de acceso mínima orientativa
| Acción | Cliente | Staff comercio | Courier | Fleet manager | Dispatcher |
| --- | --- | --- | --- | --- | --- |
| Crear entrega | Propia si flujo disponible | De su Branch | No | Según contrato | Operación autorizada |
| Leer entrega | Propia / token de seguimiento | De su Branch | Asignada | De su Fleet | De su área |
| Ofertar/aceptar Assignment | No | No | Solo oferta dirigida y elegible | Según rol, no suplantar courier | Asignación manual trazable |
| GPS preciso en ruta | Solo su entrega durante ventana | Según necesidad operativa | Propio | Solo trabajos supervisados | Según área de trabajo |
| Exportar evidencia | Restringido | Según contrato | Propia cuando proceda | Restringido | Justificado y auditado |
| Editar tarifas | No | No | No | No | Solo rol especializado |

## Política técnica
- Supabase Auth puede autenticar, pero un JWT válido **no acredita** acceso a cada merchant/branch/delivery.
- Permisos se verifican por API antes de leer/escribir, y políticas de Realtime/Storage deben ser equivalentes.
- Membresías con vigencia/estado; revocación corta canales y bloquea acciones nuevas. Tokens de canal deben expirar y resuscribirse; no depender únicamente del alta inicial.
- El cliente nunca envía `merchantId` como prueba de pertenencia; el backend deriva/verifica el contexto.
- Protección contra BOLA y permisos sobre campos: minimizar datos y prevenir escrituras masivas fuera del DTO.
- Enlaces de seguimiento de destinatario: tokens aleatorios cortos de vida/alcance limitados, hash en servidor, revocables y no equivalentes a acceso a la cuenta completa. Política exacta pendiente.
- `platform_admin` no equivale a soporte irrestricto; acceso especial requiere razón y audit log.
- PII, teléfonos, direcciones y ubicación no se publican como eventos indiscriminados.

## Escenarios de autorización adversaria
A de Merchant X cambia branchId por una de Y; courier A acepta offer de B; cliente pide mapa de otro; exmiembro conserva socket; operario intenta exportar ubicaciones fuera de turno; webhook falso. Todos deben ser negados o tratados sin divulgar información.
