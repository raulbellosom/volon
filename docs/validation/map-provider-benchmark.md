# Protocolo reproducible de evaluación de mapas (#12)

Estado: herramientas offline autorizadas; ninguna selección ni integración al
cotizador. RF-005/006, RNF-009/010, UC-03, DEC-07/09. Contrato interno del harness,
sin endpoints o estados nuevos de Delivery. Proveedores y términos: [evaluación](address-provider-evaluation.md).

## Contrato de evaluación

Operaciones: geocode/query, autocomplete/query y route/origin/destination/mode
(driving o motorcycle). Puntos finitos en rangos geográficos. Cada adaptador
normaliza candidatos con coordenada opcional y granularidad address/street/area/
unknown; la ausencia de punto en sugerencias no se rellena llamando geocoding.
La selección/detalle posterior es una operación facturable aparte. Resultado de
ruta: metros y segundos del modelo vial, nunca ETA prometida o verificación.
Número exterior se compara en memoria contra el referente revisado y solo se
exporta coincidencia booleana. requiredGranularity (address/street/area) y
houseNumber son restricciones opcionales del reference; una coordenada cercana
no acredita por sí sola número exterior o dirección completa. Sugerencias sin
coordenada no se puntúan como errores de precisión ni se inventan sus puntos.
Mapbox/motorcycle devuelve unsupported sin hacer HTTP; jamás traducir moto a auto.

Se distinguen errores auth/quota/timeout/network/invalid_response/unavailable,
vacío y capacidad no soportada. Timeout acotado, sin retry por defecto; retry
opcional máximo uno para red/cuota/5xx, con Retry-After acotado y sin reintentar
credenciales o respuesta inválida. Contar cada intento como potencialmente
facturable, incluso si falla. Prohibido imprimir URLs, claves o cuerpos de error.

Métricas: intentos HTTP, latencia p50/p95, éxitos técnicos, vacíos, ambiguos,
errores por clase, distancias/tiempos viales y distancia al referente público.
Acierto top-1 y presencia top-k se puntúan únicamente con tolerancia revisada;
centro de POI no prueba acceso. Un vacío esperado se contrasta por separado;
una dirección artificialmente inexistente no prueba que un proveedor deba conocerla.
Disponibilidad es éxito técnico en esta muestra, no SLA ni precisión de direcciones.

## Separación de ejecuciones

Offline es el modo por defecto: transporte artificial inyectado, no acceso a red
ni lectura de secretos. CI ejecuta fixtures de éxito, ambiguos/vacíos y errores.
Resultados etiquetados simulation, realQueries=0 y latencias simuladas; nunca
presentarlos como ranking de calidad o latencia comercial.

El modo real requiere argumento explícito, entorno fuera de CI, autorización
administrativa y revisión de licencia/métricas, clave del servidor y un manifiesto
de casos revisado cuyo SHA-256 coincida con la aprobación. Sin flags implícitos
por presencia de credenciales. Dataset de POIs es referencia pública inicial,
NO manifiesto aprobado de accesos. Sin registro automático de respuestas ni
coordenadas derivadas. Logs/reportes excluyen direcciones, claves e IDs externos.
No instalar SDK, cargar tiles ni geocodificar en la API existente.

## Dataset y criterio de decisión

Dataset versionado: [public-reference-cases.json](../../scripts/maps/public-reference-cases.json).
Tres POIs, once consultas propuestas y cuatro recorridos dirigidos pendientes de
revisión de acceso. Aeropuerto: P625 Wikidata CC0 contrastado con coordenadas DMS
del operador GAP; muelle: P625 Wikidata CC0 con revisión fija; museo naval: dirección
y geo JSON-LD del catálogo SIC. Datos consultados el 18-10-2026. Son referentes
documentales, no puntos confirmados en terreno; tolerancias null deliberadamente.
El número exterior 4 proviene del SIC; Km 7.5 del operador aeroportuario. No se
inventan números para el muelle. La colonia/calle por sí sola no debe puntuarse
como dirección exacta. Mapbox Geocoding v6 no soporta búsqueda de POIs por nombre:
comparar esas propuestas por capacidad y usar direcciones para su benchmark.

