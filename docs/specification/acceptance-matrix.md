# Matriz de aceptación y trazabilidad del MVP

**Estado:** casos de prueba esperados; no ejecutados. Todos son candidatos de criterios de aceptación al ratificar el MVP.

> Trazabilidad: [requerimientos RF/RNF](../product/requirements.md) → [casos UC](../product/use-cases.md) → [entregables WBS](../master-plan/05-work-breakdown.md) → **ACC** → pruebas ejecutables (futuras). Este archivo es el dueño de los criterios de prueba; los catálogos RF y UC solo los referencian.

| ID | Escenario | Resultado esperado | Tipo |
| --- | --- | --- | --- |
| ACC-001 | Staff de Branch A crea entrega con quote vigente | persiste exactamente una Delivery con desglose y scope correcto | Integración/E2E |
| ACC-002 | Reenvía POST tras timeout con misma Idempotency-Key | obtiene misma operación sin duplicar Delivery | Integración |
| ACC-003 | Reutiliza key con payload distinto | conflicto seguro, sin segunda operación | Integración |
| ACC-004 | Courier X y Y aceptan ofertas de misma entrega en paralelo | solo uno adquiere Assignment activa | Stress/concurrencia |
| ACC-005 | Se intenta aceptar offer expirada/revocada | rechazo, sin transición | Integración |
| ACC-006 | Reasignar antes de recoger | conserva historial; Assignment anterior termina | Integración |
| ACC-007 | Reasignar después de recoger | requiere protocolo de custodia e intervención | Integración/E2E |
| ACC-008 | Courier pierde señal GPS | UI muestra última ubicación y antigüedad, no coordenada ficticia | Mobile/E2E |
| ACC-009 | Courier envía GPS atrasado | no sobrescribe punto más nuevo | Integración |
| ACC-010 | Exmiembro de Merchant A intenta consultar Merchant B | 403/404 seguro; sin datos cruzados | Seguridad |
| ACC-011 | Usuario copia nombre del canal de otro reparto | no puede suscribirse ni ver GPS | Seguridad/Realtime |
| ACC-012 | Desconexión Realtime con eventos omitidos | al reconectar lee snapshot/version y se corrige | Integración/E2E |
| ACC-013 | Worker procesa evento dos veces | notificación/cargo/side effects idempotentes | Integración |
| ACC-014 | PSP envía webhook inválido/duplicado | se rechaza o deduplica sin movimiento duplicado | Seguridad/finanzas |
| ACC-015 | Precio cambia tras quote aceptada | no reescribe total pactado; ajuste separado | Dominio |
| ACC-016 | Cancelación en ruta | aplica política por etapa y registra causa/custodia | Dominio/E2E |
| ACC-017 | App móvil cerrada/background | documentar limitación real de GPS/push por Android/iOS | Dispositivo real |
| ACC-018 | Gesture swipe falla con lector de pantalla | existe acción alternativa accesible | Dispositivo real/A11y |
| ACC-019 | Se cambia nombre comercial | contratos y datos permanecen independientes de la marca | Configuración |
| ACC-020 | DB indisponible durante aceptación | no reportar éxito sin commit confirmado | Resiliencia |
| ACC-021 | Restore desde backup cifrado | se recupera y mide RPO/RTO real | Operaciones |
| ACC-022 | Evento outbox falla y se reintenta | sin pérdida del cambio confirmado y con dedupe | Integración |

## Evidencias necesarias
Para cada ACC: fixture sintético, versión de app/infra, comando/test asociado, fecha, resultado observado, logs anonimizados y vínculo al issue/PR. Automatizar unit/integración/E2E donde corresponda; pruebas de dispositivos físicos requieren reporte manual.

## Definition of Ready por vertical
- Criterios y reglas aprobadas, datos/permisos claros, errores y flujo de reversión, contratos acordados, pruebas identificadas y riesgo legal validado si aplica.

## Definition of Done por vertical
- Caso funcional implementado, autorizaciones e idempotencia, tests pertinentes verdes **ejecutados**, observabilidad, documentación/ADR ajustado, accesibilidad y resiliencia revisadas.
- Revisiones de seguridad y operación según criticidad.
- Cumplimiento y cifras de SLO solo cuando haya pruebas verificadas; no estimaciones vendidas como garantías.

## Regla de priorización
Bloquean piloto: inconsistencias de dinero, dos repartidores, fuga de GPS/PII, pérdida de cambios confirmados, falta de recuperación, no poder gestionar incidentes. Mejoras cosméticas y automatización sofisticada no deben desplazar estos controles.
