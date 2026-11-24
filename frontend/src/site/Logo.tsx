import { useId } from "react";
import { MARCA } from "./marca";

/** Símbolo da plataforma: sacola de compras com um "L" vazado, em degradê. */
export function SimboloMarca({ tamanho = 36 }: { tamanho?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`g-${id}`} x1="4" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C3AED" />
          <stop offset="0.55" stopColor="#DB2777" />
          <stop offset="1" stopColor="#FB923C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#g-${id})`} />
      <path d="M19 19.5v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M13.8 19.5h20.4l-1.5 15.3a3.4 3.4 0 0 1-3.4 3.1H18.7a3.4 3.4 0 0 1-3.4-3.1z" fill="#fff" />
      <path d="M21.2 25.2v7.3h6.4" fill="none" stroke={`url(#g-${id})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo completo: símbolo + nome. */
function Logo({ tamanho = 34, claro = false }: { tamanho?: number; claro?: boolean }) {
  return (
    <span className={`logo-marca ${claro ? "claro" : ""}`}>
      <SimboloMarca tamanho={tamanho} />
      <span className="logo-marca-nome" style={{ fontSize: tamanho * 0.72 }}>
        {MARCA.nome.toLowerCase()}
      </span>
    </span>
  );
}

export default Logo;
