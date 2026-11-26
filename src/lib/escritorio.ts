/**
 * Widget para Windows (Rainmeter) de StoaFit. Rediseño de v1.21.0, pedido por el dueño ("muy feo el de la alimentación").
 * Son dos skins propios, en negro y oro y sin cruces rojas. El paquete, el emblema y el Lua común salen de familia/escritorio.ts.
 *  - "Tu día" (StoaFit/Hoy): anillo de calorías (cuánto queda), barras de proteína, carbohidratos y grasas,
 *    las comidas de hoy con sus kcal, la semana de lunes a domingo y la racha.
 *  - "Tu mes" (StoaFit/Mes): las últimas 5 semanas en círculos (oro = cumplido, aro = anotado, gris = sin anotar).
 *
 * Formato del resumen `t` (versión 3, propio de StoaFit). Los campos nuevos van siempre al final.
 *   "3|Nombre|AAAA-MM-DD|HH:MM|lunes|kcal|metaKcal|prot|metaProt|carb|metaCarb|gras|metaGras|anotadas|comidas|racha|% 30 días|35 días|DÍA"
 *   Le sigue "~id|comida|kcal|anotada(1/0)" por cada comida (máximo 8).
 *   Letras de los 35 días: 1 cumplido · r anotado sin cumplir · 0 sin anotar · p hoy pendiente · f futuro · - antes de crear la cuenta.
 */
import { COLORES_ICONO, FIGURAS } from '../../familia/emblema.mjs';
import {
  LUA_COMUN, MEDIDAS, aRainmeter, armarRmskin, coloresDeLaFamilia, emblemaPng, fechasGrilla, limpio, urlResumen, utf16le, variablesComunes,
  type ColoresWidget,
} from '../../familia/escritorio';
import { claveDia, fechaDeClave, hastaHoy, racha, sumarDias, NOMBRES_DIA } from './logica';
import { comidasDe, comidasDelDia, comidasRegistradas, diaCumplido, metasDe, sumar } from './nutricion';
import type { Dia, ItemComida, Perfil } from './tipos';

export const DIRECCION_STOAFIT = 'https://stoafit-app.web.app';
export const CLAVE_ESCRITORIO = 'stoafit.escritorio.ultimo';
export const ARCHIVO_ESCRITORIO = 'StoaFit.rmskin';
export const MAX_COMIDAS = 8;

// ---------------------------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------------------------

/** Arma el resumen. `clave` (sin la hora) sirve para no volver a subir si nada cambió. */
export function textoStoaFit(perfil: Perfil, dia: Dia | null, hora: string, ahora = Date.now()): { clave: string; texto: string } {
  const hoy = claveDia(ahora);
  const metas = metasDe(perfil);
  const creado = perfil.creado ? claveDia(perfil.creado) : '0000-00-00';
  const registrados = new Set(hastaHoy(perfil.resumen.dias, hoy));
  const cumplidos = new Set(hastaHoy(perfil.resumen.cumplidos, hoy));
  const t = dia?.totales ?? { kcal: 0, prot: 0, carb: 0, gras: 0 };
  const lista = comidasDelDia(comidasDe(perfil), dia);
  const anotadas = dia ? comidasRegistradas(dia) : 0;
  const cumplidoHoy = dia ? diaCumplido(dia, metas) : cumplidos.has(hoy);
  const conHoy = cumplidoHoy ? [...cumplidos, hoy] : [...cumplidos].filter((f) => f !== hoy);
  const grilla = fechasGrilla(hoy);

  const mes = grilla.map((f) => {
    if (f > hoy) return 'f';
    if (f === hoy) return cumplidoHoy ? '1' : 'p';
    if (f < creado) return '-';
    return cumplidos.has(f) ? '1' : registrados.has(f) ? 'r' : '0';
  }).join('');
  let n = 0, total = 0;
  for (let k = 0; k < 30; k++) {
    const f = sumarDias(hoy, -k);
    if (f < creado) break;
    if (f === hoy && !cumplidoHoy) continue;
    total++;
    if (f === hoy || cumplidos.has(f)) n++;
  }
  const fecha = fechaDeClave(hoy);
  const nombreDia = `${NOMBRES_DIA[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}`.toUpperCase();
  const r = (x: number) => Math.max(0, Math.round(x || 0));

  const comidas = lista.slice(0, MAX_COMIDAS).map((c) => {
    const items = (dia?.comidas[c.id] ?? []) as ItemComida[];
    return [limpio(c.id, 30), limpio(c.nombre, 24), items.length ? r(sumar(items).kcal) : 0, items.length ? 1 : 0].join('|');
  });
  const pre = `3|${limpio((perfil.nombre || 'Invitado').split(' ')[0], 24)}|${hoy}`;
  const pos = [grilla[0], r(t.kcal), r(metas.kcal), r(t.prot), r(metas.prot), r(t.carb), r(metas.carb), r(t.gras), r(metas.gras),
    anotadas, lista.length, racha(conHoy, hoy), total ? r((n / total) * 100) : 0, mes, nombreDia].join('|');
  return { clave: [`${pre}|${pos}`, ...comidas].join('~'), texto: [`${pre}|${hora}|${pos}`, ...comidas].join('~') };
}

