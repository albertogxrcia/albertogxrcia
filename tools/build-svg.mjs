#!/usr/bin/env node
// Genera los SVG animados del perfil a partir de data/perfil.json.
// Sin dependencias: node tools/build-svg.mjs [--sin-fuente] [--comprobar]
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const datos = JSON.parse(readFileSync(join(raiz, 'data/perfil.json'), 'utf8'))
const fuente = readFileSync(join(raiz, 'tools/fuentes/inter.b64'), 'utf8').trim()
const CON_FUENTE = !process.argv.includes('--sin-fuente')
const COMPROBAR = process.argv.includes('--comprobar')

const C = {
  fondo: '#1a1a2e',
  tarjeta: '#1c1c33',
  tarjeta2: '#23233d',
  borde: 'rgba(142,197,252,0.20)',
  acento: '#8ec5fc',
  acento2: '#4a6fa5',
  blanco: '#ffffff',
  suave: '#c7cedb',
  apagado: '#8a93a3',
  aviso: '#f0a08a'
}

const PILA = "'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// Estimador de ancho: evita depender de metricas reales de la fuente.
function ancho (txt, size, peso = 400) {
  let u = 0
  for (const ch of txt) {
    if (' .,:;\'!|'.includes(ch)) u += 0.30
    else if ('ijltfrI('.includes(ch)) u += 0.35
    else if ('mwMW@'.includes(ch)) u += 0.88
    else if (ch >= '0' && ch <= '9') u += 0.60
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) u += 0.68
    else u += 0.545
  }
  return u * size * (1 + (peso - 400) * 0.00014)
}

function envolver (texto, anchoMax, size, peso = 400) {
  const palabras = texto.split(' ')
  const lineas = []
  let linea = ''
  for (const p of palabras) {
    const prueba = linea ? linea + ' ' + p : p
    if (ancho(prueba, size, peso) > anchoMax && linea) { lineas.push(linea); linea = p } else linea = prueba
  }
  if (linea) lineas.push(linea)
  return lineas
}

function doc ({ w, h, titulo, desc, estilos, cuerpo }) {
  const face = CON_FUENTE
    ? `@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:block;src:url("data:font/woff2;base64,${fuente}") format('woff2')}`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="titulo descripcion">
<title id="titulo">${esc(titulo)}</title>
<desc id="descripcion">${esc(desc)}</desc>
<style>
${face}
text{font-family:${PILA};dominant-baseline:auto}
.ent{animation:ent .62s cubic-bezier(.22,.7,.3,1) both}
@keyframes ent{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important}}
${estilos}
</style>
${cuerpo}
</svg>
`
}

function chip (x, y, texto, { size = 13, alto = 28, pad = 12, color = C.suave, delay = 0, clase = 'ent' } = {}) {
  const w = Math.round(ancho(texto, size, 500) + pad * 2)
  const svg = `<g class="${clase}" style="animation-delay:${delay}s">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${alto}" rx="${Math.round(alto / 3.2)}" fill="rgba(142,197,252,0.07)" stroke="rgba(142,197,252,0.22)"/>` +
    `<text x="${x + pad}" y="${y + alto / 2 + size * 0.36}" font-size="${size}" font-weight="500" fill="${color}">${esc(texto)}</text>` +
    '</g>'
  return { svg, w }
}

function filaChips (items, x0, y0, anchoMax, opts = {}) {
  const gap = opts.gap ?? 8
  const alto = opts.alto ?? 28
  let x = x0
  let y = y0
  let i = 0
  let piezas = ''
  for (const it of items) {
    const { svg, w } = chip(x, y, it, { ...opts, delay: (opts.delay0 ?? 0.35) + i * 0.05 })
    if (x + w > x0 + anchoMax && x > x0) { x = x0; y += alto + gap; }
    const recolocado = chip(x, y, it, { ...opts, delay: (opts.delay0 ?? 0.35) + i * 0.05 })
    piezas += recolocado.svg
    x += recolocado.w + gap
    i++
  }
  return { svg: piezas, alto: y + alto - y0 }
}

