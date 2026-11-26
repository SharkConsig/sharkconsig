"use client"

import React from "react"

export function ChristmasDashboardBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-x-0 top-0 z-0 overflow-hidden"
    >
      {/* Topo festivo inspirado no cenário natalino (sem texto e sem fundo verde) */}
      <div className="relative w-full h-[310px] sm:h-[340px] lg:h-[360px] opacity-85">
        <svg
          viewBox="0 0 1600 360"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>

            <radialGradient id="xmas-window-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.2" />
            </radialGradient>

            <radialGradient id="xmas-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="xmas-pine-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#427664" />
              <stop offset="100%" stopColor="#1B4336" />
            </linearGradient>

            <linearGradient id="xmas-pine-mid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5D927E" />
              <stop offset="100%" stopColor="#235444" />
            </linearGradient>

            <linearGradient id="xmas-pine-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F29B9B" />
              <stop offset="55%" stopColor="#C94A4A" />
              <stop offset="100%" stopColor="#8F2828" />
            </linearGradient>

            <linearGradient id="xmas-house-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B92525" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>

            <linearGradient id="xmas-snow-roof" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DCE6EE" />
            </linearGradient>
          </defs>

          {/* Ramos de pinheiro e flocos sutis nos cantos superiores */}
          <g opacity="0.82">
            {/* Canto superior direito */}
            <path d="M1260 0 Q1330 34 1420 12 Q1490 42 1600 6 L1600 0 Z" fill="#16352E" />
            <path d="M1320 0 Q1385 45 1470 22 Q1535 48 1600 18 L1600 0 Z" fill="#1E4A3E" />
            <path d="M1355 18 L1344 38 M1370 22 L1362 44 M1405 16 L1398 39 M1450 20 L1444 46 M1495 24 L1490 44 M1545 16 L1540 38" stroke="#316A58" strokeWidth="2.5" strokeLinecap="round" />
            {/* Flocos pendurados */}
            <line x1="1390" y1="18" x2="1390" y2="46" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.65" />
            <g transform="translate(1390, 56)" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
              <line x1="-10" y1="0" x2="10" y2="0" />
              <line x1="0" y1="-10" x2="0" y2="10" />
              <line x1="-7" y1="-7" x2="7" y2="7" />
              <line x1="-7" y1="7" x2="7" y2="-7" />
            </g>
            <line x1="1528" y1="14" x2="1528" y2="36" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.65" />
            <g transform="translate(1528, 44)" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" opacity="0.8">
              <line x1="-7" y1="0" x2="7" y2="0" />
              <line x1="0" y1="-7" x2="0" y2="7" />
              <line x1="-5" y1="-5" x2="5" y2="5" />
              <line x1="-5" y1="5" x2="5" y2="-5" />
            </g>

            {/* Canto superior esquerdo */}
            <path d="M0 0 L240 0 Q175 26 98 14 Q45 32 0 18 Z" fill="#173830" />
            <line x1="112" y1="12" x2="112" y2="36" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.6" />
            <g transform="translate(112, 44)" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
              <line x1="-7" y1="0" x2="7" y2="0" />
              <line x1="0" y1="-7" x2="0" y2="7" />
              <line x1="-5" y1="-5" x2="5" y2="5" />
              <line x1="-5" y1="5" x2="5" y2="-5" />
            </g>
          </g>

          {/* Pontinhos de neve suaves no céu */}
          <g fill="#94A3B8" opacity="0.45">
            <circle cx="84" cy="95" r="2" />
            <circle cx="215" cy="68" r="1.8" />
            <circle cx="348" cy="120" r="2.2" />
            <circle cx="510" cy="76" r="1.6" />
            <circle cx="675" cy="92" r="2" />
            <circle cx="825" cy="54" r="1.7" />
            <circle cx="965" cy="88" r="2.2" />
            <circle cx="1115" cy="64" r="1.8" />
            <circle cx="1245" cy="108" r="2.2" />
            <circle cx="1370" cy="116" r="1.7" />
            <circle cx="1475" cy="88" r="2.1" />
            <circle cx="1560" cy="128" r="1.8" />
            <circle cx="165" cy="164" r="1.6" />
            <circle cx="755" cy="148" r="1.9" />
            <circle cx="1175" cy="154" r="1.6" />
          </g>

          {/* Estrelinhas douradas discretas */}
          <g fill="#D97706" opacity="0.72">
            <path d="M275 138 L277 144 L283 144 L278 148 L280 154 L275 150 L270 154 L272 148 L267 144 L273 144 Z" />
            <path d="M1285 132 L1287 138 L1293 138 L1288 142 L1290 148 L1285 144 L1280 148 L1282 142 L1277 138 L1283 138 Z" />
            <path d="M1445 148 L1446.5 152.5 L1451 152.5 L1447.5 155.5 L1449 160 L1445 157 L1441 160 L1442.5 155.5 L1439 152.5 L1443.5 152.5 Z" />
          </g>

          {/* Floco decorativo à direita (como na imagem) */}
          <g transform="translate(1505, 134)" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity="0.7">
            <line x1="-16" y1="0" x2="16" y2="0" />
            <line x1="0" y1="-16" x2="0" y2="16" />
            <line x1="-11" y1="-11" x2="11" y2="11" />
            <line x1="-11" y1="11" x2="11" y2="-11" />
            <circle cx="0" cy="0" r="3.5" fill="#E2E8F0" />
          </g>

          {/* ================= VILA NATALINA ================= */}
          {/* Árvores de fundo (esquerda) */}
          <g>
            <polygon points="95,212 52,326 138,326" fill="url(#xmas-pine-dark)" />
            <polygon points="95,212 72,262 118,262" fill="#E2EFEA" opacity="0.35" />

            <polygon points="175,232 138,326 212,326" fill="url(#xmas-pine-mid)" />
            <polygon points="175,232 155,274 195,274" fill="#F1F5F9" opacity="0.32" />

            <polygon points="278,176 218,326 338,326" fill="url(#xmas-pine-dark)" />
            <polygon points="278,176 244,242 312,242" fill="#E2EFEA" opacity="0.35" />
            <polygon points="278,220 234,278 322,278" fill="#E2EFEA" opacity="0.22" />
          </g>

          {/* Mini casinhas decorativas à esquerda */}
          <g transform="translate(212, 294)">
            <rect x="2" y="12" width="26" height="22" rx="2" fill="#D97757" />
            <polygon points="0,14 15,0 30,14" fill="url(#xmas-snow-roof)" />
            <rect x="11" y="20" width="8" height="14" rx="1" fill="#FDE68A" />
          </g>
          <g transform="translate(268, 290)">
            <rect x="2" y="13" width="32" height="24" rx="2" fill="#B91C1C" />
            <polygon points="0,15 18,0 36,15" fill="url(#xmas-snow-roof)" />
            <rect x="13" y="21" width="10" height="16" rx="1.5" fill="url(#xmas-window-glow)" />
          </g>

          {/* CASINHA PRINCIPAL ESQUERDA */}
          <g transform="translate(362, 162)">
            {/* Halo luminoso quente */}
            <ellipse cx="115" cy="115" rx="110" ry="70" fill="url(#xmas-halo)" />

            {/* Ala esquerda menor */}
            <rect x="0" y="92" width="82" height="74" rx="3" fill="url(#xmas-house-wall)" />
            {/* Chaminé esquerda */}
            <rect x="18" y="62" width="16" height="32" rx="2" fill="#991B1B" />
            <rect x="16" y="59" width="20" height="6" rx="3" fill="#FFFFFF" />
            {/* Telhado ala esquerda */}
            <path d="M-8 98 Q38 66 84 94 L84 106 Q38 80 -4 108 Z" fill="url(#xmas-snow-roof)" />
            {/* Janela ala esquerda */}
            <rect x="18" y="114" width="36" height="34" rx="3" fill="url(#xmas-window-glow)" stroke="#7F1D1D" strokeWidth="2.5" />
            <line x1="36" y1="114" x2="36" y2="148" stroke="#7F1D1D" strokeWidth="2" />
            <line x1="18" y1="131" x2="54" y2="131" stroke="#7F1D1D" strokeWidth="2" />

            {/* Corpo central com empena alta */}
            <polygon points="74,72 138,10 202,72 202,166 74,166" fill="url(#xmas-house-wall)" />
            {/* Neve espessa do telhado central */}
            <path
              d="M64 78 L132 10 Q138 4 144 10 L212 78 Q216 86 206 90 Q198 92 192 84 L138 28 L84 84 Q78 92 70 90 Q60 86 64 78 Z"
              fill="url(#xmas-snow-roof)"
            />
            {/* Janela superior arqueada */}
            <path d="M116 74 A22 22 0 0 1 160 74 L160 96 L116 96 Z" fill="url(#xmas-window-glow)" stroke="#7F1D1D" strokeWidth="2.5" />
            <line x1="138" y1="52" x2="138" y2="96" stroke="#7F1D1D" strokeWidth="2" />
            <line x1="116" y1="76" x2="160" y2="76" stroke="#7F1D1D" strokeWidth="2" />

            {/* Plaquinha decorativa na fachada */}
            <rect x="95" y="106" width="86" height="14" rx="3" fill="#681414" stroke="#E2E8F0" strokeWidth="1" strokeOpacity="0.4" />

            {/* Portas iluminadas */}
            <rect x="92" y="126" width="40" height="40" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <rect x="144" y="126" width="40" height="40" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <line x1="112" y1="126" x2="112" y2="166" stroke="#681414" strokeWidth="2" />
            <line x1="164" y1="126" x2="164" y2="166" stroke="#681414" strokeWidth="2" />
          </g>

          {/* Pinheiros centrais (entre as duas casas) */}
          <g>
            {/* Pinheiro em camadas verde */}
            <polygon points="650,218 598,326 702,326" fill="#215544" />
            <polygon points="650,218 612,262 688,262" fill="#3B7864" />
            <polygon points="650,218 628,242 672,242" fill="#E2EFEA" opacity="0.55" />
            <polygon points="650,252 606,294 694,294" fill="#DCECE6" opacity="0.28" />

            {/* Pinheiro alto atrás */}
            <polygon points="755,188 708,326 802,326" fill="url(#xmas-pine-dark)" />
            <polygon points="755,188 730,248 780,248" fill="#E2EFEA" opacity="0.35" />

            {/* Pinheiro vermelho nevado (destaque da imagem) */}
            <polygon points="824,226 776,326 872,326" fill="url(#xmas-pine-red)" />
            <polygon points="824,226 798,268 850,268" fill="#FDE2E2" opacity="0.52" />
            <polygon points="824,256 788,296 860,296" fill="#FEE2E2" opacity="0.32" />

            {/* Pinheiro direito do centro */}
            <polygon points="895,252 862,326 928,326" fill="url(#xmas-pine-mid)" />
            <polygon points="895,252 878,286 912,286" fill="#F1F5F9" opacity="0.35" />
          </g>

          {/* Pequenos presentes e rena decorativa no centro */}
          <g transform="translate(612, 311)">
            <rect x="0" y="4" width="14" height="12" rx="1.5" fill="#DC2626" />
            <rect x="5" y="4" width="4" height="12" fill="#FBBF24" />
            <rect x="18" y="6" width="12" height="10" rx="1.5" fill="#16A34A" />
            <rect x="22" y="6" width="3.5" height="10" fill="#F8FAFC" />
          </g>

          {/* CASINHA PRINCIPAL DIREITA (CHALÉ MAIOR) */}
          <g transform="translate(940, 144)">
            {/* Halo luminoso quente */}
            <ellipse cx="165" cy="120" rx="165" ry="78" fill="url(#xmas-halo)" />

            {/* Chaminés */}
            <rect x="44" y="6" width="24" height="44" rx="2" fill="#991B1B" />
            <rect x="41" y="2" width="30" height="7" rx="3.5" fill="#FFFFFF" />
            <rect x="142" y="20" width="22" height="36" rx="2" fill="#991B1B" />
            <rect x="139" y="17" width="28" height="6" rx="3" fill="#FFFFFF" />
            <rect x="250" y="54" width="22" height="44" rx="2" fill="#991B1B" />
            <rect x="247" y="51" width="28" height="6" rx="3" fill="#FFFFFF" />

            {/* Corpo principal esquerdo */}
            <polygon points="20,76 105,12 190,76 190,184 20,184" fill="url(#xmas-house-wall)" />
            {/* Corpo anexo direito */}
            <rect x="184" y="88" width="122" height="96" rx="3" fill="url(#xmas-house-wall)" />

            {/* Telhado principal nevado */}
            <path
              d="M8 78 L98 10 Q105 4 112 10 L200 76 Q204 84 194 88 Q186 90 180 82 L105 26 L26 84 Q18 90 10 86 Q4 83 8 78 Z"
              fill="url(#xmas-snow-roof)"
            />

            {/* Beiral espesso de neve central */}
            <path
              d="M16 118 Q70 112 145 124 Q225 110 314 116 Q320 124 312 132 Q278 136 250 132 Q212 138 175 132 Q125 136 82 130 Q36 135 16 128 Z"
              fill="url(#xmas-snow-roof)"
            />

            {/* Janelas superiores */}
            <rect x="64" y="82" width="40" height="24" rx="2" fill="url(#xmas-window-glow)" stroke="#7F1D1D" strokeWidth="2.5" />
            <rect x="110" y="82" width="40" height="24" rx="2" fill="url(#xmas-window-glow)" stroke="#7F1D1D" strokeWidth="2.5" />
            <line x1="84" y1="82" x2="84" y2="106" stroke="#7F1D1D" strokeWidth="1.8" />
            <line x1="130" y1="82" x2="130" y2="106" stroke="#7F1D1D" strokeWidth="1.8" />

            {/* Janelas e porta inferiores */}
            <rect x="38" y="142" width="46" height="36" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <line x1="61" y1="142" x2="61" y2="178" stroke="#681414" strokeWidth="2" />
            <line x1="38" y1="160" x2="84" y2="160" stroke="#681414" strokeWidth="2" />

            <rect x="104" y="140" width="38" height="44" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <line x1="123" y1="140" x2="123" y2="184" stroke="#681414" strokeWidth="2" />

            <rect x="164" y="142" width="52" height="36" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <line x1="190" y1="142" x2="190" y2="178" stroke="#681414" strokeWidth="2" />
            <line x1="164" y1="160" x2="216" y2="160" stroke="#681414" strokeWidth="2" />

            <rect x="234" y="142" width="52" height="36" rx="2" fill="url(#xmas-window-glow)" stroke="#681414" strokeWidth="2.5" />
            <line x1="260" y1="142" x2="260" y2="178" stroke="#681414" strokeWidth="2" />
            <line x1="234" y1="160" x2="286" y2="160" stroke="#681414" strokeWidth="2" />
          </g>

          {/* Mini rena estilizada na frente da casa direita */}
          <g transform="translate(1224, 304)" fill="#B91C1C">
            <rect x="2" y="10" width="18" height="8" rx="3" />
            <rect x="3" y="16" width="3" height="10" rx="1" />
            <rect x="16" y="16" width="3" height="10" rx="1" />
            <rect x="16" y="3" width="5" height="9" rx="2" />
            <ellipse cx="21" cy="3" rx="4.5" ry="3" />
            <path d="M18 1 L15 -4 M21 1 L23 -4" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Pinheiros à direita */}
          <g>
            <polygon points="1282,250 1248,326 1316,326" fill="url(#xmas-pine-mid)" />
            <polygon points="1282,250 1265,286 1299,286" fill="#F1F5F9" opacity="0.38" />

            <polygon points="1352,226 1310,326 1394,326" fill="url(#xmas-pine-dark)" />
            <polygon points="1352,226 1330,272 1374,272" fill="#E2EFEA" opacity="0.34" />

            <polygon points="1450,184 1396,326 1504,326" fill="#7D6B58" />
            <polygon points="1450,184 1422,248 1478,248" fill="#F1F5F9" opacity="0.42" />
            <polygon points="1450,224 1412,282 1488,282" fill="#F1F5F9" opacity="0.22" />

            <polygon points="1536,248 1504,326 1568,326" fill="url(#xmas-pine-mid)" />
            <polygon points="1536,248 1518,285 1554,285" fill="#F1F5F9" opacity="0.34" />
          </g>

          {/* Mini casinha extrema direita */}
          <g transform="translate(1550, 294)">
            <rect x="2" y="12" width="26" height="22" rx="2" fill="#C97C5D" />
            <polygon points="0,14 15,0 30,14" fill="url(#xmas-snow-roof)" />
            <rect x="11" y="20" width="8" height="14" rx="1" fill="#FDE68A" />
          </g>

          {/* Pequenas árvores na frente esquerda para profundidade */}
          <g>
            <polygon points="48,274 20,326 76,326" fill="url(#xmas-pine-mid)" />
            <polygon points="350,276 326,326 374,326" fill="url(#xmas-pine-mid)" />
            <polygon points="562,272 536,326 588,326" fill="url(#xmas-pine-mid)" />
          </g>

          {/* ================= CAMADA DE NEVE SOBRE O FUNDO ORIGINAL ================= */}
          {/* Plataforma de neve fofa com recorte ondulado na base */}
          <path
            d="M0 322 Q120 315 260 321 Q440 314 620 322 Q820 315 1020 322 Q1240 314 1440 321 Q1530 318 1600 322 L1600 342 Q1560 348 1515 340 Q1470 348 1420 339 Q1365 347 1310 340 Q1250 349 1190 341 Q1135 348 1075 340 Q1015 349 950 341 Q890 348 825 340 Q760 349 695 341 Q630 348 565 340 Q500 349 435 341 Q370 348 305 340 Q240 349 175 341 Q110 348 50 340 Q20 345 0 341 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
          <path
            d="M0 334 Q180 330 360 335 Q560 330 780 335 Q1020 330 1260 335 Q1440 330 1600 334 L1600 342 Q1560 348 1515 340 Q1470 348 1420 339 Q1365 347 1310 340 Q1250 349 1190 341 Q1135 348 1075 340 Q1015 349 950 341 Q890 348 825 340 Q760 349 695 341 Q630 348 565 340 Q500 349 435 341 Q370 348 305 340 Q240 349 175 341 Q110 348 50 340 Q20 345 0 341 Z"
            fill="#CBD5E1"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  )
}