// ---------------------------------------------------------------------------------------------
// Skins
// ---------------------------------------------------------------------------------------------

export interface ColoresFit extends ColoresWidget {
  prot: string;
  carb: string;
  gras: string;
}

function variables(c: ColoresFit, proyecto: string, codigo: string) {
  return `Ancho=300
${variablesComunes(c)}
Pista=${aRainmeter(COLORES_ICONO.figura, 28)}
OroSuave=${aRainmeter(COLORES_ICONO.laurel, 150)}
Prot=${c.prot}
Carb=${c.carb}
Gras=${c.gras}
App=${DIRECCION_STOAFIT}
Url=${urlResumen(proyecto, codigo)}`;
}

const ESTILOS = `[EstiloTexto]
FontFace=Segoe UI
AntiAlias=1
FontColor=#Marfil#

[EstiloChico]
FontFace=Segoe UI
FontSize=8
StringStyle=Bold
FontColor=#Gris#
AntiAlias=1

[EstiloNumero]
FontFace=Georgia
StringStyle=Bold
FontColor=#Oro#
AntiAlias=1`;

const CABEZA = (titulo: string, sub: string, ruta: string) => `[MeterEmblema]
Meter=Image
ImageName=#@#emblema.png
X=16
Y=16
W=38
PreserveAspectRatio=1
LeftMouseUpAction=["#App#${ruta}"]

[MeterMarca]
Meter=String
MeterStyle=EstiloNumero
X=62
Y=14
FontSize=14
Text=${titulo}
LeftMouseUpAction=["#App#${ruta}"]

[MeterSub]
Meter=String
MeterStyle=EstiloChico
X=63
Y=40
W=220
ClipString=1
Text=${sub}`;

const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const X_DIA = (i: number) => Math.round(18 + 264 / 14 + (i * 264) / 7);
const MACROS = [['Prot', 'Proteína'], ['Carb', 'Carbohidr.'], ['Gras', 'Grasas']] as const;

