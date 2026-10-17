# Catálogo vivo de casos de uso

**Fecha:** 2026-10-17 · **Estado:** propuestas funcionales por validar con comercios, repartidores y operaciones. **No implica UI ni API ejecutable.**

## Convenciones
- `UC-XX`: interacción con objetivo de actor y resultado verificable. Se describe **qué sucede**, no nombres de pantallas, tablas o funciones.
- `M0`: piloto de envíos externos propuesto; `M1`: marketplace; `M2`: flotas/expansión.
- Los **flujos técnicos detallados** están en [estados](../specification/state-machines.md), [API](../specification/api-contracts.md) y [eventos](../specification/event-contracts.md), no se duplican aquí.
- La autorización, reglas de tarifa, evidencias y condiciones legales deben aprobarse; los ejemplos no conceden permisos automáticamente.

## UC-01 — Administrar negocio y sucursales (M0)
- **Actor primario:** propietario o encargado autorizado del comercio.
- **Objetivo/precondición:** organización registrada, identidad verificada y permisos de sucursal adecuados.
- **Flujo normal:** identifica comercio → configura datos y sucursal, ubicación y horarios → valida cambios → consulta información operativa.
- **Alternativas:** sucursal de otro negocio, horario/dirección inválida, permiso revocado o negocio suspendido → bloquear con mensaje seguro; conservar histórico.
- **Resultado:** sucursal disponible para cotizar solo donde las reglas operativas lo permiten.
- **Trazabilidad:** RF-001/002 · WBS DEL-001 · ACC-010.

## UC-02 — Alta y disponibilidad del repartidor (M0)
- **Actor:** repartidor; gestor responsable según relación contractual aprobada.
- **Precondición:** onboarding y requisitos/documentos pertinentes aprobados.
- **Flujo:** consulta elegibilidad → selecciona disponibilidad/vehículo → inicia turno → ve ofertas apropiadas → finaliza cuando condiciones lo permiten.
- **Alternativas:** documentación caduca, GPS restringido, servicio activo, falta de cobertura, pérdida de conexión → estado claro y supervisión, no asumir `online = available`.
- **Resultado:** turno y elegibilidad autoritativos, sin depender de Presence.
- **Trazabilidad:** RF-003/004 · DEL-002.

## UC-03 — Obtener una cotización de envío (M0)
- **Actor:** empleado de sucursal con permiso.
- **Precondición:** comercio habilitado, cobertura y datos mínimos.
- **Flujo:** indica recogida/destino y modalidad → API valida zona y condiciones → calcula desglose, vigencia y moneda → muestra cotización.
- **Alternativas:** dirección ambigua, fuera de cobertura, proveedor de rutas caído, precio caducado → no prometer ETA/precio definitivo inexistente.
- **Resultado:** quote identificada, auditada según política y con duración definida.
- **Trazabilidad:** RF-005/006 · DEL-003 · ACC-015.

## UC-04 — Solicitar una entrega independiente (M0)
- **Actor:** empleado autorizado del comercio.
- **Precondición:** quote válida y condiciones de cobro/servicio aplicables aceptadas.
- **Flujo:** proporciona destinatario y referencias necesarias → confirma solicitud → backend revalida scope/quote → crea una Delivery → devuelve ID y estado real.
- **Alternativas:** doble envío por timeout o clic repetido, key reused con cuerpo distinto, quote vencida, DB caída → no duplicar ni reportar confirmación inexistente.
- **Resultado:** Delivery persistida exactamente una vez, sin necesidad de Order del marketplace.
- **Trazabilidad:** RF-007/008/021 · DEL-004 · ACC-001/002/003/020.

## UC-05 — Recibir y aceptar/rechazar oferta (M0)
- **Actor:** repartidor elegible.
- **Precondición:** disponible y oferta dirigida vigente.
- **Flujo:** recibe notificación/consulta ofertas → revisa ruta/costo/condiciones → acepta o declina → API confirma resultado → se actualiza vista.
- **Alternativas:** segundo repartidor aceptó primero, oferta expirada, falla de push, app sin red, doble toque → backend confirma solo un ganador; perdedor ve conflicto y estado vigente.
- **Resultado:** como máximo una Assignment activa compatible y trazabilidad de intentos.
- **Trazabilidad:** RF-009/010/018 · DEL-005/008 · ACC-004/005.

