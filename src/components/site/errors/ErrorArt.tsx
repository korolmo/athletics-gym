// Рисунки страниц ошибок — линии жёлтым по макетам Stitch: блин штанги вместо нуля (404),
// блин с гантелью и ключом (503). Только украшение: код ошибки назван текстом в плашке над рисунком.

const Y = "#F5E642";

export function Art404() {
  return (
    <svg viewBox="0 0 680 240" fill="none" aria-hidden="true" className="h-auto w-full max-w-[680px]">
      <defs>
        <linearGradient id="err-404-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={Y} stopOpacity="0.95" />
          <stop offset="100%" stopColor={Y} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <g opacity="0.35" stroke={Y}>
        <line x1="20" y1="120" x2="660" y2="120" strokeWidth="2" strokeDasharray="8 6" />
        <line x1="80" y1="102" x2="80" y2="138" strokeWidth="2.5" />
        <line x1="600" y1="102" x2="600" y2="138" strokeWidth="2.5" />
      </g>
      <text x="50" y="195" className="font-site" fontSize="220" fontWeight="800" stroke="url(#err-404-stroke)" strokeWidth="2.5">
        4
      </text>
      <text x="440" y="195" className="font-site" fontSize="220" fontWeight="800" stroke="url(#err-404-stroke)" strokeWidth="2.5">
        4
      </text>
      <g transform="translate(340 120)">
        <circle r="102" fill="#131315" stroke="#2E2E33" strokeWidth="1.5" />
        <circle r="94" fill="#1F1F23" stroke={Y} strokeWidth="2.5" />
        <circle r="82" stroke="#2E2E33" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle r="54" fill="#131315" stroke={Y} strokeWidth="1.5" />
        <circle r="22" fill="#0E0E10" stroke={Y} strokeWidth="2" />
        <circle r="12" fill={Y} />
        <path d="M-80 0h24M56 0h24M0 -80v24M0 56v24" stroke={Y} strokeWidth="1.5" opacity="0.6" />
        <text y="-30" textAnchor="middle" className="font-site" fontSize="10" fontWeight="800" letterSpacing="1.5" fill={Y}>
          ATHLETIC&apos;S
        </text>
        <text y="40" textAnchor="middle" className="font-site" fontSize="12" fontWeight="800" letterSpacing="1.5" fill="#E5E1E4">
          25 KG
        </text>
      </g>
    </svg>
  );
}

export function Art503() {
  return (
    <div aria-hidden="true" className="relative flex h-56 w-56 items-center justify-center">
      <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
        <circle cx="100" cy="100" r="92" stroke="#2A2A2C" strokeWidth="3" strokeDasharray="14 4" />
        <circle cx="100" cy="100" r="82" stroke="#1F1F21" strokeWidth="8" />
        <circle cx="100" cy="100" r="74" stroke="#2A2A2C" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="54" stroke="#1B1B1D" strokeWidth="10" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="26" fill="#131315" stroke="#353437" strokeWidth="2" />
        {/* Гантель */}
        <g stroke={Y} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="60" y1="140" x2="140" y2="60" />
          <rect x="52" y="130" width="16" height="6" rx="2" fill="#131315" transform="rotate(-45 52 130)" />
          <rect x="44" y="138" width="16" height="6" rx="2" fill="#131315" transform="rotate(-45 44 138)" />
          <rect x="132" y="50" width="16" height="6" rx="2" fill="#131315" transform="rotate(-45 132 50)" />
          <rect x="140" y="42" width="16" height="6" rx="2" fill="#131315" transform="rotate(-45 140 42)" />
        </g>
        {/* Ключ */}
        <g stroke={Y} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#131315">
          <line x1="68" y1="68" x2="132" y2="132" strokeWidth="3" />
          <path d="M58 48c-10 10-6 26 6 26l8-8c-4-4-6-8-2-12l-8-8Z" />
          <circle cx="140" cy="140" r="8" />
        </g>
        <circle cx="100" cy="100" r="10" fill="#0E0E10" stroke={Y} strokeWidth="2" />
        <circle cx="100" cy="100" r="4" fill={Y} />
      </svg>
      <span className="text-label-uppercase absolute -bottom-2 rounded-sm bg-surface-card px-2 py-0.5 uppercase tracking-widest text-primary-container shadow-md">
        503
      </span>
    </div>
  );
}