/** "Tu día": StoaFit/Hoy/Hoy.ini */
export function skinDiaIni(proyecto: string, codigo: string, c: ColoresFit): string {
  const macros = MACROS.map(([k, nombre], i) => `
[MeterM${i + 1}Nombre]
Meter=String
MeterStyle=EstiloTexto
X=148
Y=${86 + i * 36}
FontSize=9
Text=${nombre}

[MeterM${i + 1}Valor]
Meter=String
MeterStyle=EstiloNumero
X=282
Y=${87 + i * 36}
FontSize=8
StringAlign=Right
Text=

[MeterM${i + 1}Barra]
Meter=Shape
X=148
Y=${105 + i * 36}
Shape=Rectangle 0,0,134,5,2.5 | Fill Color #Pista# | StrokeWidth 0
Shape2=Rectangle 0,0,0,5,2.5 | Fill Color #${k}# | StrokeWidth 0
`).join('');
  const comidas = Array.from({ length: MAX_COMIDAS }, (_, i) => `
[MeterC${i + 1}Marca]
Meter=String
MeterStyle=EstiloTexto
X=18
Y=0
FontSize=9
FontColor=#Oro#
Text=◇
Hidden=1

[MeterC${i + 1}Nombre]
Meter=String
MeterStyle=EstiloTexto
X=38
Y=0
W=170
ClipString=1
FontSize=10
Text=
Hidden=1
LeftMouseUpAction=["#App#/diario"]

[MeterC${i + 1}Kcal]
Meter=String
MeterStyle=EstiloNumero
X=282
Y=0
FontSize=10
StringAlign=Right
Text=
Hidden=1
`).join('');
  const letras = LETRAS.map((l, i) => `
[MeterL${i + 1}]
Meter=String
MeterStyle=EstiloChico
X=${X_DIA(i)}
Y=0
StringAlign=Center
Text=${l}
`).join('');
  return `; StoaFit · Tu día (lo armó la app; no hace falta tocar nada)
; Lee tu resumen cada 15 minutos. Clic derecho → "Actualizar ahora" para pedirlo ya.

[Rainmeter]
Update=1000
DynamicWindowSize=1
AccurateText=1
ContextTitle=Abrir StoaFit
ContextAction=["#App#"]
ContextTitle2=Actualizar ahora
ContextAction2=[!CommandMeasure MeasureDatos "Update"]
ContextTitle3=Agregar "Tu mes"
ContextAction3=[!ActivateConfig "StoaFit\\Mes" "Mes.ini"]

[Metadata]
Name=StoaFit · Tu día
Author=StoaFit
Information=Tus calorías de hoy, tus macros, tus comidas y tu semana.
Version=2.0
License=Uso personal

[Variables]
${variables(c, proyecto, codigo)}

${ESTILOS}

${MEDIDAS}

[MeasureLua]
Measure=Script
ScriptFile=#@#dia.lua

[MeterFondo]
Meter=Shape
Shape=Rectangle 0,0,#Ancho#,440,16 | Fill Color #Fondo# | StrokeWidth 1 | Stroke Color #Linea#

${CABEZA('StoaFit', 'CARGANDO…', '')}

[MeterAnillo]
Meter=Shape
X=18
Y=72
Shape=Ellipse 56,56,47 | Fill Color 0,0,0,1 | StrokeWidth 9 | Stroke Color #Pista#
LeftMouseUpAction=["#App#/diario"]

[MeterRestan]
Meter=String
MeterStyle=EstiloNumero
X=74
Y=104
FontSize=19
FontColor=#Marfil#
StringAlign=Center
Text=

[MeterRestanTexto]
Meter=String
MeterStyle=EstiloChico
X=74
Y=134
FontSize=7
StringAlign=Center
Text=KCAL RESTAN

[MeterDeMeta]
Meter=String
MeterStyle=EstiloChico
X=74
Y=147
FontSize=7
StringAlign=Center
Text=
${macros}
[MeterRaya1]
Meter=Shape
X=18
Y=196
Shape=Line 0,0,264,0 | StrokeWidth 1 | Stroke Color #Linea#
${comidas}
[MeterRaya2]
Meter=Shape
X=18
Y=0
Shape=Line 0,0,264,0 | StrokeWidth 1 | Stroke Color #Linea#
${letras}
[MeterSemana]
Meter=Shape
X=0
Y=0
Shape=Rectangle 0,0,300,46 | Fill Color 0,0,0,1 | StrokeWidth 0
LeftMouseUpAction=[!ActivateConfig "StoaFit\\Mes" "Mes.ini"]

[MeterRacha]
Meter=String
MeterStyle=EstiloChico
X=18
Y=0
FontColor=#Oro#
Text=

[MeterAccion]
Meter=String
MeterStyle=EstiloNumero
FontFace=Segoe UI
X=282
Y=0
FontSize=10
StringAlign=Right
SolidColor=0,0,0,1
Text=Anotar comida ◇
LeftMouseUpAction=["#App#/agregar"]
`;
}

