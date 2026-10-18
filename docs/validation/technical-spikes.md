# Pruebas técnicas previas al MVP (spikes)

**Estado:** PLAN; ninguna prueba ha sido ejecutada aún. Un spike consiste en una pequeña implementación temporal para responder una duda de arquitectura, NO en construir toda la plataforma.

## Spike A — GPS real en Android e iOS (prioridad máxima)
**Montaje futuro:** mini-app courier-mobile con React Native/Expo Development Build; API temporal autenticada, almacenamiento temporal y mapa web para observar un teléfono moviéndose.

**Casos:** primer plano; pantalla bloqueada; Maps/Waze sobre la app; background prolongado; pausa voluntaria; cierre de app y cierre forzado; ahorro de batería; permisos reducidos/revocados; red intermitente, Wi-Fi/datos; reinicio de teléfono; GPS impreciso; viajes de prueba con ambos sistemas operativos.

**Medir:** edad de la última coordenada, tasa de puntos válidos, intervalos efectivos, recuperación, consumo de batería, cierres de app y degradación por fabricante/versión. Registrar límites inevitables (p. ej., forced stop) sin falsear continuidad.

**Resultado:** evidencias de video/log con datos anonimizados, lista de dispositivos/OS, tasas observadas y decisión React Native/Expo vs módulo nativo vs alternativa.

## Spike B — Realtime / permisos
**Montaje:** dos clientes con roles distintos, canal privado, publicación controlada por servidor.
**Casos:** 10/100/500 conexiones sintéticas según presupuesto; duplicación, retraso, reconexión, expiración de credencial, suscripción no autorizada y canal revocado.
**Métricas:** latencia p50/p95, tasa de reconexión, error, CPU/RAM y throughput. Elegir umbrales con expectativas del piloto antes de medir.

## Spike C — Atomicidad del despacho
Dos repartidores aceptan simultáneamente una oferta; solo una asignación debe ser válida. Desconexión y reintento con misma clave idempotente no generan doble asignación. Documentar resolución manual.

## Spike D — Mobile UX y gestos
Bottom sheets, mapa, aceptar/rechazar, listas, gestos con lector de pantalla, Touch target, reduce motion, teclado, fuentes grandes, Android gama baja y iPhone.

## Spike E — Supabase Self-Hosted
Auth/RLS, Broadcast, PostGIS, Storage, operaciones de respaldo/restauración, uso de memoria en VPS de prueba, dependencias/licencias.

## Spike F — Push
Android, iOS, navegador soportado; app cerrada/background; autorización; tokens caducados; deduplicación; aceptación explícita independiente del push.

## Spike G — Rutas, costos y pagos
Comparar mapas y precios con muestras de trayectos locales; validar PSP para México, pagos, reembolsos, comisiones, tiempos de liquidación y conciliación.

**Avance aislado de contrato (18-10-2026; sin conexión al servicio):** `osrm-road.adapter.ts` es un candidato de prueba desacoplado del cotizador. Convierte la respuesta `route/v1/driving` de OSRM en distancia vial (metros) y duración estimada (segundos), registra procedencia y falla de forma segura ante ausencia de ruta, timeout, HTTP o payload inválido. Las pruebas usan `fetch` simulado y **no validan rutas de Puerto Vallarta, tráfico, motocicletas, costos, precisión de ETA ni disponibilidad de un proveedor**. No existe activación automática por variables de entorno: `main.ts` continúa con el adaptador sintético de PostGIS.

**Evaluación aún pendiente (DEC-07):** comparar OSRM autohospedado, Mapbox Directions y Google Routes con trayectos representativos de Puerto Vallarta; medir precisión de calles y sentidos viales, restricciones para motos, cobertura, cuota/infraestructura, latencia, términos de uso, costos y comportamiento ante fallos. No trasladar el tiempo estimado del motor a una promesa de entrega ni sustituir datos de rutas por distancia en línea recta. Elegir proveedor y política de activación solo con evidencia y revisión de costos.

Referencias técnicas: [OSRM](https://project-osrm.org/docs/v26.5.0/http), [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/), [Google Routes](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes).

## Formato de reporte de prueba
Fecha, versión, hardware/OS, hipótesis, entorno, pasos reproducibles, datos usados, resultados medidos, evidencia (sin secretos), fallas, impacto, recomendación, responsable y ADR afectado.

## Criterio de avance
No aprobar componentes por apariencia ni proveedores por documentación únicamente. Registrar pruebas antes de comenzar el MVP remunerado.

**Prueba diagnóstica independiente en GitHub:** `scripts/spikes/pv-route-benchmark.mjs` realiza solo dos consultas al demo OSRM, espaciadas más de un segundo, con puntos sintéticos cercanos a Puerto Vallarta (no domicilios ni rutas de personas). Reporta metros viales, metros en línea recta, duración del modelo automovilístico y distancia de ajuste a la calle. El workflow `road-routing-spike.yml` se ejecuta al introducir o modificar ese script, no en cada push ordinario. Es **no comercial** y puede fallar por disponibilidad del demo; su resultado no debe tomarse como SLA ni validar rutas para motocicletas. La API `main.ts` sigue sin conectar a ningún motor vial.