Referencias públicas con fuente/revisión/fecha/licencia, sin domicilios privados.
Variantes de nombre, dirección completa cuando exista fuente, calle/colonia,
número exterior, prefijos, acentos, ambigüedad y consulta artificial inexistente.
No inventar números o coordenadas. Registrar explícitamente los componentes
ausentes y casos aún no puntuables. Recorridos entre accesos revisados en ambos
sentidos; no conectar centroides de aeropuerto o extremos de muelle como accesos
para motocicleta. POIs céntricos no representan toda la ciudad ni periferias.

Antes del ensayo real, operación debe revisar fuentes, puntos de acceso,
tolerancias y expectativas por caso. Antes de elegir: aprobar umbrales de acierto,
ambigüedad, acceso vial legal, p95/errores, costo por sesión y licencia de snapshot
compartido. Sin esos criterios y evidencia real no hay ganador. Decisión humana
registrada en DEC-07; cobertura/tarifa siguen DEC-09/04. Privacidad requiere
[ADR propuesta](../decisions/0011-location-privacy-lifecycle.md) antes de PII.

## Ejecución y revisión

```sh
pnpm maps:evaluate --offline
node --experimental-strip-types --test scripts/maps/tests/*.test.ts
```

El primer comando emite JSON con tres reportes de 9 casos artificiales y dos
escenarios de costo. Sin argumentos también es offline. No lee .env.local.
Las latencias offline usan reloj artificial de 1 ms, no miden la red o el host.
Fixtures en `fixtures.ts` fueron escritos a mano; no son respuestas grabadas.
CI ejecuta tests y comando offline con transporte inyectado sin llamadas externas.

Para una evaluación real **posterior, manual y autorizada**, preparar fuera de Git
un manifiesto de JSON UTF-8 en `.local/maps/` con esta forma (los datos aquí son
artificiales para ilustrar estructura, no aprobación de un dataset real):

```json
{
  "approvalReference": "approval-ticket-id",
  "publicNonResidential": true,
  "accessPointsReviewed": true,
  "cases": [{
    "id": "reviewed-case-id",
    "sources": ["https://example.invalid/public-reference"],
    "operation": { "kind": "geocode", "query": "POI SINTETICO" },
    "reference": { "point": { "lat": 0, "lng": 0 }, "toleranceMeters": 10 }
  }]
}
```

Para route: operation incluye kind, origin/destination lat/lng y mode; para
autocomplete: kind/query. Un negativo confirmado admite expectEmpty true sin
reference. Tolerancia numérica documentada por operación, nunca convertir un
null del dataset inicial en un radio inventado. Validación técnica acota radios
a 1–1000 m; ese límite no aprueba ninguno como correcto. Un manifiesto firmado
por hash expresa revisión humana, no verifica automáticamente acceso o legalidad.

Configuración server-only obligatoria:

- `MAP_EVAL_REAL=enabled`, `MAP_EVAL_ADMIN_APPROVED=yes`, `MAP_EVAL_LICENSE_APPROVED=yes`.
- `MAP_EVAL_PROVIDER=geoapify|google|mapbox` (un proveedor por ejecución).
- `MAP_EVAL_<PROVIDER>_KEY`: clave del proveedor seleccionado, jamás VITE_*.
- `MAP_EVAL_DATASET_SHA256`: hash SHA-256 exacto de los bytes del manifiesto aprobado.
- `MAP_EVAL_MAX_REQUESTS`: presupuesto explícito de intentos HTTP (1–1000).