// Contador tipo odometro: cada digito sube por una columna recortada.
function odometro (x, baseY, valor, { size = 34, id = 'n', delay = 0.5, color = C.acento } = {}) {
  const H = Math.round(size * 1.5)
  const ventanaY = +(baseY - size * 0.80).toFixed(1)
  const ventanaH = +(size * 1.04).toFixed(1)
  let cursor = x
  let cuerpo = ''
  let estilos = ''
  let n = 0
  for (const ch of valor) {
    if (ch >= '0' && ch <= '9') {
      const wd = Math.round(size * 0.62)
      const d = Number(ch)
      const ide = `${id}-${n}`
      const desp = (10 + d) * H
      let col = ''
      for (let k = 0; k < 20; k++) {
        col += `<text x="${cursor + wd / 2}" y="${baseY + (k - (10 + d)) * H}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}">${k % 10}</text>`
      }
      cuerpo += `<clipPath id="v-${ide}"><rect x="${cursor}" y="${ventanaY}" width="${wd}" height="${ventanaH}"/></clipPath>` +
        `<g clip-path="url(#v-${ide})"><g class="odo-${ide}">${col}</g></g>`
      estilos += `.odo-${ide}{animation:k-${ide} 1.45s cubic-bezier(.16,.84,.26,1) both;animation-delay:${(delay + n * 0.08).toFixed(2)}s}` +
        `@keyframes k-${ide}{from{transform:translateY(${desp}px)}to{transform:translateY(0)}}`
      cursor += wd
      n++
    } else {
      const wd = ch === '.' ? size * 0.30 : ch === ' ' ? size * 0.26 : size * 0.78
      cuerpo += `<text x="${+cursor.toFixed(1)}" y="${baseY}" font-size="${size}" font-weight="800" fill="${color}" class="ent" style="animation-delay:${delay}s">${esc(ch)}</text>`
      cursor += wd
    }
  }
  return { svg: cuerpo, estilos, ancho: cursor - x }
}

