# Protocolo reproducible de evaluación de mapas (#12/#13)

Estado: herramientas offline autorizadas; ninguna selección ni integración al
cotizador. RF-005/006, RNF-009/010, UC-03, DEC-07/09. Contrato interno del harness,
sin endpoints o estados nuevos de Delivery. Proveedores y términos: [evaluación](address-provider-evaluation.md).

## Contrato de evaluación

### Preflight #13 (contrato previo a implementación)

`pnpm maps:evaluate --preflight` lee exclusivamente el manifiesto público
versionado; no recibe URLs, no lee variables de credenciales, no construye
adaptadores ni autoriza ejecución. Emite texto legible con SHA-256 de los bytes,
POIs/fuentes/limitaciones, todas las consultas propuestas, rutas pendientes,
capacidad por proveedor, límite de intentos y créditos/costo estimado. El
manifiesto sigue siendo una propuesta, incompatible deliberadamente con el
manifiesto aprobado de `--real`. No genera flags, aprobaciones ni un archivo real.
El dataset público fija LF en `.gitattributes` para reproducir el hash entre
sistemas. El manifiesto real privado se aprueba por sus bytes exactos: cualquier
cambio, incluso espacios o fin de línea, invalida la aprobación anterior.

Un reference admite `toleranceMeters: null`: se puede medir distancia documental
sin publicar top-1/top-k ni declarar precisión de acceso. Una tolerancia numérica
sigue requiriendo revisión humana; precisión decimal de la fuente no equivale
a exactitud medida. Porcentaje de ambigüedad = búsquedas con >1 candidato / búsquedas
técnicamente válidas (incluidos vacíos); no indica ambigüedad semántica probada.
p50/p95 de todas las operaciones soportadas incluyen errores y timeout.

El primer lote propuesto es solo geocode/autocomplete Geoapify, una llamada por
consulta, cero retries, cero detalles/reversa/tiles/rutas. El preflight calcula
un techo del lote, no un permiso ni garantía de facturación. Exige revisión de
cuota diaria disponible y consumo ajeno: Geoapify publica cuotas blandas.
Rutas no revisadas permanecen fuera del lote; ida/vuelta, sentidos únicos,
restricciones y ausencia de ruta se revisarán con accesos confirmados antes de
autorizar pruebas. Los casos negativos artificiales no afirman inexistencia.

Manifiesto real v2 separado: `schemaVersion: 2`, `publicNonResidential: true`,
`searchReferencesReviewed: true`, `approvalReference` humano y `cases` con fuentes.
Cada búsqueda sin tolerancia aprobada requiere `observationalOnly: true` (puede
omitir reference o declarar toleranceMeters null); no declara aciertos. Una ruta
sigue exigiendo `accessPointsReviewed: true`. Los manifiestos previos mantienen
su validación estricta de accesos y tolerancias numéricas. Las banderas son
afirmaciones humanas revisables, jamás generadas por preflight. Todos los gates
de entorno/hash/presupuesto/licencia/CI siguen siendo obligatorios para v2.

`monthly-cost.ts` extiende el modelo de sensibilidad existente con franquicias
por SKU, tramos y planes diarios para 100/500/1000/3000/10000 entregas mensuales.
Declara supuestos de repeticiones/recotizaciones y pico diario. No mezcla costos
de moto con auto ni promete que una franquicia compartida esté disponible.

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
Seis referencias públicas (cinco instalaciones y un área), 22 consultas propuestas
(17 geocode, 5 autocomplete) y ocho recorridos dirigidos pendientes de revisión
de acceso. Aeropuerto: P625 Wikidata CC0 contrastado con coordenadas DMS
del operador GAP; muelle: P625 Wikidata CC0 con revisión fija; museo naval: dirección
y geo JSON-LD del catálogo SIC. Datos consultados el 18-10-2026. Son referentes
documentales, no puntos confirmados en terreno; tolerancias null deliberadamente.
El número exterior 4 proviene del SIC; Km 7.5 del operador aeroportuario. No se
inventan números para el muelle. La colonia/calle por sí sola no debe puntuarse
como dirección exacta. Mapbox Geocoding v6 no soporta búsqueda de POIs por nombre:
comparar esas propuestas por capacidad y usar direcciones para su benchmark.
Los Mangos agrega dirección/geo del SIC (ficha rnbp 80734); campus CUC agrega P625
Wikidata con dirección UdeG; Marina Vallarta agrega P625 de área, nunca un faro,
entrada o POI específico. Sus revisiones y fuentes están en cada registro del
dataset. Precisión declarada en grados de Wikidata no se convierte a exactitud
en metros. SIC no publica una exactitud levantada; no se le asigna una.

