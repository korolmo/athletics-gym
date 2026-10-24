// Рисунок страницы 404 — линии жёлтым по макету Stitch: блин штанги вместо нуля. Только украшение: код ошибки назван текстом в плашке над рисунком.

const Y = "#F5E642";

/** `id` — своё у каждого рисунка на странице: у 404 их два (ru и kk), и ссылка на градиент скрытой версии не рисуется. */
export function Art404({ id }: { id: string }) {
  const stroke = `err-404-stroke-${id}`;
  return (
    <svg viewBox="0 0 680 240" fill="none" aria-hidden="true" className="h-auto w-full max-w-[680px]">
      <defs>
        <linearGradient id={stroke} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={Y} stopOpacity="0.95" />
          <stop offset="100%" stopColor={Y} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <g opacity="0.35" stroke={Y}>
        <line x1="20" y1="120" x2="660" y2="120" strokeWidth="2" strokeDasharray="8 6" />
        <line x1="80" y1="102" x2="80" y2="138" strokeWidth="2.5" />
        <line x1="600" y1="102" x2="600" y2="138" strokeWidth="2.5" />
      </g>
      <text x="50" y="195" className="font-site" fontSize="220" fontWeight="800" stroke={`url(#${stroke})`} strokeWidth="2.5">
        4
      </text>
      <text x="440" y="195" className="font-site" fontSize="220" fontWeight="800" stroke={`url(#${stroke})`} strokeWidth="2.5">
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