/* ---------------------------------------------------------------- hero */
function hero () {
  const w = 1000, h = 300
  const nombre = datos.nombre.toUpperCase().split(' ')
  const linea1 = nombre[0]
  const linea2 = nombre.slice(1).join(' ')
  const tamNombre = 62
  const subSize = 19
  const subW = Math.round(ancho(datos.titular, subSize, 500))
  const x0 = 62

  let barras = ''
  for (let i = 0; i < 16; i++) {
    const alturas = [34, 58, 26, 72, 44, 88, 30, 64, 40, 96, 52, 36, 78, 28, 60, 42]
    const a = alturas[i]
    barras += `<rect class="onda" x="${744 + i * 15}" y="${196 - a}" width="5" height="${a}" rx="2.5" fill="url(#gBarra)" style="animation-delay:-${(i * 0.21).toFixed(2)}s"/>`
  }

  let pastillas = ''
  let px = x0
  datos.pastillas.forEach((p, i) => {
    const c = chip(px, 246, p, { size: 13, alto: 30, pad: 14, color: C.suave, delay: 2.6 + i * 0.12 })
    pastillas += c.svg
    px += c.w + 10
  })

  const cuerpo = `
<defs>
  <clipPath id="marco"><rect x="0" y="0" width="${w}" height="${h}" rx="18"/></clipPath>
  <pattern id="rejilla" width="28" height="28" patternUnits="userSpaceOnUse">
    <path d="M28 0H0V28" fill="none" stroke="rgba(142,197,252,0.055)" stroke-width="1"/>
  </pattern>
  <radialGradient id="resplandor" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#4a6fa5" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#4a6fa5" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="barrido" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#8ec5fc" stop-opacity="0"/>
    <stop offset="50%" stop-color="#8ec5fc" stop-opacity="0.13"/>
    <stop offset="100%" stop-color="#8ec5fc" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gBarra" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8ec5fc" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#8ec5fc" stop-opacity="0.06"/>
  </linearGradient>
  <linearGradient id="gTira" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8ec5fc"/>
    <stop offset="100%" stop-color="#4a6fa5"/>
  </linearGradient>
  <clipPath id="escribe"><rect x="${x0}" y="196" width="${subW + 4}" height="30">
    <animate attributeName="width" values="0;0;${subW + 4}" keyTimes="0;0.26;1" dur="2.85s" begin="0s" fill="freeze"/>
  </rect></clipPath>
</defs>
<g clip-path="url(#marco)">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${C.fondo}"/>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#rejilla)"/>
  <circle class="halo" cx="830" cy="90" r="210" fill="url(#resplandor)"/>
  <rect class="barrido" x="-360" y="0" width="360" height="${h}" fill="url(#barrido)"/>
  <g opacity="0.9">${barras}</g>
  <rect class="tira" x="0" y="0" width="7" height="${h}" fill="url(#gTira)"/>
  <g class="ent" style="animation-delay:.08s">
    <text x="${x0}" y="108" font-size="${tamNombre}" font-weight="800" fill="${C.blanco}" letter-spacing="-1">${esc(linea1)}</text>
  </g>
  <g class="ent" style="animation-delay:.2s">
    <text x="${x0}" y="170" font-size="${tamNombre}" font-weight="800" fill="${C.blanco}" letter-spacing="-1">${esc(linea2)}</text>
  </g>
  <g clip-path="url(#escribe)">
    <text x="${x0}" y="218" font-size="${subSize}" font-weight="500" fill="${C.acento}" textLength="${subW}" lengthAdjust="spacingAndGlyphs">${esc(datos.titular)}</text>
  </g>
  <rect class="cursor" x="${x0}" y="200" width="2" height="22" fill="${C.acento}">
    <animate attributeName="x" values="${x0};${x0};${x0 + subW + 4}" keyTimes="0;0.26;1" dur="2.85s" begin="0s" fill="freeze"/>
  </rect>
  ${pastillas}
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="none" stroke="${C.borde}"/>`

  const estilos = `
.tira{transform-box:fill-box;transform-origin:top center;animation:crece .8s cubic-bezier(.22,.7,.3,1) forwards}
@keyframes crece{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.barrido{animation:pasa 11s linear 1.6s infinite}
@keyframes pasa{from{transform:translateX(0)}to{transform:translateX(${w + 400}px)}}
.halo{animation:late 9s ease-in-out infinite}
@keyframes late{0%,100%{opacity:.75}50%{opacity:1}}
.onda{animation:onda 3.6s ease-in-out infinite}
@keyframes onda{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.cursor{animation:parpadeo 1s steps(1) 2.9s infinite}
@keyframes parpadeo{0%,49%{opacity:1}50%,100%{opacity:0}}`

  return doc({ w, h, titulo: `${datos.nombre}, ${datos.titular}`, desc: `Cabecera del perfil de ${datos.nombre}. ${datos.titular} ${datos.pastillas.join('. ')}.`, estilos, cuerpo })
}

