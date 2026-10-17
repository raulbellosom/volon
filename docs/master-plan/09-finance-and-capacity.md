# 09 — Economía de unidad, presupuesto y dimensionamiento

**Estado:** modelo para preparar; **no tenemos cifras reales, comisiones, servidor dimensionado ni proveedor de pago elegido**. Para M0 se eligió **cobro exclusivo de logística al comercio por servicio vía PSP**, sin recaudar valor de mercancías ni abrir wallet. Ver [modelo M0](../product/pilot-operating-model.md); revisar legalidad, costes de cobro, fiscalidad y margen antes de operar.

## Modelo económico por transacción
Separar valores de flujo y contabilidad:
- Valor de mercancía/transacción comercial `GMV` (no es automáticamente ingreso de la plataforma).
- Ingreso bruto de Volón: comisión comercial efectivamente devengada, cargo de logística que le corresponda, suscripción, servicio técnico u otros rubros contractuales.
- Cobros fiscales, impuestos trasladados/retenciones y fondos de terceros se contabilizan de acuerdo con el rol legal. No contabilizarlos como margen operativo por conveniencia.
- Costos variables: pago courier (según relación legal), procesamiento PSP, mapas, notificaciones facturables, almacenamiento/procesamiento por transacción, soporte e incidencias, promociones absorbidas, seguros/coberturas aplicables y fraudes/refunds.
- Contribución parcial por entrega = ingreso propio atribuible - costos variables atribuibles (después de tratar impuestos según contabilidad correcta). No representa utilidad neta.
- Costos fijos: desarrollo, nómina, servidores base, monitoreo, contabilidad, legal, atención, captación, seguros y administración.

## Familias de modelos comerciales a evaluar
| Modalidad | Quién solicita | Posibles ingresos | Complejidad |
| --- | --- | --- | --- |
| Solo transporte de venta externa | Comercio | cargo por entrega, fee por contrato | split del pago de productos quizá fuera de sistema |
| Marketplace | Cliente/comercio | comisión de producto + delivery fee | checkout, PSP, devoluciones, impuestos, soporte |
| Software y flota propia | Comercio / fleet | suscripción/licencia/cargo por uso | derechos de datos, facturación, permisos |
| Flota tercera | Operador asociado | fee de intermediación/servicio | payout, acuerdos laborales, reconciliación |

**No lanzar una modalidad sin contrato y flujo de dinero claros**.

## Parámetros del modelo editable futuro
- Pedidos por negocio/día, distancia real/ETA, precio por zona y franja, tasa de aceptación, porcentaje entregas completadas/canceladas, tiempo trabajo courier, tarifa cobrada, subsidio, comisión PSP, impuestos y reembolsos.
- Frecuencia GPS y espectadores concurrentes por reparto (impactan red/broadcast).
- Volumen de mensajes push/web/correo, geocoding, storage/fotos, logs/backup, soporte por transacción.
- Adquisición/retención, descuentos, recurrencia, estacionalidad y costo de atención.

## Escenarios obligatorios
1. Volumen bajo (pocos negocios/entregas) con costos fijos altos por orden.
2. Escenario base según entrevistas/operaciones.
3. Pico de comida/lluvia y escasez courier.
4. Alta cancelación/reembolso/fraude.
5. Cobertura extendida con baja densidad y alta distancia.
6. Degradación PSP, mapas o Realtime que obliga soporte/manualidad.
7. Campaña de adquisición que aumenta pedidos no rentables.

Calcular margen por zona, distancia y modalidad **con datos y sensibilidad**, no un único promedio engañoso.

## Infraestructura y costo total
- Supabase self-hosted: CPU/RAM/disco, Postgres/PostGIS, Realtime, Auth, Storage, TLS, tráfico de red, actualizaciones, backups fuera de host y recuperación.
- API/worker: compute, Redis, cola persistente, logs/tracing, monitorización, staging y seguridad.
- Android/iOS: compilación, distribución, mantenimiento de releases, pruebas de hardware real.
- SaaS terceros: mapas/rutas/geocoding, correo/OTP, PSP, Push si aplica, analítica, licencias.
- Operación humana: soporte, despacho, revisión de comercios y couriers, cobranza y atención de incidencias.

## Fórmula de dimensionamiento (sin prometer capacidad)
`samplesPerSecond ≈ onlineCouriers × effectiveSamplesPerCourierPerSecond`;
`outboundRealtimePerSecond ≈ publishedLocations × authorizedViewersPerLocation`.
Desacoplar ingesta de frecuencia de publicación y muestreo persistente. Simular carga local con clientes sintéticos; medir latencia p50/p95/p99, CPU/RAM, backlog outbox, conexiones, saturación PostGIS y tasa de GPS stale.

## Presupuesto de aprobación
- Definir inversión máxima de Fase 0/P1, de MVP técnico y piloto comercial.
- Definir reservas para legal, soporte, fallos, dispositivos de prueba, certificados/tiendas y ajustes de infraestructura.
- Costear alternativa de VPS único con riesgo de SPOF frente a separación de DB/servicios y backups externos.
- Indicar costes unitarios mensuales, variables y umbral de break-even, incluidas obligaciones locales.
- Aprobación presupuestaria explícita antes de contratar servicios o promocionar tarifas.

## Gates financieros
Ninguna tarifa definitiva antes de `STR-007`, `ARC-008`, `LEG-002`. No pagos split ni wallet por inferencia. Antes del piloto, reconciliación de cada transacción, payouts y tratamiento de devoluciones deben tener dueño, test y reporte.
