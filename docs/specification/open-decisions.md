# Registro de decisiones de producto y validaciones pendientes

**Corte:** 2026-10-17. **El desarrollo técnico ya está autorizado; los asuntos pendientes bloquean uso comercial, datos reales o integraciones críticas según corresponda, NO escribir código de prueba/contratos/UI.** Las siguientes son **elecciones internas de diseño** tomadas para avanzar por delegación del fundador, **no** comprobaciones de factibilidad comercial, cumplimiento legal o pruebas técnicas. **Reglas operativas M0:** [piloto-operating-model](../product/pilot-operating-model.md).

## Estado por decisión

| ID | Tema | Estado | Elección o evidencia que falta | Gate afectado |
| --- | --- | --- | --- | --- |
| DEC-01 | Primera modalidad | **Definido para diseño** | Empezar por **envíos B2B** para ventas propias de comercios, luego marketplace. Validar demanda y costo unitario antes de operar. | P0 comercial |
| DEC-02 | Contratación de couriers y seguridad social | **Bloqueante externo** | Repartidores en motocicleta; relación legal/IMSS, seguros, compensación y contrato requieren dictamen jurídico/fiscal. | Piloto remunerado |
| DEC-03 | Quién cobra y cómo | **Parcialmente definido** | Comercio paga a plataforma **solo logística**, no productos; PSP directo por servicio, sin split/wallet/efectivo. Validar PSP México, facturación, reglas tributarias, conciliación, cobro/remuneración courier. | Cobros |
| DEC-04 | Tarifas, cancelación, compensación | **Parcialmente definido** | Marketplace futuro: comisión comercial máxima de **10% del subtotal de productos**, sin reparto ni otros cargos; M0: base + tramo de ruta/zona, sin tarifa dinámica. Montos reales, impuestos, reembolsos y costos siguen abiertos. | Publicar tarifas |
| DEC-05 | React Native/Expo + background GPS | **Propuesta condicionada** | Pruebas Android/iOS con pantalla bloqueada, ahorro de batería, cierre, permisos y conectividad. | App courier |
| DEC-06 | Supabase Self-Hosted | **Local Docker elegido; producción condicionada** | Supabase CLI oficial fijada, con Auth/DB/Realtime/Storage locales. ADR-0007; Self-Hosted productivo, Broadcast privado, backup/restore y capacidad siguen pendientes. | Infra |
| DEC-07 | Mapas, rutas y ETA | **Pendiente** | Adaptador OSRM aislado con pruebas simuladas, **no habilitado ni validado en calles reales**. Comparar proveedor y costos con trayectos de Puerto Vallarta; geocoding/zonas/servicio degradado. | Tarifario |
| DEC-08 | UI nativa/gestos | **Propuesta condicionada** | UI native propia/tokens; tests accesibles de gestos, mapas y estilo Android/iOS. | Design system |
| DEC-09 | Zona y cobertura piloto | **Parcialmente definido** | Una microzona urbana dentro de **Puerto Vallarta (Jalisco)**, hasta 10 comercios invitados, tentativo 12–20 h, moto. Falta polígono, distancias, capacidad y horarios reales. Bahía de Banderas después. | Piloto |
| DEC-10 | GPS/privacidad | **Bloqueante externo+técnico** | Base jurídica, permisos, avisos, retención, minimización, tokens/canales y revisión de threat model. | Tracking |
| DEC-11 | Flujos y estados | **Definido para diseño, revisión pendiente** | `Delivery` independiente de `Order`; secuencia estándar/estados y despacho secuencial; cancelación posterior a pickup bajo custodia e intervención. Validar taller con operación. | Contratos |
| DEC-12 | Quote y caducidad | **Consumo local elegido por el usuario** | Una quote vigente crea una sola Delivery requested, con snapshot inmutable e idempotencia persistente transaccional. Reintento idéntico autorizado devuelve el original aunque la quote haya vencido después. Proveedor vial, PSP y excepciones comerciales siguen pendientes. Ver [API](api-contracts.md). | Cotizador |
| DEC-13 | SLO, RPO/RTO, costos | **Pendiente con medición** | Carga sintética, GPS battery, p95, outbox y gasto variable/infra, baseline y presupuesto. | Piloto remunerado |
| DEC-14 | Aplicaciones iniciales | **Definido para diseño** | `merchant-web`, `courier-mobile`, `admin-web`, tracking web mínimo, `marketing`, `api`, `worker`; **sin app nativa comprador ni fleet-web M0**. | P2 |
| DEC-15 | Marca final | **Identidad aprobada para desarrollo** | Nombre comercial «Volon» (sin acento) e identidad visual en [identity](../brand/identity.md), 17-10-2026. Sigue siendo reemplazable; registro marcario, dominios y SVG finales pendientes. | Lanzamiento |
| DEC-16 | Backend, ORM y DB físico | **Elegido para desarrollo local** | Node HTTP + handler Fetch modular, Prisma 7 estable como único migrador de `app`, PostgreSQL 17 de Supabase y PostGIS. Decisión del usuario: [ADR-0007](../decisions/0007-local-backend.md). Operación productiva pendiente. | P2 |
| DEC-17 | Eventos y outbox | **Laboratorio interno #18; producto pendiente** | Persistencia atómica y deduplicación del agregado sintético; publicación/consumidores, Broadcast privado y recuperación de producto pendientes. [Contrato](dispatch-lab.md). | Integraciones |
| DEC-18 | Gestión de flotas múltiples | **Diferido a M2** | Modelo compatible con roles/tenants; no construir fleet-web ni split payouts en M0. Definir contratos/roles en M2. | Flotas |

