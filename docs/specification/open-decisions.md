# Decisiones abiertas y evidencia necesaria

**Estado:** lista explícita de interrogantes y dueños por asignar. Nadie debe responderlas inventando supuestos como hechos.

| ID | Decisión abierta | Dueño sugerido | Evidencia requerida | Bloquea |
| --- | --- | --- | --- | --- |
| DEC-01 | ¿Primer negocio: envíos de comercios o marketplace? | Producto / fundador | entrevistas y costos unitarios | MVP |
| DEC-02 | Modelo de reparto, relación contractual y cobertura | Legal + Operación | revisión legislación mexicana y contratos | piloto |
| DEC-03 | Quién cobra al cliente, cuándo y cómo se liquida | Finanzas + Legal | flujos de dinero y PSP en sandbox | cobros |
| DEC-04 | Tarifas, política de cancelación y compensación | Producto + Finanzas | simulaciones de margen y riesgo | publicación de precios |
| DEC-05 | React Native/Expo y módulo de GPS background | Ingeniería móvil | pruebas en teléfonos Android/iOS reales | app courier |
| DEC-06 | Supabase self-hosted: licencias, auth, realtime, RLS, restore | Plataforma + Seguridad | PoC, licencias y recovery test | infra productiva |
| DEC-07 | Proveedor de mapas, rutas, ETA y cobertura | Operación + Ingeniería | coste/trayectos reales y SLA | cotizador |
| DEC-08 | UI mobile: estilos, gestos, lector de pantalla | Frontend móvil | PoC visual/accesibilidad y estabilidad dependencias | design system mobile |
| DEC-09 | Cobertura piloto, zonas, horarios y elegibilidad | Operaciones | puntos/zonas reales y capacidad courier | despacho |
| DEC-10 | Datos GPS: base legal, retención, precisión, enlace de tracking | Legal/Privacidad + Ingeniería | matriz de datos y amenaza | tracking público |
| DEC-11 | Estados, transición y excepciones concretas | Producto + Operaciones | workshop de flujos y casos difíciles | contratos API |
| DEC-12 | Semántica de quote y límites de validez | Finanzas + Producto | reglas de precio, cancelaciones y PSP | creación delivery |
| DEC-13 | SLO, RPO/RTO, cargas pico y costo | Plataforma + Operación | benchmarks, presupuesto, contrato | piloto remunerado |
| DEC-14 | Customer web / courier mobile vs otras apps iniciales | Producto | estudio de uso y presupuesto | alcance de apps |
| DEC-15 | Nombre comercial, marca y dominios finales | Producto + Legal | comprobación marcaria/dominios | lanzamiento marca |
| DEC-16 | Framework backend, ORM y esquema DB inicial | Ingeniería | PoC consultas espaciales + transacciones | implementación |
| DEC-17 | Estrategia eventos: exacto envelope y persistencia | Arquitectura | tests de outbox, compatibilidad y consumidores | integraciones |
| DEC-18 | Quién gestiona cuentas de flotas múltiples y autorizaciones | Producto + Legal | políticas de roles, relaciones y casos reales | fleet advanced |

## Modo de resolución
Una DEC se cierra registrando fecha, responsable, decisión y evidencia, actualizando las especificaciones afectadas y un ADR cuando la arquitectura cambia sustancialmente. No considerar cerrada una decisión solo porque aparezca un valor de ejemplo en JSON.

## Revisión recomendada antes de escribir código
Resolver al menos DEC-01/02/03/05/06/07/09/10/11/13/16, priorizando lo que bloquearía al usuario o la seguridad. Lo demás puede planificarse con reservas y evolucionar.
