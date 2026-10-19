# Direcciones, mapas y rutas para Puerto Vallarta

Evaluación documental del 18-10-2026, issue #11. No se crearon cuentas, claves,
suscripciones ni consultas de domicilios. No hay benchmark de precisión local:
cobertura internacional no acredita encontrar un número exterior o acceso correcto.
DEC-04 (tarifas/cancelación), DEC-07 (mapas/rutas/ETA) y DEC-09 (zona/cobertura)
siguen pendientes para operación real; este documento no los aprueba.

## Comparación técnica

Preparación reproducible del issue #12: [protocolo, CLI y dataset público](map-provider-benchmark.md).
La elección permanece pendiente de evidencia real y autorización; no hay ganador.

| Criterio | Mapbox | Google Maps Platform | OSM mediante Geoapify administrado |
| --- | --- | --- | --- |
| Dirección mexicana | Geocoding v6, filtro de país y proximidad; evaluar número, colonia, CP y precisión del resultado. | Geocoding/Places, restricciones regionales y componentes; contrastar resultados parciales y nivel de precisión. | Datos OSM/OpenAddresses y otras fuentes; filtros por país/área, confianza por edificio/calle. La completitud depende de los datos locales. |
| Mapa y pin | Mapbox GL JS y marcador; un pin elegido no demuestra verificación. | Maps JavaScript y marcador; mismo límite de verificación. | MapLibre/Leaflet con tiles contratados Geoapify y marcador. No usar tiles comunitarios como infraestructura comercial implícita. |
| Moto | Directions documenta driving, driving-traffic, walking, cycling; no perfil moto dedicado. | Routes TWO_WHEELER incluye México; es beta y exige advertencia visible. | Routing documenta motorcycle y scooter por separado. |
| Persistencia | Temporary no permite guardar resultados; Permanent sí, con habilitación de cuenta/contrato y restricciones de redistribución. | Restricciones por producto y excepciones condicionadas; no asumir permiso de snapshot multiusuario indefinido. | Geocoding anuncia almacenamiento sin costo adicional; cumplir atribución/licencias de fuentes y contrato. |
| Desarrollo/comercial | Desarrollo con token y facturación controlados; producción requiere contrato que permita conservar el resultado. | Proyecto con billing y APIs acotadas; aclarar licencia de persistencia y uso compartido comercio/courier. | Servicio operable con contrato, créditos, soporte y SLA de pago; no depende del Nominatim público. |