### Asignación exclusiva — incremento #18

DEC-03/11/16/17: [ADR-0014](../decisions/0014-dispatch-lab.md) autoriza solamente
la prueba de exclusión/outbox con escenarios artificiales separados. Delivery
conserva su inmutabilidad. Pendientes: evidencia PSP transaccional/revocación,
estado logístico separado del snapshot, protocolo de custodia y acceso temporal
a destino antes de conectar ofertas a HTTP/móvil. No se confirma pago por un test.

### Identidad Courier y disponibilidad — incremento #16

DEC-11/16: corte reversible offline/available con Courier separado de Membership,
Auth/RLS reales, CAS/ledger idempotente y revocación serializada. Contrato exacto
en [API](api-contracts.md#courier-local-sintético--incremento-16) y motivos en
[ADR-0013](../decisions/0013-courier-identity-and-availability.md). No se ratifica
identidad productiva, elegibilidad laboral/vehicular, PSP, destinos, flotas ni
despacho. Requested solo podrá ofertarse con elegibilidad financiera verificada.

### Sobre privado de laboratorio — incremento #14

Autorizado local/sintético: tabla aditiva, RLS, cifrado y ledger simulados,
pruebas de retiros/fallos y filas antiguas. [Contrato](private-location-lab.md).
No cambia almacenamiento existente ni habilita PII. ADR-0011 conserva estado
Propuesta; KMS real, política de conservación, ledger/auditoría duraderos,
reconciliation, licencias, purge y backup/restore requieren decisión humana.

### Preflight de mapas — incremento #13

Propuesta de seis referentes públicos, 22 búsquedas y ocho rutas pendientes;
preflight sin red/secretos, costos por volumen y auditoría documental de tres
adaptadores. [Contrato, fuentes y aprobación pendiente](../validation/map-provider-benchmark.md).
DEC-07/09 no se cierran: no hay consultas reales, tolerancias/accesos aprobados,
cuenta revisada ni selección. Manifiesto real v2 admite búsquedas observacionales
con revisión humana explícita, sin aprobar rutas ni inventar aciertos. El dataset
versionado continúa no ejecutable. No cambia cotización, Delivery ni privacidad.

### Evaluación de mapas y privacidad — incremento #12

[Harness y protocolo](../validation/map-provider-benchmark.md) con tres adaptadores
aislados y CI offline; no hay consultas reales ni selección de proveedor.
DEC-07/09 requieren accesos/tolerancias y umbrales revisados, benchmark real,
licencia de almacenamiento compartido y presupuesto. El ciclo de retención es
[ADR-0011 propuesta](../decisions/0011-location-privacy-lifecycle.md), sin plazo
predeterminado, migración o borrado real. No amplía operación ni permisos.

### Direcciones sintéticas — decisión del incremento #11

El usuario autorizó conservar destinos e indicaciones exclusivamente sintéticos
en JSON existente y leer pickup/snapshots mediante Auth/RLS, sin migración.
[ADR-0010](../decisions/0010-delivery-location-snapshots.md) y [contrato API](api-contracts.md)
definen el corte. La [comparación documental](../validation/address-provider-evaluation.md)
propone evaluar Geoapify frente a Google/Mapbox; no selecciona ni activa proveedor.
DEC-04/07/09 siguen abiertos para tarifas, rutas y cobertura reales. Retención
implementada y licencia compatible con snapshots compartidos son previas a PII.

### Contexto mínimo de comercio — decisión del incremento #9

Solicitud del usuario del 18-10-2026: implementar únicamente identidad y selector
de sucursales sobre el modelo local vigente (DEC-16/ADR-0007). Sin nuevos roles,
estados, tablas ni permisos: membresía habilitada por sucursal, comercio y
sucursal habilitados. Respuesta mínima y 404 anti-enumeración definidos en
[API](api-contracts.md). Historial paginado autorizado en el segundo corte de #9:
20 items predeterminados, máximo 100, orden descendente por createdAt/id y cursor
opaco ligado a sucursal con reautorización RLS en cada página. Sin cambios de
modelo/estados, migraciones ni privilegios. Semántica completa en el contrato API;
roles/vigencias temporales y autorización productiva continúan pendientes.

## Interpretación obligatoria
- **Definido para diseño:** permite preparar casos, APIs candidatas, mockups y estimaciones. **No permite desplegar servicio real ni marcar validado**.
- **Parcialmente definido:** conservar el diseño seleccionado, pero no implementar dependencias críticas sin la evidencia indicada.
- **Bloqueante externo:** se necesita revisión humana profesional en el ámbito legal/fiscal/operativo, que no podemos sustituir con una suposición.
- **Propuesta condicionada:** requiere spike y ADR ratificado; no impone proveedor o framework definitivo.
- **Diferido:** solo preparar contratos extensibles sin construir features futuras.

## Próximo conjunto de cierres reales
1. **P0 negocio/operación:** conversaciones con comercios, couriers, volumen/cobertura y costos (DEC-01, DEC-09, DEC-04).
2. **P0 legal/finanzas:** figura y obligaciones courier, riesgos, custodia y flujo de fondos/CFDI/PSP (DEC-02, DEC-03, DEC-10).
3. **P1 pruebas técnicas:** Expo background, Supabase, mapas, PSP sandbox, atomicidad y backups (DEC-05..08, DEC-13, DEC-16/17).
4. **P2 entrada:** ratificación explícita de contratos y presupuesto; no confundir este registro con un go-live.

## Regla de cambios
Actualiza la **fila DEC correspondiente**, enlaza evidencia/actor/fecha y ajusta únicamente los documentos propietarios afectados. Las ADR técnicas quedan en [decisions](../decisions/README.md). No crear una segunda matriz. Una decisión de negocio validada reemplaza este diseño elegido si lo justifican datos.

**Fuentes oficiales a verificar para el gate legal**: [IMSS/STPS 2026](https://www.imss.gob.mx/node/111772), [IMSS plataformas digitales](https://www.imss.gob.mx/empresas-personas-trabajadoras-plataformas-digitales), [SAT complemento](https://wwwmat.sat.gob.mx/consulta/52846/complemento-servicios-de-plataformas-tecnologicas). No sustituyen el dictamen del caso.
