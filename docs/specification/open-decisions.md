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
| DEC-07 | Mapas, rutas y ETA | **Pendiente** | Proveedor y costos con trayectos locales; geocoding/zonas/servicio degradado. | Tarifario |
| DEC-08 | UI nativa/gestos | **Propuesta condicionada** | UI native propia/tokens; tests accesibles de gestos, mapas y estilo Android/iOS. | Design system |
| DEC-09 | Zona y cobertura piloto | **Parcialmente definido** | Una microzona urbana dentro de **Puerto Vallarta (Jalisco)**, hasta 10 comercios invitados, tentativo 12–20 h, moto. Falta polígono, distancias, capacidad y horarios reales. Bahía de Banderas después. | Piloto |
| DEC-10 | GPS/privacidad | **Bloqueante externo+técnico** | Base jurídica, permisos, avisos, retención, minimización, tokens/canales y revisión de threat model. | Tracking |
| DEC-11 | Flujos y estados | **Definido para diseño, revisión pendiente** | `Delivery` independiente de `Order`; secuencia estándar/estados y despacho secuencial; cancelación posterior a pickup bajo custodia e intervención. Validar taller con operación. | Contratos |
| DEC-12 | Quote y caducidad | **Corte local persistente** | Contrato JSON Schema v1, snapshot PostgreSQL por sujeto/sucursal y tarifa sintética versionada, vigencia de 10 min en composición local. Falta consumo/rechazo de expiración y snapshot al crear Delivery, proveedor de rutas, PSP y excepciones. Ver [API](api-contracts.md). | Cotizador |
| DEC-13 | SLO, RPO/RTO, costos | **Pendiente con medición** | Carga sintética, GPS battery, p95, outbox y gasto variable/infra, baseline y presupuesto. | Piloto remunerado |
| DEC-14 | Aplicaciones iniciales | **Definido para diseño** | `merchant-web`, `courier-mobile`, `admin-web`, tracking web mínimo, `marketing`, `api`, `worker`; **sin app nativa comprador ni fleet-web M0**. | P2 |
| DEC-15 | Marca final | **Provisional explícito** | «Volón» reemplazable; disponibilidad registral, marca, dominios y activos quedan por revisar. | Lanzamiento |
| DEC-16 | Backend, ORM y DB físico | **Elegido para desarrollo local** | Node HTTP + handler Fetch modular, Prisma 7 estable como único migrador de `app`, PostgreSQL 17 de Supabase y PostGIS. Decisión del usuario: [ADR-0007](../decisions/0007-local-backend.md). Operación productiva pendiente. | P2 |
| DEC-17 | Eventos y outbox | **Definido conceptualmente, prueba pendiente** | Backend autoridad; outbox para hechos durables; Broadcast privado efímero, snapshot tras reconexión. Test de versionado, permisos y consistencia. | Integraciones |
| DEC-18 | Gestión de flotas múltiples | **Diferido a M2** | Modelo compatible con roles/tenants; no construir fleet-web ni split payouts en M0. Definir contratos/roles en M2. | Flotas |

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