/** "Tu mes": StoaFit/Mes/Mes.ini */
export function skinMesIni(proyecto: string, codigo: string, c: ColoresFit): string {
  const letras = LETRAS.map((l, i) => `
[MeterL${i + 1}]
Meter=String
MeterStyle=EstiloChico
X=${X_DIA(i)}
Y=124
StringAlign=Center
Text=${l}
`).join('');
  return `; StoaFit · Tu mes (lo armó la app; no hace falta tocar nada)

[Rainmeter]
Update=1000
AccurateText=1
ContextTitle=Abrir StoaFit
ContextAction=["#App#/progreso"]
ContextTitle2=Actualizar ahora
ContextAction2=[!CommandMeasure MeasureDatos "Update"]
ContextTitle3=Agregar "Tu día"
ContextAction3=[!ActivateConfig "StoaFit\\Hoy" "Hoy.ini"]

[Metadata]
Name=StoaFit · Tu mes
Author=StoaFit
Information=Tus días cumplidos de las últimas 5 semanas.
Version=2.0
License=Uso personal

[Variables]
${variables(c, proyecto, codigo)}

${ESTILOS}

${MEDIDAS}

[MeasureLua]
Measure=Script
ScriptFile=#@#mes.lua

[MeterFondo]
Meter=Shape
Shape=Rectangle 0,0,#Ancho#,384,16 | Fill Color #Fondo# | StrokeWidth 1 | Stroke Color #Linea#

${CABEZA('Tu medida', 'DÍAS CUMPLIDOS · ÚLTIMAS 5 SEMANAS', '/progreso')}

[MeterRacha]
Meter=String
MeterStyle=EstiloNumero
X=18
Y=62
FontSize=24
Text=

[MeterRachaTexto]
Meter=String
MeterStyle=EstiloChico
X=18
Y=102
Text=DÍAS SEGUIDOS

[MeterPct]
Meter=String
MeterStyle=EstiloNumero
X=282
Y=66
FontSize=20
FontColor=#Marfil#
StringAlign=Right
Text=

[MeterPctTexto]
Meter=String
MeterStyle=EstiloChico
X=282
Y=102
StringAlign=Right
Text=DEL MES
${letras}
[MeterGrilla]
Meter=Shape
X=0
Y=142
Shape=Rectangle 0,0,300,170 | Fill Color 0,0,0,1 | StrokeWidth 0
LeftMouseUpAction=["#App#/progreso"]

[MeterLeyenda1]
Meter=String
MeterStyle=EstiloChico
X=18
Y=320
FontColor=#Oro#
Text=● cumplido

[MeterLeyenda2]
Meter=String
MeterStyle=EstiloChico
X=108
Y=320
FontColor=#Oro#
Text=○ anotado

[MeterLeyenda3]
Meter=String
MeterStyle=EstiloChico
X=190
Y=320
Text=● sin anotar

[MeterRaya]
Meter=Shape
X=18
Y=342
Shape=Line 0,0,264,0 | StrokeWidth 1 | Stroke Color #Linea#

[MeterMeta]
Meter=String
MeterStyle=EstiloChico
X=18
Y=357
Text=

[MeterAccion]
Meter=String
MeterStyle=EstiloNumero
FontFace=Segoe UI
X=282
Y=354
FontSize=10
StringAlign=Right
SolidColor=0,0,0,1
Text=Ver progreso ›
LeftMouseUpAction=["#App#/progreso"]
`;
}