Cobertura nueva: Los Mangos e Ixtapa fuera del Centro; aún muestra pequeña de
conveniencia. Abreviaciones y homónimos sin ciudad son variantes explícitas, no
evidencia de dos calles locales identificadas. El negativo artificial conserva
expectativa null; falsos positivos requieren revisión humana. Las ocho rutas
están excluidas: falta verificar acceso de moto, legalidad, sentidos únicos y
giros; no se ha medido ninguna red vial. Marina requiere primero un acceso público
concreto; el muelle no es un destino vehicular y el aeropuerto requiere terminal.

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
pnpm maps:evaluate --preflight
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

El ejemplo anterior es legacy: exige accesos revisados y tolerancia numérica.
Para route: operation incluye kind, origin/destination lat/lng y mode; para
autocomplete: kind/query. Un negativo confirmado admite expectEmpty true sin
reference. Tolerancia numérica documentada por operación, nunca convertir un
null del dataset inicial en un radio inventado. V2 permite búsquedas explícitamente
observacionales según el contrato de preflight; no elimina aprobación humana.
Validación técnica acota radios
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

### Modelo mensual #13

`monthly-cost.ts` calcula sobre los mismos escenarios, con franquicias mensuales
por SKU y descuentos marginales por tramo, no por tarifa retroactiva. Supuesto de
pico: `2 * ceil(entregas / 30)`; 30 días y factor 2 son sensibilidad propuesta,
no demanda medida. Si cambia la distribución diaria, recalcular plan Geoapify.

| Entregas/mes | Geoapify single / requote (USD) | Google moto single / requote (USD) | Mapbox **auto hipotético** single / requote (USD) |
| ---: | --- | ---: | ---: |
| 100 | Free 0 / Free 0 | 0 / 0 | 1 / 2 |
| 500 | Free 0 / Free 0 | 0 / 7.50 | 5 / 10 |
| 1000 | Free 0 / Free 0 | 0 / 35.66 | 10 / 20 |
| 3000 | API10 59 / API10 59 | 52.64 / 203.58 | 30 / 60 |
| 10000 | API25 109 / API50 179 | 326.50 / 1005.10 | 100 / 215 |

