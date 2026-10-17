# 05 — Work Breakdown Structure (WBS): programa completo

**Estado:** backlog **planificado, no ejecutado**. IDs estables para futuros GitHub Issues/Projects. Prioridades y fases se refieren a [P0–P7](04-phases-and-gates.md). Los dueños son roles sugeridos; **no implican personas contratadas**.

## Cómo convertir esto en trabajo real
Cada fila se convertirá en Issue **solo cuando entre en la fase aprobada**, con criterios de aceptación, evidencias, propietario, dependencias y tamaño estimado tras investigación. Las filas pueden dividirse: ningún Issue debe abarcar «construir todo el marketplace». Los IDs persisten al dividir tareas.

### A. Descubrimiento, estrategia y negocio (P0)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| STR-001 | Entrevistas documentadas y anonimizadas con comercios candidatos | Ninguna |
| STR-002 | Entrevistas y condiciones operativas de repartidores/fleets | STR-001 |
| STR-003 | Mapa de zonas, distancias, volumen y franjas del piloto | STR-001/002 |
| STR-004 | Análisis de competidores, tarifas y valor diferencial fechado | STR-001 |
| STR-005 | Selección y aprobación del primer servicio comercial | STR-001/004 |
| STR-006 | Modelo de ingresos, promociones, comisiones y subsidios explícitos | STR-005 |
| STR-007 | Modelo de costos variables y flujo de fondos por operación | STR-006 |
| STR-008 | Roles y responsabilidades operativas y de soporte | STR-002/005 |
| STR-009 | Presupuesto de piloto, riesgos y criterios de rentabilidad | STR-007 |
| STR-010 | Brand research, disponibilidad jurídica de nombre y dominios | Ninguna |

### B. Legal, fiscal y privacidad (P0–P4)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| LEG-001 | Dictamen de modalidad laboral/plataforma y responsabilidades por actor | STR-005 |
| LEG-002 | Flujos de CFDI/IVA/ISR/retenciones según modalidad real | STR-006/LEG-001 |
| LEG-003 | Evaluación de tratamiento de GPS y datos personales, aviso de privacidad | STR-005 |
| LEG-004 | Términos/contratos de comercio, repartidor, flota y comprador | LEG-001/002/003 |
| LEG-005 | Política de cancelación, disputas, seguros y custodia de objetos | STR-008/LEG-001 |
| LEG-006 | Revisión legal de proveedores, software, marca y derechos de terceros | STR-010/tech decision |
| LEG-007 | Protocolo de derechos de titulares, retención y eliminación/auditoría | LEG-003 |
| LEG-008 | Checklist legal go/no-go aprobado antes de operación remunerada | LEG-001..007 |

### C. Decisiones de arquitectura / pruebas de tecnología (P0–P1)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| ARC-001 | ADR ratificado de apps/web/mobile y monorepo | STR-005 |
| ARC-002 | Spike Expo GPS background en dispositivos Android/iOS | LEG-003 |
| ARC-003 | Spike gestos, accesibilidad y estilo React Native | ARC-002 |
| ARC-004 | Spike Supabase Auth/RLS/Realtime privado/self-hosted | LEG-003 |
| ARC-005 | Spike PostGIS, consulta de cobertura y concurrencia en DB | ARC-004 |
| ARC-006 | Spike aceptación simultánea e idempotencia de entrega | ARC-005 |
| ARC-007 | Evaluación mapas/geocoding/routing con rutas y precios locales | STR-003 |
| ARC-008 | Evaluación PSP para México, split/reembolsos/webhooks/payouts | LEG-002 |
| ARC-009 | Spike push móvil/web, expiración y reconexión | ARC-004 |
| ARC-010 | Benchmarks y decisiones de tamaño/costo, restore de Supabase | ARC-004 |
| ARC-011 | Definir contratos v1, errores, versionado y eventos con revisión cruzada | ARC-005/006 |
| ARC-012 | Threat model/privacidad multi-tenant y aprobación de controles | LEG-003/ARC-011 |