/* ------------------------------------------------------------ producto */
function tarjetaProducto (p) {
  const w = 1000
  const pad = 34
  const anchoUtil = w - pad * 2
  const chips = filaChips(p.stack, pad, 104, anchoUtil, { size: 12.5, alto: 26, pad: 11, delay0: 0.45 })
  const yLinea = 104 + chips.alto + 22
  const yNum = yLinea + 54
  const yEtiq = yNum + 22
  const remate = envolver(p.remate, anchoUtil, 14.5, 400)
  const yRemate = yEtiq + 38
  const h = Math.round(yRemate + remate.length * 21 + 14)

  let metricas = ''
  let estilosNum = ''
  p.metricas.forEach((m, i) => {
    const x = pad + i * Math.round(anchoUtil / 3)
    let cursor = x
    if (m.prefijo) {
      metricas += `<text x="${cursor}" y="${yNum}" font-size="34" font-weight="800" fill="${C.acento}" class="ent" style="animation-delay:.5s">${esc(m.prefijo)}</text>`
      cursor += 22
    }
    const od = odometro(cursor, yNum, m.valor, { size: 34, id: `${p.id}-${i}`, delay: 0.5 + i * 0.12 })
    metricas += od.svg
    estilosNum += od.estilos
    cursor += od.ancho
    if (m.sufijo) {
      metricas += `<text x="${cursor + 7}" y="${yNum}" font-size="30" font-weight="700" fill="${C.acento}" class="ent" style="animation-delay:.6s">${esc(m.sufijo.trim())}</text>`
    }
    metricas += `<text x="${x}" y="${yEtiq}" font-size="12.5" font-weight="500" fill="${C.apagado}" class="ent" style="animation-delay:${(0.75 + i * 0.1).toFixed(2)}s">${esc(m.etiqueta)}</text>`
  })

  const cuerpo = `
<defs>
  <clipPath id="tarjeta"><rect x="0" y="0" width="${w}" height="${h}" rx="16"/></clipPath>
  <linearGradient id="gTira" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8ec5fc"/><stop offset="100%" stop-color="#4a6fa5"/>
  </linearGradient>
  <linearGradient id="brillo" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#8ec5fc" stop-opacity="0"/>
    <stop offset="50%" stop-color="#8ec5fc" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="#8ec5fc" stop-opacity="0"/>
  </linearGradient>
</defs>
<g clip-path="url(#tarjeta)">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${C.tarjeta}"/>
  <rect class="brillo" x="-300" y="0" width="300" height="${h}" fill="url(#brillo)"/>
  <rect class="tira" x="0" y="0" width="5" height="${h}" fill="url(#gTira)"/>
  <g class="ent" style="animation-delay:.05s">
    <text x="${pad}" y="56" font-size="27" font-weight="700" fill="${C.blanco}">${esc(p.nombre)}</text>
  </g>
  <g class="ent" style="animation-delay:.18s">
    ${envolver(p.bajada, anchoUtil, 14.5, 400).map((l, i) => `<text x="${pad}" y="${82 + i * 20}" font-size="14.5" fill="${C.suave}">${esc(l)}</text>`).join('')}
  </g>
  ${chips.svg}
  <line x1="${pad}" y1="${yLinea}" x2="${w - pad}" y2="${yLinea}" stroke="rgba(142,197,252,0.16)" class="linea"/>
  ${metricas}
  <g class="ent" style="animation-delay:1s">
    ${remate.map((l, i) => `<text x="${pad}" y="${yRemate + i * 21}" font-size="14.5" fill="${C.suave}">${esc(l)}</text>`).join('')}
  </g>
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${C.borde}"/>`

  const estilos = `
.tira{transform-box:fill-box;transform-origin:top center;animation:crece .7s cubic-bezier(.22,.7,.3,1) forwards}
@keyframes crece{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.brillo{animation:pasa 9s linear 1.2s infinite}
@keyframes pasa{from{transform:translateX(0)}to{transform:translateX(${w + 320}px)}}
.linea{transform-box:fill-box;transform-origin:left center;animation:crecex .8s cubic-bezier(.22,.7,.3,1) .3s both}
@keyframes crecex{from{transform:scaleX(0)}to{transform:scaleX(1)}}
${estilosNum}`

  const desc = `${p.nombre}. ${p.bajada} ${p.metricas.map(m => `${m.prefijo || ''}${m.valor}${m.sufijo || ''} ${m.etiqueta}`).join('. ')}. ${p.remate} Stack: ${p.stack.join(', ')}.`
  return doc({ w, h, titulo: p.nombre, desc, estilos, cuerpo })
}