/** Lua común a los dos skins de StoaFit. */
const LUA_FIT = `${LUA_COMUN}
local function leer(texto)
  local partes = partir(texto, '~')
  local cab = partir(partes[1] or '', '|')
  local comidas = {}
  for i = 2, #partes do comidas[#comidas + 1] = partir(partes[i], '|') end
  return cab, comidas
end
local function num(x) return tonumber(x or '0') or 0 end
-- 1430 → "1.430"
local function miles(n)
  local s = tostring(math.floor(n + 0.5))
  local r = s:reverse():gsub('(%d%d%d)', '%1.'):reverse()
  if r:sub(1, 1) == '.' then r = r:sub(2) end
  return r
end
local function xDia(i) return math.floor(18 + 264 / 14 + (i - 1) * 264 / 7 + 0.5) end
-- Formas de un círculo del calendario según su letra
local function circulo(c, x, y, r, esHoy)
  local s = {}
  if c == '1' then
    s[#s + 1] = 'Ellipse ' .. x .. ',' .. y .. ',' .. r .. ' | Fill Color ' .. v('Oro') .. ' | StrokeWidth 0'
    s[#s + 1] = 'Line ' .. (x - 4) .. ',' .. y .. ',' .. (x - 1) .. ',' .. (y + 3) .. ' | StrokeWidth 1.8 | Stroke Color ' .. v('Fondo')
    s[#s + 1] = 'Line ' .. (x - 1) .. ',' .. (y + 3) .. ',' .. (x + 5) .. ',' .. (y - 4) .. ' | StrokeWidth 1.8 | Stroke Color ' .. v('Fondo')
  elseif c == 'r' then
    s[#s + 1] = 'Ellipse ' .. x .. ',' .. y .. ',' .. (r - 1) .. ' | Fill Color 0,0,0,1 | StrokeWidth 1.5 | Stroke Color ' .. v('OroSuave')
  elseif c == '0' then
    s[#s + 1] = 'Ellipse ' .. x .. ',' .. y .. ',' .. r .. ' | Fill Color ' .. v('Pista') .. ' | StrokeWidth 0'
  else
    s[#s + 1] = 'Ellipse ' .. x .. ',' .. y .. ',' .. (r - 1) .. ' | Fill Color 0,0,0,1 | StrokeWidth 1 | Stroke Color ' .. v('Tenue')
  end
  if esHoy then
    s[#s + 1] = 'Ellipse ' .. x .. ',' .. y .. ',' .. (r + 3) .. ' | Fill Color 0,0,0,0 | StrokeWidth 2 | Stroke Color ' .. v('Oro')
  end
  return s
end
-- Pone las formas de un Shape y vacía las que sobran de la vez anterior
local usadas = {}
local function formas(meter, base, lista)
  poner(meter, 'Shape', base)
  for k, f in ipairs(lista) do poner(meter, 'Shape' .. (k + 1), f) end
  for k = #lista + 2, (usadas[meter] or 0) + 1 do poner(meter, 'Shape' .. k, 'Rectangle 0,0,0,0 | StrokeWidth 0') end
  if #lista > (usadas[meter] or 0) then usadas[meter] = #lista end
end
-- Posición de hoy en la grilla de 35 días (1..35), o 0 si el resumen no es de hoy
local function indiceHoy(cab, hoy)
  if (cab[3] or '') ~= hoy then return 0 end
  local a, b = diaNumero(cab[5]), diaNumero(hoy)
  if not a or not b then return 0 end
  return b - a + 1
end
`;

