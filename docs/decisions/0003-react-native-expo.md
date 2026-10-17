# ADR-0003: React Native + Expo para repartidores
- **Fecha:** 2026-10-17
- **Estado:** Propuesta condicionada
- **Contexto:** tracking GPS background, notificaciones, navegación y gestos reales son críticos en Android/iOS.
- **Elección candidata:** React Native + Expo con Development Builds y módulos nativos donde sean imprescindibles.
- **Alternativas:** Flutter/Dart, Kotlin+Swift, Ionic/Capacitor.
- **Motivos:** TypeScript/React compartidos con web y acceso al ecosistema nativo; menor duplicación de lógica.
- **Riesgos:** límites del sistema operativo tras cierre forzado, permisos de ubicación, batería, fabricantes Android, mantenimiento de librerías nativas.
- **Condición de aceptación:** ejecutar los ensayos GPS y gestos de docs/validation/technical-spikes.md en dispositivos físicos Android e iOS.
- **Plan B:** módulo nativo de ubicación, o reconsiderar Flutter/nativo si la evidencia muestra limitaciones relevantes.