Solo entonces: `pnpm maps:evaluate --real --manifest .local/maps/reviewed.json`.
No ejecutar aquí. CI/GITHUB_ACTIONS presentes bloquean incluso si valen "false".
Espera de 1 segundo entre casos, timeout de 3 segundos, cero retries reales,
hosts fijos HTTPS, redirects bloqueados, límite de cuerpo de 1 MiB. No recibe
URLs libres. El transporte admite un retry opcional en pruebas; errores lógicos
Google en HTTP 200 no generan retry automático. No hay SDK, tiles, reverse o
Place Details ejecutables en el harness: se modelan sus costos por separado.

La salida real contiene IDs de caso, métricas normalizadas y hash del manifiesto,
sin coordenadas, nombres, direcciones, IDs externos, claves ni payloads originales.
Los metros/segundos/errores de distancia también pueden ser contenido derivado:
su revisión de licencia abarca esos agregados. No redirigir salida a repositorio
ni compartirla sin revisar permisos y retención. Los adaptadores reales están
implementados según documentación, **no probados contra proveedores** en este corte.

## Modelo de costo por sesión

`cost.ts` define supuestos explícitos y fuentes/fecha, sin dinero ni tarifa del
producto. Modelo de sensibilidad del primer tramo pagado, sin cuotas gratuitas,
descuentos, impuestos, FX o SLA implícitos. Referencias actualizadas:
[Google precios](https://developers.google.com/maps/billing-and-pricing/pricing),
[Mapbox precios](https://www.mapbox.com/pricing),
[créditos Geoapify](https://www.geoapify.com/pricing-details/) y
[API10](https://www.geoapify.com/pricing/).

Escenario single: 6 búsquedas autocomplete, 1 geocode final, 1 reverse,
1 detalle Google, 1 ruta, 1 mapa; 50 tiles donde se cobran por tile. Requote:
12 autocomplete, 2 geocode, 2 reverse, 2 detalles, 3 rutas y 2 mapas/100 tiles.
Son supuestos de planificación, no consumos medidos. Google autocomplete sin
sessionToken usa precio por solicitud; detalle Essentials se presupuesta aparte.
La futura UI debe medir pulsaciones/debounce, búsquedas fallidas y abandonos.

| Escenario | Google moto | Geoapify API10 | Mapbox |
| --- | --- | --- | --- |
| single | USD 0.05398 por entrega | 21.5 créditos; USD 59/3000 entregas = 0.01967 asignados | Moto no soportada. Solo auto hipotético: USD 0.0215 |
| requote | USD 0.12296 por entrega | 44 créditos; mismo prorrateo si 3000 entregas/mes | Moto no soportada. Auto hipotético: USD 0.045 |

Geoapify: suscripción no es tarifa marginal por crédito. Capacidad API10 10000
créditos/día, escenario pico de 100 entregas/día = 2150/4400 créditos; verificar
picos reales, mezcla de APIs y req/s antes de elegir plan. El prorrateo no promete
que se puedan procesar volúmenes ilimitados por USD 59. Google y Mapbox GL JS
cuentan tiles dentro del map load para esta configuración: no cobrarlos dos veces.
No confundir Google Map Tiles API independiente con Dynamic Maps. Mapbox modela
sugerencias Temporary y geocode/reverse final Permanent; contrato pendiente.

## Handoff a Claude después de selección

Proveedor, producto/SDK, contrato de persistencia y atribución, presupuesto y
cuotas deben aprobarse primero. Backend deberá crear contrato de selección
servidor con referencia opaca y sobre sensible aprobado; el navegador no podrá
enviar verification=verified ni reutilizar respuestas arbitrarias del geocoder.
Claude integrará búsqueda con debounce/cancelación, resultados ambiguos/vacíos,
pin accesible y ajuste manual identificado como tal, confirmación explícita,
recotización si cambia destino y detalle de snapshot conservado. Usará solo token
público restringido para mapa, nunca credencial de backend. Si Google moto se
elige, mostrar advertencia beta requerida por
[Google Routes](https://developers.google.com/maps/documentation/routes/route_two_wheel).
La retención debe producir un estado de ubicación no disponible, sin inventarla.