/** Script de "Tu día" (dia.lua). Lua 5.1 de Rainmeter. */
export function skinDiaLua(): string {
  return `-- StoaFit · Tu día: anillo de calorías, macros, comidas y semana.
local ultimo, dia = nil, nil
local MAX = ${MAX_COMIDAS}
${LUA_FIT}
function Initialize() end

function Estado(cual)
  poner('MeterSub', 'Text', cual == 'sin-conexion' and 'SIN CONEXIÓN · REINTENTA EN 15 MIN' or 'ABRÍ STOAFIT PARA ACTUALIZAR')
  SKIN:Bang('!UpdateMeter', 'MeterSub')
  SKIN:Bang('!Redraw')
end

-- Arco del anillo: f = parte comida de la meta (0 a 1)
function Arco(f)
  local r, cx, cy = 47, 56, 56
  local estilo = ' | Fill Color 0,0,0,0 | StrokeWidth 9 | Stroke Color ' .. v('Oro') .. ' | StrokeStartCap Round | StrokeEndCap Round'
  if f >= 0.999 then return { 'Ellipse 56,56,47' .. estilo } end
  if f <= 0.005 then return {} end
  local a = -math.pi / 2 + f * 2 * math.pi
  local grande = (f > 0.5) and 1 or 0
  return { string.format('Arc %d,%d,%.1f,%.1f,%d,%d,0,0,%d,0', cx, cy - r, cx + r * math.cos(a), cy + r * math.sin(a), r, r, grande) .. estilo }
end

function Pintar(texto, hoy)
  local cab, comidas = leer(texto)
  local h = indiceHoy(cab, hoy)
  local esHoy = h > 0
  local kcal, meta = esHoy and num(cab[6]) or 0, num(cab[7])
  if texto == '' then poner('MeterSub', 'Text', 'CARGANDO…')
  elseif esHoy then poner('MeterSub', 'Text', (cab[19] or '') .. ' · ' .. num(cab[14]) .. ' DE ' .. num(cab[15]) .. ' COMIDAS')
  else poner('MeterSub', 'Text', 'ABRÍ STOAFIT PARA ACTUALIZAR') end
  -- Anillo y centro
  formas('MeterAnillo', 'Ellipse 56,56,47 | Fill Color 0,0,0,1 | StrokeWidth 9 | Stroke Color ' .. v('Pista'), Arco(meta > 0 and math.min(kcal / meta, 1) or 0))
  if meta > 0 and kcal > meta then
    poner('MeterRestan', 'Text', '+' .. miles(kcal - meta)); poner('MeterRestanTexto', 'Text', 'KCAL DE MÁS')
  else
    poner('MeterRestan', 'Text', miles(meta - kcal)); poner('MeterRestanTexto', 'Text', 'KCAL RESTAN')
  end
  poner('MeterDeMeta', 'Text', miles(kcal) .. ' / ' .. miles(meta))
  -- Macros
  local macros = { { 8, 9, 'Prot' }, { 10, 11, 'Carb' }, { 12, 13, 'Gras' } }
  for i, m in ipairs(macros) do
    local val, obj = esHoy and num(cab[m[1]]) or 0, num(cab[m[2]])
    poner('MeterM' .. i .. 'Valor', 'Text', val .. ' / ' .. obj .. ' g')
    local ancho = obj > 0 and math.floor(134 * math.min(val / obj, 1)) or 0
    poner('MeterM' .. i .. 'Barra', 'Shape2', 'Rectangle 0,0,' .. ancho .. ',5,2.5 | Fill Color ' .. v(m[3]) .. ' | StrokeWidth 0')
  end
  -- Comidas
  local y = 208
  for i = 1, MAX do
    local c = comidas[i]
    local m = 'MeterC' .. i
    if c then
      local anotada = esHoy and c[4] == '1'
      poner(m .. 'Marca', 'Text', anotada and '◆' or '◇')
      poner(m .. 'Marca', 'FontColor', anotada and v('Oro') or v('Gris'))
      poner(m .. 'Nombre', 'Text', c[2] or '')
      poner(m .. 'Nombre', 'FontColor', anotada and v('Marfil') or v('Gris'))
      if anotada then
        poner(m .. 'Kcal', 'Text', miles(num(c[3])))
        poner(m .. 'Kcal', 'FontFace', 'Georgia'); poner(m .. 'Kcal', 'FontSize', '10'); poner(m .. 'Kcal', 'FontColor', v('Oro'))
      else
        poner(m .. 'Kcal', 'Text', 'sin anotar')
        poner(m .. 'Kcal', 'FontFace', 'Segoe UI'); poner(m .. 'Kcal', 'FontSize', '8'); poner(m .. 'Kcal', 'FontColor', v('Gris'))
      end
      poner(m .. 'Marca', 'Y', tostring(y + 1))
      poner(m .. 'Nombre', 'Y', tostring(y))
      poner(m .. 'Kcal', 'Y', tostring(y + (anotada and 0 or 3)))
      for _, s in ipairs({ 'Marca', 'Nombre', 'Kcal' }) do SKIN:Bang('!ShowMeter', m .. s) end
      y = y + 23
    else
      for _, s in ipairs({ 'Marca', 'Nombre', 'Kcal' }) do SKIN:Bang('!HideMeter', m .. s) end
    end
  end
  -- Semana: los últimos 7 días de la grilla (lunes a domingo de esta semana)
  y = y + 8
  poner('MeterRaya2', 'Y', tostring(y))
  y = y + 12
  local semana = (cab[18] or ''):sub(29, 35)
  local s = {}
  for i = 1, 7 do
    poner('MeterL' .. i, 'Y', tostring(y))
    local c = semana:sub(i, i)
    if c == 'p' then c = 'f' end
    for _, x in ipairs(circulo(c, xDia(i), 30, 11, esHoy and i == h - 28)) do s[#s + 1] = x end
  end
  poner('MeterSemana', 'Y', tostring(y))
  formas('MeterSemana', 'Rectangle 0,0,300,46 | Fill Color 0,0,0,1 | StrokeWidth 0', s)
  y = y + 58
  local rr = num(cab[16])
  poner('MeterRacha', 'Text', 'RACHA · ' .. romano(rr) .. ' ' .. (rr == 1 and 'DÍA' or 'DÍAS'))
  poner('MeterRacha', 'Y', tostring(y + 3))
  local cumplido = esHoy and semana:sub(h - 28, h - 28) == '1'
  poner('MeterAccion', 'Text', cumplido and 'Ver diario ›' or 'Anotar comida ◇')
  poner('MeterAccion', 'LeftMouseUpAction', '["' .. v('App') .. (cumplido and '/diario' or '/agregar') .. '"]')
  poner('MeterAccion', 'Y', tostring(y))
  poner('MeterFondo', 'Shape', 'Rectangle 0,0,' .. v('Ancho') .. ',' .. (y + 32) .. ',16 | Fill Color ' .. v('Fondo') .. ' | StrokeWidth 1 | Stroke Color ' .. v('Linea'))
  SKIN:Bang('!UpdateMeter', '*')
  SKIN:Bang('!Redraw')
end

function Update()
  local medida = SKIN:GetMeasure('MeasureTexto')
  local t = medida and medida:GetStringValue() or ''
  local hoy = os.date('%Y-%m-%d')
  if t ~= ultimo or hoy ~= dia then
    ultimo, dia = t, hoy
    Pintar(decodificar(t), hoy)
  end
  return 0
end
`;
}

