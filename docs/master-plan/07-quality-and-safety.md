# 07 — Calidad, seguridad, privacidad y confiabilidad

**Estado:** política objetivo; tests, CI, SLO, infraestructura y controles aún no desplegados.

## Principio
La calidad de entrega no es únicamente «funciona en mi equipo». Debe mantenerse correcto bajo errores de red, múltiples usuarios, pagos duplicados, operadores concurrentes, versiones viejas de apps, accesos indebidos y fallas de servicios.

## Gating automatizado al iniciar Fase 1
- Lint y formato; TypeScript estricto; control de dependencias cíclicas y límites entre paquetes.
- Límites: componente visual hasta **250 líneas**, hook/controller/use case **200**, servicio/adaptador **300**, ningún fuente manual de producción **>400** salvo excepción humana documentada.
- Pruebas unitarias, de componente, contrato HTTP/eventos, integración DB, E2E de flujo y escaneo de secretos/dependencias.
- CI por paths/apps afectadas, cache de build verificable, lockfile fijado, migraciones testeadas, no force pushes/rewrite.
- Revisión de licencias de bibliotecas/imagenes y SBoM cuando corresponda.
- Versionado de contratos y compatibilidad con apps móviles publicadas.

## Matriz de pruebas prioritaria
| Riesgo | Prueba que debe ejecutarse |
| --- | --- |
| Doble courier | two concurrent accepts, una Assignment activa |
| Cargo duplicado | idempotencia y webhook PSP repetido/fuera de orden |
| Cross tenant | usuario Merchant A no lee ni modifica B |
| GPS expuesto | token de tracking/canal caducado o de otra entrega denegado |
| GPS stale | UI presenta hora última coordenada y nunca ETA ficticio |
| Fallo Realtime | reconciliación mediante API; polling acotado |
| Fallo worker | outbox persistente, reintentos y DLQ monitorizada |
| Fallo DB | no confirmar comando sin transacción |
| Fallo dispositivo | background, battery saver, reconexión y push bajo límites SO |
| Pago incierto | estado `unknown/pending` hasta conciliación |
| Cancelación tardía | compensación financiera/custodia y evento auditado |
| Accesibilidad | teclado, lector de pantalla y acción alternativa a swipe |
| Marca | cambiar texto/asset/dominio sin cambiar contratos o tablas |

La fuente detallada es la [matriz ACC](../specification/acceptance-matrix.md).

## Niveles de prueba
- Unitarias por regla; integración para autorización, pagos y estados; E2E para journeys reales.
- Contract-first: OpenAPI/JSON Schema y compatibilidad de eventos v1, snapshots al reconnect.
- Pruebas de carga sintética en API, Realtime, GPS y queries PostGIS con p50/p95/p99.
- Pruebas en dispositivos Android/iPhone reales, de gama baja y sistemas actualizados.
- Restore completo cifrado fuera del VPS, RPO/RTO **medidos**.
- Pentest/revisión externa proporcional antes de expansión o integración financiera significativa.

## Seguridad y privacidad por diseño
RBAC + atributos sobre Merchant, Branch, Fleet, Courier, Delivery, Support. Autorización en API, RLS donde aplique y políticas Realtime/Storage independientes. Tokens de acceso breves/revocables, scopes específicos, MFA para privilegiados, logs auditables y sin coordenadas/tarjetas/PII en logs generales.

Consentimiento, aviso, finalidad, límites de GPS, minimización y retención con asesoría mexicana; un cliente sólo ve ubicación autorizada durante su reparto, nunca localización global ni fuera de turno.

## Controles operativos
TLS, secretos fuera de repo, entornos separados, rotación segura, backups externos, runbook de incidentes, rollback de release, feature flags reversibles, alertas sobre outbox lag, fail rate y GPS stale. Procesos para derechos de titulares, pérdida de dispositivo y brechas.

## Indicadores y SLO
SLI candidatos: tasa de comandos confirmados, entrega no duplicada, latencia p95 por operación, GPS freshness, error/retry, pago pendiente/conciliado, disponibilidad de soporte, outbox lag. **No asignar porcentajes arbitrarios**: definir SLO y error budgets con responsables durante P0–P2.

## Seguridad del uso de IA
Codex/Claude deben leer [AGENTS](../../AGENTS.md)/[CLAUDE](../../CLAUDE.md), reglas de [ingeniería](../conventions/engineering-standards.md) y [tests](../conventions/testing-and-quality.md). No se permiten features sin test ni excepciones de seguridad ocultas; autorizar explícitamente cambios destructivos/financieros/infra.

## Definition of Done
Comportamiento y errores aceptados, pruebas **ejecutadas y evidenciadas**, cambios versionados, sin vulnerabilidades críticas conocidas sin gestión, permisos y privacidad revisados, release reversible, owner de operación y ADR actualizado. Si falta evidencia, queda `blocked` o `needs-validation`, no `done`.