Fuentes oficiales: [Geoapify planes](https://www.geoapify.com/pricing/),
[créditos](https://www.geoapify.com/pricing-details/),
[Google por SKU](https://developers.google.com/maps/billing-and-pricing/pricing),
[Mapbox precios](https://www.mapbox.com/pricing). Consultadas 18-10-2026.
Google: se presupuestan solicitudes autocomplete sin sesión, geocode/reverse en
un mismo SKU, detalles Essentials, Dynamic Maps y rutas Enterprise para moto.
Mapbox: Temporary para sugerencias, Permanent final/reverse desde primer uso,
Directions auto y GL JS. Permanent requiere habilitación y no permite redistribuir.
Moto Mapbox permanece sin costo total comparable (`monthlyUsd: null`).
Geoapify: 21.5/44 créditos por sesión; pago fijo mensual del plan con cupo diario,
no precio por crédito ni presupuesto ilimitado. Free requiere atribución y cuota
disponible. No se suman tiles a map loads Google/Mapbox; Geoapify sí por tiles.

No se presume otro uso en la cuenta, suscripciones contratadas, rebajas negociadas,
impuestos, FX, soporte especial o consumo fuera de estos escenarios. Las
franquicias pueden estar agotadas por otras apps. Google/Mapbox usan pay-as-you-go
de los SKU indicados, no se presume un mínimo contratado; la cuenta puede tener
condiciones distintas. Geoapify aplica suscripción completa si se elige plan pago.
La función rechaza extrapolar fuera de tramos modelados. Revisar límites por
segundo y diario en la cuenta: presupuestos/alertas no equivalen a corte de gasto.

### Primer lote y configuración local Geoapify (sin ejecutarlo)

Propuesta: 22 intentos/22 créditos, solo búsquedas; cero retries/rutas/detalles/
tiles. Costo incremental propuesto USD 0 dentro de Free, sujeto a cuota diaria
disponible; no autoriza suscripción ni cobro. No se reserva crédito en la cuenta
mediante este preflight. Las cuotas de Geoapify son blandas; no prometer un límite
de factura controlado por el proveedor. Falta aprobación de cupo/costo/licencia.

1. Crear una cuenta de desarrollo en [MyProjects](https://myprojects.geoapify.com/)
   y un proyecto separado para evaluación pública. Revisar Free sin upgrade.
2. En API Keys, crear/seleccionar clave exclusiva de servidor; restringir IP de
   salida cuando sea viable. CORS/origin no sustituye control de acceso backend.
   No pulsar Try ni probar consultas todavía.
3. Revisar cuota restante/consumo diario, alertas disponibles y atribución.
   No asumir que alertas o cuotas blandas bloquean gasto. Si no puede mantenerse
   el presupuesto aprobado, no ejecutar. [Ayuda de claves](https://myprojects.geoapify.com/help/api-keys/).
4. Guardar únicamente en un archivo local ignorado, por ejemplo
   `.local/maps/evaluation.env`, `MAP_EVAL_GEOAPIFY_KEY=<clave-local>`; no VITE,
   chat, issue, captura, consola ni Git. El CLI no carga ese archivo solo.
5. Tras aprobación humana separada, preparar manifiesto v2 revisado en `.local/maps/`,
   registrar su propio hash (distinto al de la propuesta si cambia estructura),
   referencia de aprobación, flags y `MAP_EVAL_MAX_REQUESTS=22`. Cargar entorno
   solo en ese proceso local de Node (`--env-file`); jamás en CI. No hay un
   manifiesto real aprobado en este incremento ni se ejecutó `--real`.

### Auditoría de adaptadores #13

Revisión documental y fixtures artificiales, no validación contra servicio vivo.

| Proveedor | Contrato revisado | Correcciones y límites |
| --- | --- | --- |
| Geoapify | Search/autocomplete GET, `format=json`, filtro México, español y 5 resultados; routing waypoints lat,lng, motorcycle separado de drive, metros/segundos | `units=metric` explícito; rechazo de `distance_units` incompatible. Sin coordenada válida se rechaza. No inventar clasificaciones de error 200 no documentadas: invalid_response. |
| Google | Geocoding JSON/status y street_number; Places Autocomplete New POST sin coordenada; Routes v2 POST con field mask y TWO_WHEELER/DRIVE | UNKNOWN_ERROR/UNAVAILABLE → unavailable, OVER_DAILY_LIMIT → quota (causa concreta requiere revisión de cuenta); duration exige cadena protobuf en segundos. Sin llamadas de detalle implícitas. |
| Mapbox | Geocoding v6 forward temporal, lng/lat, autocomplete por solicitud; Directions driving lng,lat y metros/segundos | No POIs v6 ni perfil moto. NoRoute separado de JSON inválido; coordenadas ausentes rechazadas. Permanent no se activa en el adaptador de evaluación. |

Fuentes: [Geoapify geocoding](https://apidocs.geoapify.com/docs/geocoding/),
[autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/),
[routing](https://apidocs.geoapify.com/docs/routing/),
[Google geocoding](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding),
[autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete),
[moto](https://developers.google.com/maps/documentation/routes/route_two_wheel),
[Mapbox v6](https://docs.mapbox.com/api/search/geocoding/) y
[Directions](https://docs.mapbox.com/api/navigation/directions/).
HTTP 401/403, 429, 5xx, límites de cuerpo, cancelación/deadline, retries acotados
y redirects denegados continúan cubiertos por tests offline. Cuotas publicadas:
Geoapify Free 5 req/s, Google Compute Routes 3000/min, Mapbox geocoding 1000/min y
Directions 300/min; cuenta/producto pueden imponer otros límites.
Google Geocoding está orientado a direcciones: los nombres de POI son exploratorios,
no equivalen a Places Text Search (no implementado ni incluido implícitamente).
Top-k usa los candidatos devueltos y su cantidad registrada, máximo 20; Geoapify
y Mapbox solicitan cinco. No mezclar diferencias de capacidad con precisión.

### Evidencia local del corte #13 (18-10-2026)

- Evaluador: 24/24 pruebas offline, incluido preflight en CI con fetch bloqueado,
  gate v2, hash, entradas manipuladas, contratos y economía mensual.
- `pnpm maps:evaluate --offline`: 27 casos artificiales, 0 llamadas a proveedores.
- `pnpm check`: correcto; 123 pruebas Node + 98 UI + 72 merchant = 293, tipos,
  Prisma y límites de archivo correctos. No se modificaron componentes visuales.
- `pnpm test:integration`: 52/52 con Supabase/PostgreSQL local, sin regresiones
  en cotización, Delivery, snapshot, historial, RLS, privacidad o idempotencia.
- `pnpm gallery:build` y `pnpm merchant:build`: correctos; merchant conserva
  advertencia de chunks >500 kB. No agrega dependencia/SDK, migración o endpoint.
- Preflight: seis referencias, 22 consultas propuestas, ocho rutas excluidas;
  ninguna aprobación humana registrada y ninguna API de proveedor consumida.
  Se consultaron documentación y catálogos públicos para verificar fuentes.

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