/** Script de "Tu mes" (mes.lua). Lua 5.1 de Rainmeter. */
export function skinMesLua(): string {
  return `-- StoaFit · Tu mes: las últimas 5 semanas en círculos.
local ultimo, dia = nil, nil
${LUA_FIT}
function Initialize() end

function Estado(cual)
  poner('MeterSub', 'Text', cual == 'sin-conexion' and 'SIN CONEXIÓN · REINTENTA EN 15 MIN' or 'ABRÍ STOAFIT PARA ACTUALIZAR')
  SKIN:Bang('!UpdateMeter', 'MeterSub')
  SKIN:Bang('!Redraw')
end

function Pintar(texto, hoy)
  local cab = leer(texto)
  local h = indiceHoy(cab, hoy)
  local mes = cab[18] or ''
  local rr = num(cab[16])
  poner('MeterRacha', 'Text', romano(rr))
  poner('MeterRachaTexto', 'Text', rr == 1 and 'DÍA CUMPLIDO' or 'DÍAS SEGUIDOS')
  poner('MeterPct', 'Text', texto == '' and '' or (num(cab[17]) .. ' %'))
  local s = {}
  for k = 1, 35 do
    local fila, col = math.floor((k - 1) / 7), (k - 1) % 7 + 1
    local c = mes:sub(k, k)
    if c == 'p' then c = 'f' end
    if c == '' then c = '-' end
    for _, x in ipairs(circulo(c, xDia(col), 17 + fila * 34, 12, h > 0 and k == h)) do s[#s + 1] = x end
  end
  formas('MeterGrilla', 'Rectangle 0,0,300,170 | Fill Color 0,0,0,1 | StrokeWidth 0', s)
  local meta = num(cab[7])
  poner('MeterMeta', 'Text', meta > 0 and ('META ' .. miles(meta) .. ' KCAL') or '')
  if texto == '' then poner('MeterSub', 'Text', 'CARGANDO…')
  elseif h == 0 then poner('MeterSub', 'Text', 'ABRÍ STOAFIT PARA ACTUALIZAR')
  else poner('MeterSub', 'Text', 'DÍAS CUMPLIDOS · ÚLTIMAS 5 SEMANAS') end
  SKIN:Bang('!UpdateMeter', '*')
  SKIN:Bang('!Redraw')
end

function Update()
  local medida = SKIN:GetMeasure('MeasureTexto')
  local t = medida and medida:GetStringValue() or ''
  local hoy = os.date('%Y-%m-%d')
  if t ~= ultimo or hoy ~= dia then
    ultimo, dia = t, hoy
    Pintar(decodificar(t), hoy)
  end
  return 0
end
`;
}