/* ------------------------------------------------------------ decision */
function decision () {
  const d = datos.decision
  const w = 1000, h = 330
  const izqX = 30, izqW = 400
  const derX = 470, derW = 500

  let cajas = ''
  const ritmos = [1.9, 1.35, 2.3]
  d.antes.elementos.forEach((e, i) => {
    const y = 104 + i * 44
    cajas += `<g class="ent" style="animation-delay:${(0.15 + i * 0.1).toFixed(2)}s">` +
      `<rect x="${izqX + 24}" y="${y}" width="${izqW - 48}" height="36" rx="8" fill="rgba(240,160,138,0.06)" stroke="rgba(240,160,138,0.28)"/>` +
      `<circle class="pulso" cx="${izqX + 44}" cy="${y + 18}" r="4" fill="${C.aviso}" style="animation-duration:${ritmos[i]}s"/>` +
      `<text x="${izqX + 60}" y="${y + 23}" font-size="14" font-weight="500" fill="#e2c8c0">${esc(e)}</text>` +
      '</g>'
  })
  const notaIzq = envolver(d.antes.nota, izqW - 48, 13, 400)
  const tx1 = izqX + 26, ty1 = 110, tx2 = izqX + izqW - 26, ty2 = 104 + 2 * 44 + 32
  const largo = Math.round(Math.hypot(tx2 - tx1, ty2 - ty1))
  const tachado = `<line class="tacha" x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="${C.aviso}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${largo}" stroke-dashoffset="${largo}"/>`

  const n = d.ahora.estados.length
  const nodoW = 84, gap = Math.round((derW - 48 - n * nodoW) / (n - 1))
  let nodos = ''
  d.ahora.estados.forEach((e, i) => {
    const x = derX + 24 + i * (nodoW + gap)
    nodos += `<g class="ent" style="animation-delay:${(0.3 + i * 0.09).toFixed(2)}s">` +
      `<rect x="${x}" y="${122}" width="${nodoW}" height="44" rx="10" fill="#22223c" stroke="rgba(142,197,252,0.28)"/>` +
      `<rect class="destello" x="${x}" y="${122}" width="${nodoW}" height="44" rx="10" fill="rgba(142,197,252,0.16)" stroke="${C.acento}" style="animation-delay:${(i * 0.62).toFixed(2)}s"/>` +
      `<text x="${x + nodoW / 2}" y="${149}" text-anchor="middle" font-size="12.5" font-weight="500" fill="#dbe4f0">${esc(e)}</text>` +
      '</g>'
  })
  const x0dot = derX + 24 + nodoW / 2
  const x1dot = derX + 24 + (n - 1) * (nodoW + gap) + nodoW / 2
  const notaDer = envolver(d.ahora.nota, derW - 48, 13, 400)

  const cuerpo = `
<defs>
  <clipPath id="marco"><rect x="0" y="0" width="${w}" height="${h}" rx="16"/></clipPath>
</defs>
<g clip-path="url(#marco)">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${C.tarjeta}"/>
  <g class="ent"><text x="30" y="46" font-size="20" font-weight="700" fill="${C.blanco}">${esc(d.titulo)}</text></g>

  <rect x="${izqX}" y="64" width="${izqW}" height="${h - 94}" rx="14" fill="rgba(240,160,138,0.035)" stroke="rgba(240,160,138,0.18)"/>
  <text x="${izqX + 24}" y="92" font-size="12" font-weight="700" fill="${C.aviso}" letter-spacing="2">${esc(d.antes.titulo.toUpperCase())}</text>
  <g class="apaga">${cajas}</g>
  ${tachado}
  ${notaIzq.map((l, i) => `<text x="${izqX + 24}" y="${252 + i * 19}" font-size="13" fill="${C.apagado}" class="ent" style="animation-delay:.6s">${esc(l)}</text>`).join('')}

  <rect x="${derX}" y="64" width="${derW}" height="${h - 94}" rx="14" fill="rgba(142,197,252,0.045)" stroke="rgba(142,197,252,0.22)"/>
  <text x="${derX + 24}" y="92" font-size="12" font-weight="700" fill="${C.acento}" letter-spacing="2">${esc(d.ahora.titulo.toUpperCase())}</text>
  <line x1="${x0dot}" y1="144" x2="${x1dot}" y2="144" stroke="rgba(142,197,252,0.3)" stroke-width="2"/>
  ${nodos}
  <circle r="5" fill="${C.acento}">
    <animate attributeName="cx" values="${x0dot};${x1dot}" dur="3.1s" repeatCount="indefinite"/>
    <animate attributeName="cy" values="144;144" dur="3.1s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur="3.1s" repeatCount="indefinite"/>
  </circle>
  ${envolver(d.ahora.refuerzo, derW - 48, 13.5, 500).map((l, i) => `<text x="${derX + 24}" y="${212 + i * 20}" font-size="13.5" font-weight="500" fill="#dbe4f0" class="ent" style="animation-delay:.9s">${esc(l)}</text>`).join('')}
  ${notaDer.map((l, i) => `<text x="${derX + 24}" y="${252 + i * 19}" font-size="13" fill="${C.suave}" class="ent" style="animation-delay:.7s">${esc(l)}</text>`).join('')}
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${C.borde}"/>`

  const estilos = `
.pulso{animation:pulso 1.6s ease-in-out infinite}
@keyframes pulso{0%,100%{opacity:.25}40%{opacity:1}60%{opacity:.4}}
.apaga{animation:apaga 1s ease-out 3.2s forwards}
@keyframes apaga{from{opacity:1}to{opacity:.42}}
.tacha{animation:tacha 1s cubic-bezier(.22,.7,.3,1) 3.2s forwards}
@keyframes tacha{to{stroke-dashoffset:0}}
.destello{opacity:0;animation:destello 3.1s linear infinite}
@keyframes destello{0%{opacity:0}4%{opacity:1}16%{opacity:0}100%{opacity:0}}`

  const desc = `${d.titulo}. Antes: ${d.antes.elementos.join(', ')}. ${d.antes.nota} Ahora: ${d.ahora.estados.join(', ')}. ${d.ahora.refuerzo} ${d.ahora.nota}`
  return doc({ w, h, titulo: d.titulo, desc, estilos, cuerpo })
}