### D. Gobernanza, calidad e infraestructura (P2)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| ENG-001 | Monorepo operativo, lockfile y dependencias fijadas | ARC-001 |
| ENG-002 | CI: lint, strict TS, line limits, unit, contrato y builds por app | ENG-001 |
| ENG-003 | Dependencias, licencias, SBOM/escaneo secretos y revisión de vulnerabilidades | ENG-001 |
| ENG-004 | Ambientes local, staging y producción separados con secrets seguros | ARC-004/ENG-001 |
| ENG-005 | PostgreSQL/PostGIS + migraciones versionadas, seed sintético | ENG-004 |
| ENG-006 | Redis/colas, outbox, retries, DLQ y monitoreo de lag | ENG-005 |
| ENG-007 | Registro correlacionado, métricas, tracing, alertas y dashboards | ENG-004 |
| ENG-008 | Backups cifrados fuera de host + restore drill con RPO/RTO | ENG-005 |
| ENG-009 | Auth y permisos por recurso/sucursal/flota + tests adversarios | ARC-012/ENG-005 |
| ENG-010 | Protección API: esquema, rate limit, idempotency, cursor, problem+json | ARC-011/ENG-009 |
| ENG-011 | Runbooks de despliegue, incidente, rollback y recuperación | ENG-007/008 |
| ENG-012 | Compatibilidad de versiones móviles y estrategia de release | ARC-001/ENG-010 |

### E. Diseño y experiencia de usuario (P2, luego continuo)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| UX-001 | Identidad provisional basada en tokens neutrales y sistema de temas | STR-010 |
| UX-002 | Mapa de flujos, wireframes y prototipos por rol | STR-005 |
| UX-003 | Biblioteca `ui-web` de primitivas accesibles, shadcn selectivo | UX-001/ENG-001 |
| UX-004 | Biblioteca `ui-native` propia, gestos probados y safe areas | UX-001/ARC-003 |
| UX-005 | Patrones comunes de negocio/logística y contratos de componentes | UX-003/004 |
| UX-006 | Auditoría UX es-MX, errores, estados vacíos, offline, tamaños y accesibilidad | UX-002/005 |
| UX-007 | Estrategia de cambio de marca y validación de deep links/SEO/assets | UX-001/ENG-012 |
| UX-008 | Documentación de componentes, ejemplos y pruebas visuales | UX-003/004 |

### F. Comercio, repartidores, despacho y entregas (P3)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| DEL-001 | Alta Merchant/Branch, roles, horarios y zonas permitidas | ENG-009 |
| DEL-002 | Registro/revisión Courier, Vehicle, Shift y disponibilidad | ENG-009/LEG-001 |
| DEL-003 | PricingQuote, cobertura y desglose de precio servidor | DEL-001/ARC-007 |
| DEL-004 | Delivery/Stop con transiciones, versiones y cancelaciones | DEL-003/ARC-011 |
| DEL-005 | AssignmentOffer, expiración y asignación atómica | DEL-002/004/ARC-006 |
| DEL-006 | Despacho manual y semiautomático, intervención/razones | DEL-005 |
| DEL-007 | Portal comercio: crear entrega, consultar lista/estado | UX-003/DEL-004 |
| DEL-008 | App courier: ofertas, aceptación, estados y navegación externa | UX-004/DEL-005 |
| DEL-009 | Evidencia protegida de pickup/entrega y custodia | DEL-004/LEG-003 |
| DEL-010 | Soporte/incidencias, cancelación, reatribución y reporte | DEL-004/006 |
| DEL-011 | Tracking API + validación/batch GPS + TTL + PostGIS selectivo | ARC-002/DEL-008 |
| DEL-012 | Broadcast privado, snapshot/reconexión y mapa vivo autorizado | ARC-004/DEL-011 |
| DEL-013 | Web/mobile push, recuperación y registro de envío | ARC-009/ENG-006 |
| DEL-014 | Panel operativo despacho/mapa, aging de ubicación y colas | DEL-006/012 |
| DEL-015 | Registros de dinero, conciliación y cobros piloto habilitados | ARC-008/LEG-002 |
| DEL-016 | E2E real device/staging y escenarios ACC críticos | DEL-001..015 |

