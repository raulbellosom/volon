# Requisitos no funcionales y ruta de escalamiento

**Estado:** criterios cualitativos obligatorios, valores SLO/SLI **por decidir con datos**. No anunciar capacidad garantizada sin pruebas.

## Atributos
| Atributo | Expectativa de arquitectura | Cómo se comprobará |
| --- | --- | --- |
| Correctitud | Nunca aceptar dos assignments activas ni doble cobro | tests de concurrencia, idempotencia y reconcilación |
| Seguridad | Aislamiento por merchant/fleet/delivery; MFA privilegiada | matriz cross-tenant + threat modeling + revisión API |
| Privacidad | GPS proporcional, minimización, expiración, borrado bajo política | revisión de datos, canales y retención |
| Resiliencia | HTTP y estado persisten sin socket/push | simulaciones de caída, offline y recuperación |
| Latencia | Operaciones y tracking perceptiblemente oportunos | medir p50/p95/p99, no usar valores arbitrarios de marketing |
| Disponibilidad | Operador sabe cuándo hay degradación y puede actuar | runbooks, alertas, ejercitar recuperación |
| Escalabilidad | API/workers escalables por réplica donde proceda; DB y Realtime medidos | cargas progresivas, bottleneck review |
| Mantenibilidad | dominios, ADR, límites de archivos, pruebas/CI | chequeos automatizados al implementar |
| Observabilidad | trazas, logs y métricas correlacionadas sin PII | dashboards y alertas verificadas |
| Accesibilidad | web navegable por teclado y móvil usable con lector y sin gestos exclusivos | test manual + automático aplicable |
| Costos | ingresos por entrega contrastados con costos reales de infraestructura/terceros | dashboard costo por entrega |

## Capacidad
Definir carga usando **repartidores online × frecuencia efectiva GPS × bytes** más conexiones viewers, actualizaciones de estado, consultas, colas y notificaciones. También prever picos de lluvia, almuerzo y cena. Dimensionar:
- conexiones Realtime concurrentes por rol y zona;
- tasa de puntos GPS recibidos y Broadcast enviados (no necesariamente 1:1);
- nuevas solicitudes y accept/decline por minuto;
- queries geoespaciales y saturación DB;
- tamaño y retención de Storage/telemetría;
- cola de outbox y tiempo máximo hasta publicación.

No establecer en documentación un «soporta 10,000 repartidores» sin medir. Configurar escenario base, 2×, 5× y degradación de un subsistema con datos del piloto.

## SLO, SLI y budgets
Antes de piloto remunerado registrar objetivos explícitos de: disponibilidad API, éxito de entrega de comandos, frescura de tracking, tiempo de confirmación de assignment, tiempo de reconciliación, pérdida de operaciones críticas (objetivo: cero pérdida aceptable de estado confirmado) y RPO/RTO aprobados. Asignar dueño, fórmula y fuente de datos a cada SLI.

## Arquitectura de crecimiento
1. **Piloto:** monolito modular, una DB, jobs separados, cache/Realtime, despliegues aislados por app.
2. **Crecimiento inicial:** réplicas stateless API, worker scaling, índices/PostGIS optimizados, límites de Broadcast, réplicas lectura si justificadas.
3. **Múltiples ciudades:** partición lógica por zona/ciudad, flags/configuración y análisis de residencia fiscal/operativa; ciudad no es necesariamente tenant.
4. **Alta escala:** particionado de tablas voluminosas por datos, servicios de tracking/dispatch separados si los SLIs justifican; contratos facilitan extracción.
5. **Alta disponibilidad:** topología redundante y procedimientos de failover probados antes de prometer SLA contractual.

## Protección de recursos
Rate limit por usuario/dispositivo/tenant, payload limitado, circuit breakers de terceros, retries acotados, cotas de consultas, caching con invalidación explícita y backpressure. El sistema debe rechazar cargas excesivas con códigos correctos en vez de degradar silenciosamente pagos o despacho.

## Deuda técnica gobernada
Decisiones reversibles, métricas por módulo, pruebas de regresión y cambios pequeños. Los benchmarks usan datos sintéticos; ningún test de carga publica PII ni entrega reales.