Fuentes: [Mapbox Geocoding](https://docs.mapbox.com/api/search/geocoding/),
[Directions](https://docs.mapbox.com/api/navigation/directions/),
[Google Geocoding](https://developers.google.com/maps/documentation/geocoding/policies),
[motos y México](https://developers.google.com/maps/documentation/routes/coverage-two-wheeled),
[Geoapify geocoding](https://www.geoapify.com/geocoding-api/) y
[perfiles de ruta](https://apidocs.geoapify.com/docs/routing/).

## Costos de referencia y capacidad

USD, sin impuestos, primer tramo cobrado publicado; tarifas sujetas a cambios.
La búsqueda puede multiplicarse por cada pulsación; presupuestar sesiones,
consultas de detalle, reversa, recotizaciones y mapas por separado.

| Servicio | Búsqueda/autocomplete | Ruta de dos puntos | Capacidad y costo adicional |
| --- | --- | --- | --- |
| Mapbox | Temporary: 100 mil/mes incluidos; después USD 0.75/1000. Permanent: USD 5/1000 en primer tramo. Autocomplete v6 consume consultas, no una única búsqueda por dirección. | Directions: 100 mil/mes incluidos; después USD 2/1000. | Geocoding predeterminado 1000/min; Directions 300/min. Mapas/SDK se cobran aparte. Permanent requiere confirmar habilitación y términos con proveedor. |
| Google | Geocoding USD 5/1000 y Autocomplete Requests USD 2.83/1000 después de 10 mil/mes por SKU. Las sesiones tienen reglas de terminación y detalles aparte; no son ilimitadas por defecto. | Essentials USD 5/1000 tras 10 mil/mes; TWO_WHEELER activa Enterprise, USD 15/1000 tras 1000/mes. | Compute Routes 3000 consultas/min documentadas; cuota efectiva del proyecto puede variar. Mapas, detalles y otras capacidades tienen SKU propios. |
| Geoapify | Geocoding y autocomplete: 1 crédito por consulta. | 1 crédito para dos puntos y trayecto menor a 500 km. | Free 3000 créditos/día, 5 req/s. API 10: USD 59/mes, 10000 créditos/día, 12 req/s. Tiles también consumen créditos. SLA de pago publicado: 99.5% mensual; revisar contrato y remedios. |

Fuentes de precios: [Mapbox](https://www.mapbox.com/pricing),
[Google lista global](https://developers.google.com/maps/billing-and-pricing/pricing),
[SKU de moto y cuotas](https://developers.google.com/maps/documentation/routes/usage-and-billing),
[Geoapify planes](https://www.geoapify.com/pricing/) y
[consumo de créditos](https://www.geoapify.com/pricing-details/).
Estos valores son comparables por unidad, no una cotización de costo mensual total.

## Licencias, retención y disponibilidad

Mapbox exige distinguir Temporary/Permanent antes de persistir coordenadas o
texto derivado. Su documentación limita usar respuestas de geocodificación con
mapas Mapbox. Mantener atribución Mapbox y de sus fuentes; Permanent no equivale
a permiso de redistribuir una base de direcciones. No almacenar el resultado
temporal dentro del JSON inmutable actual.
[Política oficial](https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/).

Google permite guardar place IDs indefinidamente; las demás reglas dependen del
servicio. Los términos vigentes de Geocoding §6.3 contemplan caché de coordenadas
30 días y una excepción indefinida para función directa del usuario iniciador,
aislada lógicamente por usuario y sin reemplazar llamadas adicionales. El snapshot
compartido por varios miembros/couriers no debe asumir cumplir esa excepción.
Routes tiene su propia regla de caché; no extrapolarla de Geocoding. Los resultados
de Geocoding en mapa requieren Google Map y atribución. Revisión contractual
previa a copiar contenido licenciado a un snapshot de larga duración.
[Términos específicos actuales](https://cloud.google.com/maps-platform/terms/maps-service-terms).

Geoapify exige atribución OSM siempre y Geoapify en Free, además de fuentes según
API. OSM usa ODbL: evaluar obligaciones de bases derivadas/redistribución, no
confundir licencia de datos con licencia del SDK o suscripción al servicio.
Su permiso de almacenar resultados no elimina las obligaciones de privacidad.
[Términos](https://www.geoapify.com/terms-and-conditions/) y
[licencia OSM](https://www.openstreetmap.org/copyright).
El Nominatim público limita a 1 req/s y prohíbe autocomplete del cliente;
no es el backend propuesto para el producto.
[Política oficial](https://operations.osmfoundation.org/policies/nominatim/).

La disponibilidad comercial debe acordarse, no inferirse de la cuota gratuita.
Antes de activar: registrar SLA contractual, región, subprocessors, tratamiento de
consultas, soporte, incidentes y presupuesto. Aplicar deadlines, límites propios,
cancelación de consultas obsoletas, debounce y validación de respuestas.
429/cuota, credenciales inválidas, red/timeout, respuesta vacía, coordenada fuera
de zona y 5xx deben tener errores internos distintos y respuesta pública segura.
Sin resultado vial fiable se rechaza la cotización; nunca sustituir metros viales
con línea recta ni activar un demo público como fallback. Los mocks actuales
prueban ese fallo cerrado; no prueban disponibilidad real de ningún proveedor.

## Credenciales e integración posterior

Separar credencial de navegador para tiles/mapa (visible, restringida a orígenes,
APIs y presupuesto) de credencial backend para geocodificar/rutear (solo servidor,
restricción IP/API cuando aplique). Mapbox distingue scopes públicos/secretos;
no hace falta conceder scopes secretos para toda consulta. Nunca poner secretos
en variables VITE, logs, URL pública de aplicación ni repositorio. Claves locales
separadas de producción, rotación y límites propios; CORS solo no autentica.
Fuentes: [Mapbox tokens](https://docs.mapbox.com/accounts/guides/tokens/),
[Google seguridad](https://developers.google.com/maps/api-security-best-practices),
[Geoapify restricciones](https://myprojects.geoapify.com/help/api-keys/).

## Recomendación y evidencia pendiente

Mantener **Geoapify como candidato de evaluación**, por persistencia
documentada, perfiles moto y servicio administrado. No es una adopción ni una
afirmación de mejor precisión en Puerto Vallarta. Usar Google como comparación
de calidad local y moto, con revisión de costos Enterprise y licencia compartida;
Mapbox sigue siendo viable si Permanent y la ausencia de perfil moto se resuelven
para el caso de uso. La recomendación pondera almacenamiento, operación y moto,
no únicamente cuota gratuita.

Siguiente prueba, con autorización separada: muestra de POIs/direcciones públicas
no personales en zona centro, colonias periféricas, accesos y límites PV/Bahía de
Banderas; escritura con/sin acentos, CP, calles homónimas, números ausentes.
Medir acierto de dirección/entrada, distancia al punto esperado, resultados
ambiguos, legalidad de ruta moto, ajuste a red, p50/p95, vacíos/429 y costo por
sesión completa. Documentar tamaño y verdad de referencia antes de comparar;
no hay umbrales ni resultados aprobados todavía. Prueba física de accesos con
comercios y cobertura real siguen pendientes. No enviar instrucciones de entrega
a un proveedor: no son entrada necesaria para geocodificar.

El backend actual conserva solo datos sintéticos bajo
[ADR-0010](../decisions/0010-delivery-location-snapshots.md). Antes de datos reales:
aprobar proveedor/licencia, presupuesto, polígono de cobertura, reglas de moto,
aviso de privacidad, retención implementada y eliminación verificable también en
backups. Cambiar source/verification requerirá validación autorizada del servidor
y nuevo contrato; el cliente no podrá autoacreditarse.