## UC-06 — Despachar o reasignar manualmente (M0)
- **Actor:** dispatcher autorizado de área/tenant.
- **Precondición:** existe entrega pendiente o problema con asignación.
- **Flujo:** visualiza cola/frescura → filtra candidatos → asigna u ofrece → backend verifica elegibilidad y exclusión → registra motivo y avisa.
- **Alternativas:** no hay candidatos, cambio de courier antes/después de pickup, conflicto simultáneo o falta de GPS → resolver custodia e incidencia con intervención, nunca sobreescribir silenciosamente Assignment.
- **Resultado:** decisión operacional auditable; bloqueo explícito ante inconsistencia.
- **Trazabilidad:** RF-011/020/023 · DEL-006/014 · ACC-006/007.

## UC-07 — Recoger, transportar y entregar (M0)
- **Actor:** repartidor asignado.
- **Precondición:** Assignment activa y Delivery en estado que permita transición.
- **Flujo:** consulta puntos/referencias autorizadas → navega → registra llegada → acredita recogida → inicia traslado → presenta prueba requerida de entrega → recibe confirmación de servidor.
- **Alternativas:** destinatario ausente, paquete dañado, evidencia inaccesible, offline, ya entregado → incidencia, reintento idempotente o intervención según custodia; no marcar entregado por solo detectar GPS cercano.
- **Resultado:** estado final/pendiente consistente con prueba y auditoría.
- **Trazabilidad:** RF-012/013/021 · DEL-008/009/010 · ACC-016.

## UC-08 — Consultar seguimiento y cambios en tiempo real (M0)
- **Actor:** comercio, destinatario autorizado, courier propio u operador con motivo y scope.
- **Precondición:** relación con entrega vigente o token de seguimiento protegido/revocable.
- **Flujo:** consulta snapshot seguro → ve progreso y última ubicación con hora/precisión → recibe Broadcast autorizado → reconcilia API al reconectar.
- **Alternativas:** GPS atrasado, canal revocado, red offline, permiso caducado, payload fuera de orden → mostrar stale/no disponible y restringir acceso.
- **Resultado:** seguimiento honesto sin exposición de otras entregas o ubicación fuera del periodo permitido.
- **Trazabilidad:** RF-014..017/024 · DEL-011/012 · ACC-008/009/011/012/017.

## UC-09 — Cancelar entrega o reportar incidencia (M0)
- **Actor:** comercio, repartidor u operador autorizado, según etapa.
- **Precondición:** la política de cancelación/custodia está aprobada y el actor puede intervenir.
- **Flujo:** indica causa → backend valida etapa y cargo/responsabilidad → persiste cancelación/incidente y notifica afectados → soporte resuelve o escala.
- **Alternativas:** paquete ya recogido, dinero capturado, disputa, intento de estado terminal → prohibir transición directa incompatible; gestionar compensación y evidencia.
- **Resultado:** operación trazable y sin pérdida del estado previo.
- **Trazabilidad:** RF-019/021 · DEL-010 · ACC-016.

## UC-10 — Resolver una contingencia operativa (M0)
- **Actor:** operador de despacho/soporte.
- **Precondición:** cola/alerta de fallos o incidente abierto.
- **Flujo:** identifica problema (sin courier, socket caído, delivery estancada, GPS offline) → consulta fuente de verdad → aplica playbook y permisos → registra decisión → comunica estado veraz.
- **Alternativas:** DB/PSP caídos o fraude sospechado → suspende acciones peligrosas y escala; no inventa confirmación ni pago.
- **Resultado:** la entrega sigue segura, pausada o escalada, con rastro de resolución.
- **Trazabilidad:** RF-020/023 · DEL-010/014 · ACC-020/021/022.

