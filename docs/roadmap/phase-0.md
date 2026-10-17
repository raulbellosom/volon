# Hoja de ruta — Fase 0 y puertas de decisión

**Objetivo actual:** dejar una base de producto y arquitectura verificable. Sin escribir aún aplicaciones productivas.

## Etapa 0A — Fundamentos (documentación inicial)
- [x] Repositorio GitHub iniciado con README de propósito.
- [x] Documentación base de actores, flujos, servicios y módulos.
- [x] Propuestas ADR con estados correctos.
- [x] Plan de validaciones técnicas.
- [ ] Revisar y ratificar prioridades de negocio con responsables reales.
- [ ] Definir quién usará primero Volón y qué problema exacto pagará por resolver.

## Etapa 0B — Investigación y definiciones
- [ ] Entrevistas con comercios y repartidores piloto.
- [ ] Matriz de modelos de negocio con economía por entrega.
- [ ] Evaluación laboral, fiscal, privacidad y condiciones de servicio en México.
- [ ] Revisión legal/marcaria de denominación final.
- [ ] Selección comparada de mapas y proveedor de pagos.
- [ ] Definir catálogo de eventos, estados de Order/Delivery/Payment y permisos por rol.
- [ ] Cerrar objetivos medibles, presupuesto y alcance del MVP.

## Etapa 0C — Spikes técnicos (código descartable y aislado)
- [ ] GPS Android/iPhone en background y batería.
- [ ] Realtime Broadcast privado y reconexión.
- [ ] Concurrencia del despacho y pruebas de asignación atómica.
- [ ] Push y UX móvil/gestos accesibles.
- [ ] Supabase Self-Hosted: licencias/versiones, RLS y restauración.
- [ ] Capacidad, costos y protocolos operativos.

## Puerta para pasar a Fase 1
Las decisiones críticas están explícitamente aceptadas en ADR, el MVP comercial tiene propietario, la conformidad legal ha sido revisada, las pruebas de GPS/Realtime funcionan según criterios definidos y existe estimación de costos. Hasta entonces, evitar scaffolding masivo.

## Etapas posteriores candidatas
Fase 1: monorepo implementado y diseño/identidad; Fase 2: piloto de envíos y despacho; Fase 3: marketplace; Fase 4: flotas e integraciones. El orden depende del descubrimiento comercial.

## Criterios de progreso
Cada entregable enlaza evidencia, decisión y responsable. El checklist no sustituye ejecución real ni aprobación.
