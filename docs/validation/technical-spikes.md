# Pruebas técnicas previas al MVP (spikes)

**Estado:** PLAN con un diagnóstico vial de prueba ejecutado el 18-10-2026. Las pruebas de GPS móvil, pagos y operación comercial siguen pendientes. Un spike responde una duda técnica: NO equivale a construir toda la plataforma.

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

**Prueba diagnóstica independiente:** `scripts/spikes/pv-route-benchmark.mjs` consulta dos rutas sintéticas de Puerto Vallarta con al menos un segundo entre solicitudes al demo no comercial. El workflow `road-routing-spike.yml` corre solo si se modifica ese script. No es dependencia del backend, no utiliza datos personales y no debe habilitarse en producción.

### Evidencia real del diagnóstico de rutas — 18-10-2026

Ejecución: [GitHub Actions #39136492484](https://github.com/raulbellosom/volon/actions/runs/39136492484) — dos consultas HTTPS al **demo público** OSRM con perfil `driving`, en el runner GitHub con Node.js 22.23.3. Resultado: **2/2 exitosas**; no se usaron direcciones de personas ni tokens. Solo se observaron estas dos parejas sintéticas en la zona de Puerto Vallarta, sin revisión física de calles.

| Pareja sintética (lat,lng) | Distancia geodésica | Distancia del motor OSRM | Duración del modelo (auto) | Ajuste a la red vial |
| --- | ---: | ---: | ---: | --- |
| (20.642,-105.226) → (20.624,-105.230) | 2,044 m | 3,467 m | 266 s | 36 m / 23 m |
| (20.624,-105.230) → (20.609,-105.234) | 1,719 m | 2,878 m | 248 s | 23 m / 18 m |

**Interpretación:** los dos recorridos devuelven distancias viales mayores que la línea recta; la conexión pública al demo funcionó desde GitHub en la fecha indicada. **No** demuestra precisión para motos, maniobras, tráfico, horas punta, calidad comercial, disponibilidad sostenida, seguridad vial ni equivalencia a costo/tarifa. Los puntos no fueron aprobados como una microzona piloto ni se han validado direcciones de recogida. El servidor demo no es un proveedor de producción.

## Formato de reporte de prueba
Fecha, versión, hardware/OS, hipótesis, entorno, pasos reproducibles, datos usados, resultados medidos, evidencia (sin secretos), fallas, impacto, recomendación, responsable y ADR afectado.

## Criterio de avance
No aprobar componentes por apariencia ni proveedores por documentación únicamente. Registrar pruebas antes de comenzar el MVP remunerado.