## UC-11 — Conciliar cobro asociado al reparto (M0 condicionado)
- **Actor:** responsable financiero/autorizado y proveedor PSP.
- **Precondición:** modelo legal, facturación y PSP validados; reglas de reembolso aprobadas.
- **Flujo:** registra operación de cobro legalmente permitida → espera confirmación verificable → recibe/reconcilia eventos → genera ledger y liquidaciones según contrato.
- **Alternativas:** webhook falso o duplicado, timeout, pago pendiente, reembolso parcial, contracargo → deduplica y conserva estado incierto hasta reconciliar.
- **Resultado:** no hay doble cargo/liquidación ni confusión entre Delivery y Payment.
- **Trazabilidad:** RF-022 · DEL-015 · ACC-014.

## UC-12 — Publicar catálogo y explorar comercios (M1)
- **Actores:** comercio y cliente.
- **Flujo:** comercio actualiza productos/variantes/disponibilidad → sistema valida permisos y horarios → cliente ve solo catálogo aplicable a su ubicación/horario.
- **Alternativas:** producto agotado, tienda cerrada, catálogo desactualizado → no prometer disponibilidad inexistente; revalidar en checkout.
- **Resultado:** catálogo versionado y accesible con reglas comerciales.
- **Trazabilidad:** RF-025/026 · MKT-001/002/003.

## UC-13 — Comprar en marketplace y solicitar entrega (M1)
- **Actores:** cliente, comercio, PSP y courier (en etapas distintas).
- **Flujo:** selecciona productos → carrito → cotización/checkout servidor → confirmación de pago y Order según política → preparación → Delivery → seguimiento y cierre.
- **Alternativas:** falta de stock, cambio de precio, pago incierto, cancelación después de preparar, reembolso y disputa → conservar estados financieros/comerciales/logísticos independientes.
- **Resultado:** compra, cobro y transporte conciliables sin transiciones implícitas.
- **Trazabilidad:** RF-027/028/029 · MKT-005/006/007/008.

## UC-14 — Coordinar flota empresarial (M2)
- **Actor:** gestor de flota con autorización.
- **Flujo:** administra miembros/vehículos, turnos y trabajos dentro de su contrato → observa disponibilidad/servicios pertinentes → revisa incidencias y liquidación.
- **Alternativas:** courier en varias flotas o pierde membresía → prevalece scope vigente y confidencialidad por contrato.
- **Resultado:** flota operable sin acceso transversal indebido.
- **Trazabilidad:** RF-030 · FLT-001/002/004.

## UC-15 — Activar nueva zona o ciudad (M2/P7)
- **Actor:** equipo de operaciones y plataforma autorizado.
- **Flujo:** valida demanda, cobertura, reglas fiscales/legales, capacidad y proveedores → configura zona/tarifas/soporte → piloto controlado → monitorea métricas.
- **Alternativas:** falta de capacidad, autorización o margen → no activar.
- **Resultado:** ampliación controlada, reversible y medible.
- **Trazabilidad:** RF-031 · EXP-001/002.

## UC-16 — Cambiar marca comercial (transversal)
- **Actor:** producto/branding/ingeniería con autorización de publicación.
- **Flujo:** actualiza branding central y configuración pública → revisa dominios, deep links, apps, SEO, textos legales y assets → despliegue/actualización compatible.
- **Alternativas:** dominios o marca no disponibles, IDs móviles estables, apps anteriores circulando → mantener redirecciones/compatibilidad, no renombrar contratos de dominio.
- **Resultado:** identidad visible renovada sin rehacer base de datos y contratos.
- **Trazabilidad:** RF-032 / RNF-011 · UX-007 · ACC-019.

## Cuándo actualizar este catálogo
Actualizar un UC **si cambia la interacción o una excepción importante**. Si cambia solamente una ruta, tabla o nombre de método, actualizar el contrato técnico correspondiente, no duplicarlo aquí. Nuevos UC requieren relación con RF, WBS y pruebas; UC retirados se marcan `Sustituido` con enlace al reemplazo.

Para criterios de aceptación verificables: [matriz ACC](../specification/acceptance-matrix.md). Para propiedad del backlog: [Plan Maestro / WBS](../master-plan/05-work-breakdown.md). Para política: [documentación viva](../conventions/documentation-lifecycle.md).
