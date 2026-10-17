# Autorización, roles y visibilidad de datos

**Estado:** política propuesta de RBAC + comprobación de atributos/relaciones; no es una matriz implementada.

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