### G. Piloto, operación y validación del negocio (P4)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| PIL-001 | Contratos/términos/seguros y autorización de operación piloto | LEG-008 |
| PIL-002 | Plan de reclutamiento y capacitación de comercios/couriers | STR-003/PIL-001 |
| PIL-003 | Soporte humano, escalamiento, protocolos de incidentes/seguridad | DEL-010/ENG-011 |
| PIL-004 | Dashboard KPI de operaciones, retención, ingresos y costos unitarios | DEL-014/015 |
| PIL-005 | Ensayo de incidentes, restore, RLS y seguridad antes del servicio real | DEL-016/ENG-008 |
| PIL-006 | Lanzamiento acotado con controles/guardias humanas y criterios de pausa | PIL-001..005 |
| PIL-007 | Evaluación de satisfacción, tasas de entrega y caja | PIL-006 |
| PIL-008 | Decisión go/pivot/pause y backlog de cambios priorizados | PIL-007 |

### H. Marketplace de clientes (P5)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| MKT-001 | Modelo Catalog/Product/Modifier/Availability por sucursal | PIL-008 |
| MKT-002 | CRUD seguro de catálogo/precios/fotos/horarios de negocio | MKT-001/UX-003 |
| MKT-003 | Customer-web: comercios, búsqueda y fichas de productos | MKT-001/UX-003 |
| MKT-004 | Direcciones y preferencias válidas con minimización de PII | MKT-003/LEG-003 |
| MKT-005 | Cart/Checkout con cotización atómica, taxes/fees desglosados | MKT-002/003/ARC-008 |
| MKT-006 | Order y preparación de restaurante, cambios de inventario | MKT-005/DEL-004 |
| MKT-007 | Payment/Refund/Settlement/ledger y PSP webhooks validados | MKT-005/LEG-002 |
| MKT-008 | Order→Delivery, estimaciones, tracking y soporte cliente | MKT-006/DEL-012 |
| MKT-009 | Promociones con reglas, límites y coste auditable | MKT-007 |
| MKT-010 | SEO/local listings/medición de adquisición y conversión | MKT-003 |
| MKT-011 | Pruebas E2E checkout, duplicados, fraudes, devoluciones | MKT-005..010 |
| MKT-012 | Rollout marketplace por segmentos y evaluación económica | MKT-011 |

### I. Flotas, integraciones, crecimiento y expansión (P6–P7)
| ID | Entregable verificable | Dependencia |
| --- | --- | --- |
| FLT-001 | Memberships/supervisores/flota/vehículos y autorización cross-tenant | PIL-008 |
| FLT-002 | UI de flotas: turnos, operaciones y estadísticas autorizadas | FLT-001 |
| FLT-003 | Reglas de cobertura/elegibilidad/capacidad multiperfil | FLT-001/DEL-005 |
| FLT-004 | Reportes/liquidaciones de flota y conciliación contractual | FLT-001/MKT-007 |
| FLT-005 | Integraciones webhooks/API terceros con versionado y anti-replay | ARC-011 |
| FLT-006 | Optimización de ruta y multi-parada **solo si vale económicamente** | ARC-007/PIL-007 |
| FLT-007 | Cost/reliability benchmarks y extracción modular si procede | PIL-007/ENG-007 |
| EXP-001 | Playbook de lanzamiento y legal por nueva zona/ciudad | PIL-008 |
| EXP-002 | Configuración multi-ciudad, tarificación, cobertura, horarios, roles | EXP-001/FLT-003 |
| EXP-003 | Alta disponibilidad, disaster recovery, capacity y soporte ampliado | FLT-007 |
| EXP-004 | Customer mobile Android/iOS según retención/feature justification | MKT-012/ARC-003 |
| EXP-005 | Seguridad/privacidad, operación y márgenes revalidados por expansión | EXP-002/003 |

## Reglas de trazabilidad
- Cada Issue mantiene un ID WBS, una fase, estado, dueño real cuando se asigne, criterios, pruebas y dependencias.
- Ninguna tarea marcada `done` solo por describirse aquí.
- Bloqueadores LEG/ARC no se resuelven con un workaround técnico sin decisión.
- `DEL-015`, `MKT-007` y `FLT-004` dependen especialmente del modelo de custodia de fondos aprobado.
- Trabajo UX/infra puede realizarse en paralelo a descubrir mercado **solo** si es reversible y no compromete costos.

## Contrato de «done»
Un entregable existe, es revisable y puede demostrarse mediante pruebas, documentación y owner; una simulación no equivale a operar. [Calidad](07-quality-and-safety.md) y [aceptación](../specification/acceptance-matrix.md).