/* --------------------------------------------------------------- stack */
function stack () {
  const w = 1000
  const xLabel = 30, xChips = 214, anchoChips = w - xChips - 30
  let y = 40
  let cuerpo = ''
  let i = 0
  for (const fam of datos.stack) {
    const chips = filaChips(fam.items, xChips, y, anchoChips, { size: 13, alto: 30, pad: 12, delay0: 0.15 + i * 0.12 })
    cuerpo += `<text x="${xLabel}" y="${y + 20}" font-size="12.5" font-weight="700" fill="${C.acento}" letter-spacing="1.4" class="ent" style="animation-delay:${(0.1 + i * 0.12).toFixed(2)}s">${esc(fam.familia.toUpperCase())}</text>`
    cuerpo += chips.svg
    y += chips.alto + 16
    i++
  }
  const h = y + 14

  const cuerpoCompleto = `
<defs>
  <clipPath id="marco"><rect x="0" y="0" width="${w}" height="${h}" rx="16"/></clipPath>
  <linearGradient id="brillo" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#8ec5fc" stop-opacity="0"/>
    <stop offset="50%" stop-color="#8ec5fc" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="#8ec5fc" stop-opacity="0"/>
  </linearGradient>
</defs>
<g clip-path="url(#marco)">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${C.tarjeta}"/>
  <rect class="brillo" x="-300" y="0" width="300" height="${h}" fill="url(#brillo)"/>
  ${cuerpo}
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${C.borde}"/>`

  const estilos = `
.brillo{animation:pasa 10s linear 1.4s infinite}
@keyframes pasa{from{transform:translateX(0)}to{transform:translateX(${w + 320}px)}}`

  const desc = datos.stack.map(f => `${f.familia}: ${f.items.join(', ')}`).join('. ')
  return doc({ w, h, titulo: 'Stack técnico', desc, estilos, cuerpo: cuerpoCompleto })
}

/* --------------------------------------------------------------- salida */
const salidas = [
  ['assets/hero.svg', hero()],
  ['assets/decision-determinista.svg', decision()],
  ['assets/stack.svg', stack()],
  ...datos.productos.map(p => [`assets/producto-${p.id}.svg`, tarjetaProducto(p)])
]

let difiere = false
for (const [ruta, contenido] of salidas) {
  const abs = join(raiz, ruta)
  if (COMPROBAR) {
    let actual = ''
    try { actual = readFileSync(abs, 'utf8') } catch {}
    if (actual !== contenido) { difiere = true; console.error(`desactualizado: ${ruta}`) }
  } else {
    writeFileSync(abs, contenido)
    console.log(`${ruta}  ${(contenido.length / 1024).toFixed(0)} KB`)
  }
}
if (COMPROBAR) {
  if (difiere) { console.error('\nLos SVG no coinciden con data/perfil.json. Ejecuta: node tools/build-svg.mjs'); process.exit(1) }
  console.log('los SVG estan al dia')
}