/** Colores: los de la familia más los de los macros (proteína, carbohidratos, grasas). */
export function coloresFit(): ColoresFit {
  const estilo = getComputedStyle(document.documentElement);
  const c = document.createElement('canvas').getContext('2d')!;
  const leer = (nombre: string) => {
    c.fillStyle = COLORES_ICONO.laurel;
    const v = estilo.getPropertyValue(nombre).trim();
    if (v) c.fillStyle = v;
    return aRainmeter(String(c.fillStyle));
  };
  return { ...coloresDeLaFamilia(), prot: leer('--prot'), carb: leer('--carb'), gras: leer('--gras') };
}

const RMSKIN_INI = `[rmskin]
Name=StoaFit
Author=StoaFit
Version=2.0
MinimumRainmeter=4.5.0
MinimumWindows=10.0
LoadType=Skin
Load=StoaFit\\Hoy\\Hoy.ini
`;

/** Archivos del paquete (sin el emblema, que necesita el navegador). */
export function archivosStoaFit(proyecto: string, codigo: string, c: ColoresFit) {
  return [
    { nombre: 'RMSKIN.ini', datos: utf16le(RMSKIN_INI) },
    { nombre: 'Skins/StoaFit/Hoy/Hoy.ini', datos: utf16le(skinDiaIni(proyecto, codigo, c)) },
    { nombre: 'Skins/StoaFit/Mes/Mes.ini', datos: utf16le(skinMesIni(proyecto, codigo, c)) },
    { nombre: 'Skins/StoaFit/@Resources/dia.lua', datos: utf16le(skinDiaLua()) },
    { nombre: 'Skins/StoaFit/@Resources/mes.lua', datos: utf16le(skinMesLua()) },
  ];
}

/** Arma StoaFit.rmskin con el código adentro, listo para doble clic. */
export async function paqueteStoaFit(proyecto: string, codigo: string): Promise<Blob> {
  const archivos = archivosStoaFit(proyecto, codigo, coloresFit());
  archivos.push({ nombre: 'Skins/StoaFit/@Resources/emblema.png', datos: await emblemaPng(FIGURAS.manzana) });
  const bytes = armarRmskin(archivos);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
}
