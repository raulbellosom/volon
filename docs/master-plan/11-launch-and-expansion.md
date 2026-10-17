# 11 — Plan de piloto, lanzamiento y expansión

**Estado:** checklist para futura ejecución; ninguna operación/lanzamiento realizada.

## Prepiloto: go/no-go (bloqueante)
- [ ] Oferta comercial y segmentos definidos con evidencia; zonas/horarios/capacidad permitidos.
- [ ] Contratos, avisos de privacidad, términos de uso, derechos de titulares, obligaciones fiscales/laborales y seguros revisados y operables.
- [ ] PSP y facturación/conciliación funcionando bajo modelo correcto; disputas y reembolsos probados.
- [ ] Merchant/Branch/Courier onboarding y permisos probados; personal de soporte y despacho responsable.
- [ ] Reglas de precio y cotización aprobadas, sin promesas de ETA falsas.
- [ ] Asignación concurrente exclusiva y transiciones de Delivery con tests verdes.
- [ ] GPS Android/iOS real: background, offline, battery, permisos, precisión y limitaciones registradas.
- [ ] Canales Realtime/Storage autorizados; difusión restringida de coordenadas y evidencia.
- [ ] Eventos persistentes, dedupe, outbox, push y snapshot ante reconexión probados.
- [ ] Staging con carga sintética, alertas, logs redactados, seguridad cross-tenant y controles antifraude.
- [ ] Backup externo y restore drill; rollback de API/web y compatibilidad de versión móvil.
- [ ] Entrenamiento/comunicación a comercios y couriers, rutas de soporte y política ante accidentes/incidencias.
- [ ] Definición de límites/umbrales KPI y presupuesto para pausar pilotos; responsable firma go/no-go.

## Operación por cohortes
1. **Alfa interna:** datos sintéticos y entregas simuladas, con registros técnicos reproducibles.
2. **Beta cerrada:** pocos negocios y couriers autorizados en cobertura delimitada, feedback diario.
3. **Piloto remunerado:** solo después de go/no-go legal/financiero/seguridad, monitoreo activo.
4. **Expansión local:** aumentar cohortes si confiabilidad, soporte, márgenes, satisfacción y capacidad lo permiten.
5. **Marketplace público:** rediseñar captación de clientes y atención/reembolso, nueva puerta de lanzamiento específica.
6. **Flotas y ciudades:** lanzar por geografía y contrato, no habilitar toda la región de golpe.

## Plan de lanzamiento técnico
Antes de cambio: release notes, revisión de migraciones, compatibilidad y secretos, flags, backups, monitoreo/guardia y rollback. Durante: despliegue gradual, verificación sintética E2E, observar dashboards. Después: comparar KPIs/errores, documentar incidentes, revertir si trigger superado. Diferenciar release web inmediato de release móvil gradual por App/Play stores.

## Contingencias
- Falta de couriers: capacidad/zonas limitadas y aviso al negocio; no aceptar indefinidamente.
- GPS/Realtime: mostrar dato stale, fallback API/manual y suspender seguimiento no confiable.
- PSP: detener transacciones de pago de estado incierto y conciliación antes de reintentar; nunca confirmar dinero ficticio.
- DB: rechazar cambios críticos y restaurar según runbook; evitar nuevas asignaciones sin autoridad.
- Riesgo de privacidad/seguridad: limitar acceso, revocar credenciales, documentar y atender obligaciones de notificación aplicables.

## Condición para abrir nueva ciudad
Datos de demanda, acuerdos/obligaciones locales, flota activa, zonas, costos reales, soporte, supplier reliability, SLO y presupuesto suficiente. Configuraciones por ciudad sin mezclar autorización tenant; monitorización específica y playbook de suspensión.

## Productos posteriores
Customer-mobile solo si demuestra valor frente a web/PWA; multi-parada/IA/optimización si mejora margen/servicio sin quitar control humano; integración POS para comercios si hay adopción. Documentar aceptación adicional; no incorporar a piloto por inercia.

## Postmortems y mejora
Cualquier incidente crítico registra hechos, impacto, línea temporal, detección, causas contribuyentes, aprendizaje y acción preventiva. Evitar asignar culpabilidad individual como sustituto de controles técnicos/operativos.
