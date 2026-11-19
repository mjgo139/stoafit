# StoaFit · instrucciones para Claude

App de nutrición de la familia estoica, hermana de **Stoica** (https://stoica-app.web.app) y **TITANUS** (https://titanus-10398.web.app, repositorio `mjgo139/titanus`). Leé este archivo entero antes de cambiar algo.

## Estado actual

| Dato | Valor |
|---|---|
| Fase | 1 (usarla sola) armada en v1.0.0. Fase 2 (nutricionista) y 3 (logros, recordatorios, admin) pendientes |
| Repositorio | `mjgo139/stoafit` (privado), rama `main` |
| Proyecto Firebase | `stoafit-app` (plan Spark, gratis) |
| Firestore | Standard, modo producción, región `southamerica-east1` (São Paulo) |
| Auth | correo/contraseña, Google y anónimo (invitado). Limpieza automática de anónimos: apagada |
| Web | https://stoafit-app.web.app |
| APK | se arma en cada push y se publica en el Release `apk-ultima` del repositorio (el plan Spark no permite `.apk` en Hosting). Carga `https://stoafit-app.web.app` (`server.url` en `capacitor.config.ts`): se actualiza sola. Como el repositorio es privado, la APK solo la baja el dueño con su sesión; para compartirla se manda el archivo |
| Admin | uids en el documento `config/admins` (`{ uids: [...] }`), cargado a mano en la consola. Nunca en el código |
| Secreto de deploy | `FIREBASE_SERVICE_ACCOUNT` en GitHub → Settings → Secrets → Actions (lo carga el dueño) |
| Configuración web | `src/firebaseConfig.ts` (pública, no es secreta). Si estuviera vacía, la app entra sola en modo prueba |

## Comandos

| Para qué | Comando |
|---|---|
| Probar en modo prueba (sin Firebase) | `npm run demo` → http://localhost:5173 (cuenta `sofia@ejemplo.com` / `stoafit`) |
| Modo prueba en la web publicada | `https://stoafit-app.web.app/?prueba=1` (`?prueba=0` para salir) |
| Pruebas de lógica | `npm test` |
| Pruebas de pantallas + capturas | `npm run test:e2e` (capturas en `capturas/celular` y `capturas/pc`). Fuera de GitHub: `PW_CHROME=/usr/bin/google-chrome` |
| Pruebas de reglas | `npm run test:reglas` (necesita Java y descarga el emulador; en el entorno de Claude la red lo bloquea, corre en GitHub) |
| Íconos | `PW_CHROME=/usr/bin/google-chrome node scripts/iconos.mjs` |
| Armar | `npm run build` |

## Estructura

- `src/lib/` lógica pura con pruebas: `nutricion.ts` (Mifflin-St Jeor, metas, totales, día cumplido, promedios), `alimentos.ts` (biblioteca de ~130 alimentos de Paraguay con porciones caseras, búsqueda sin tildes), `plantillas.ts` (días de ejemplo), `logica.ts` (fechas, racha, semana, romanos), `frases.ts`, `novedades.ts`.
- `src/data/repo.ts` interfaz única de datos. `memoria.ts` = modo prueba; `firebase.ts` = real; `semilla.ts` = datos inventados (Sofía, 6 semanas).
- `src/screens/`: `Acceso`, `Conocerte` (bienvenida; `/conocerte?editar=1`), `Hoy`, `Diario`, `Agregar` (buscador, favoritos, "lo de ayer", alimento propio), `Plan`, `Progreso`, `Perfil`.
- `src/ui/`: `familia.tsx` (Laurel, Grupo "I · TEXTO ——", Ficha, CabeceraPagina), `piezas.tsx`, `nutri.tsx` (anillo de calorías, barras de macros, vasos de agua, tarjeta de comida), `Regla.tsx`, `Marco.tsx` (barra lateral PC 248 px / pestañas celular), `usarDia.ts` (guarda el día + resumen del perfil en una tanda), `recordatorio.ts`.
- `src/pro/`: base "profesional y sus clientes" de TITANUS. Hoy solo `tipos.ts`, `logica.ts`, `especialidades.ts` (`TIPO_APP = 'nutricionista'`, código `NUT-XXXX`) e `invitacion.ts`. Las pantallas de TITANUS para la Fase 2 están en `base-pro/` (fuera de `src`, no se compilan): copiarlas a `src/pro/` y armar `src/pro/nutricionista/` (pestañas: resumen, diario de comidas solo lectura, plan asignado, peso y medidas, objetivos, mensajes). `base-pro/CLAUDE-de-TITANUS.md` explica cómo se hizo cada cosa.
- Firestore: `users/{uid}` + `days/{AAAA-MM-DD}` (un documento por día con todas las comidas, el agua y los totales), `customFoods`, `bodyLogs`, `plans`, `comments`, `goals`. Plataforma: `profesionales`, `codigos`, `solicitudes`, `vinculos`, `config/admins`. Reglas en `firestore.rules`: la nutricionista activa con vínculo activo lee todo y escribe planes con `asignadaPor` = ella, comentarios y objetivos; nunca el diario ni el perfil.
- Para ahorrar lecturas y escrituras: cada cambio del diario son 2 escrituras (el día + `resumen` del perfil). `resumen` guarda los últimos 120 días con registros y cumplidos, y alcanza para la racha, la semana y el estado del cliente sin leer los días.

## Diseño (familia estoica)

- Igual que Stoica: modo claro **"Mármol"** (piedra `#ECE6DB`, tarjetas `#FAF7F1`, bronce `#7E5D22`), oscuro (`#14120E`, bronce `#C9A66B`) y sistema. Playfair Display para títulos y números, Inter para textos, etiquetas en MAYÚSCULAS espaciadas. Verde `#3F6E38` = cumplido, rojo ladrillo `#9C3F2E` = no cumplido / pasado.
- Detalle propio: **color de acento** (`data-acento` = `oliva` | `terracota` | `bronce`, en Perfil → Apariencia) para el agua, las comidas registradas y las grasas. **Pendiente que el dueño elija el predeterminado** (hoy: oliva). Capturas `70-acento-*`.
- PC (≥1024 px): contenido hasta 1480 px, barra lateral 248 px, tarjetas radio 16. Celular: máximo 480 px y pestañas abajo (Hoy · Diario · Plan · Progreso · Perfil).
- Ícono: igual al de Stoica (cuadrado `#14120E`, laurel dorado `#C9A66B`) con una **manzana marfil** `#F3EDDF` en lugar de letra (decisión del dueño). Cambiar el ícono obliga a reinstalar la APK.
- Esqueletos (`Cargando`) en vez de "Cargando…". Tarjetas lado a lado siempre del mismo alto (hay prueba: Agua y Tu semana en Hoy).
- Las grillas llevan `grid-cols-1` en celular: sin eso se estiran al contenido y la página queda más ancha que la pantalla (hay prueba).
- Día cumplido = 2 comidas o más y calorías entre el 85 % y el 110 % de la meta.

## Reglas de trabajo

- El dueño no programa. Responder en español con voseo paraguayo, claro y directo; explicar cada término técnico en una frase. Primero el resultado, después el detalle; tablas para comparar. Pasos: "📍 Estás en: …" y "## Paso N" con sub-pasos numerados y enlaces.
- **Seguridad:** nunca escribir ni pedir contraseñas, claves, tokens ni credenciales; no crear claves de cuentas de servicio, no tocar IAM, no ingresar datos de pago. Dar los pasos para que lo haga el dueño. Nunca subir datos personales reales a GitHub. Capturas y datos de prueba siempre inventados.
- Commits en español: `vX.Y.Z - qué cambia`. **Nunca** agregar líneas `Co-Authored-By` ni `Claude-Session`.
- En cada funcionalidad, costo aproximado en Firebase para 100, 1.000 y 10.000 usuarios. Priorizar el plan gratis (Spark).
- Si algo es ambiguo y cuesta rehacerlo, preguntar antes. Si es rápido de cambiar, decidir y avisar.
- Al cambiar algo visible: subir la versión en `package.json` y agregar la entrada en `src/lib/novedades.ts`.
- Después de cada push, seguir el run de "Publicar" y avisar qué cambió, el commit, el estado y qué probar.
- Workflow "Publicar" en cada push a `main`: pruebas web → pruebas de reglas → APK → deploy. Si una prueba falla, no se publica.

## Lo que falta (pedido original)

**Fase 2 (con nutricionista, reusando la base):** pedir ser profesional (el admin aprueba y genera `NUT-XXXX`); invitar por código o enlace de WhatsApp; panel de clientes (al día, atención, inactivo; último registro; cumplimiento); ficha del cliente (resumen, diario solo lectura, plan asignado que el cliente no edita, peso y medidas, objetivos, mensajes y comentarios en cada día); lado del cliente ("De tu nutricionista", permisos, cortar el vínculo). Modo prueba: una nutricionista con 3 clientes (uno al día, uno inactivo, uno nuevo) y una solicitud pendiente.

**Fase 3:** logros, recordatorios con la app cerrada y aviso si lleva varios días sin registrar; panel de admin con datos agrupados (usuarios activos, registros por día, retención) sin ver lo personal de nadie.
