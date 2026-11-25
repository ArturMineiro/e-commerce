import { useState } from "react";
import { FaRegStar, FaStar, FaStarHalfStroke } from "react-icons/fa6";

/** Estrelas de 0 a 5 (meia estrela quando a média pede). */
export function Estrelas({ nota, className = "" }: { nota: number; className?: string }) {
  const texto = nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <span className={`estrelas ${className}`} role="img" aria-label={`${texto} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) =>
        nota >= i - 0.25 ? <FaStar key={i} aria-hidden /> : nota >= i - 0.75 ? <FaStarHalfStroke key={i} aria-hidden /> : <FaRegStar key={i} aria-hidden />
      )}
    </span>
  );
}

const ROTULOS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

/** Escolher de 1 a 5 estrelas (grupo de rádio acessível pelo teclado e pelo toque). */
export function EscolherEstrelas({ valor, onChange }: { valor: number; onChange: (nota: number) => void }) {
  const [destaque, setDestaque] = useState(0);
  const mostrado = destaque || valor;

  return (
    <div className="escolher-estrelas" role="radiogroup" aria-label="Sua nota" onMouseLeave={() => setDestaque(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}: ${ROTULOS[n]}`}
          className={n <= mostrado ? "cheia" : ""}
          onClick={() => onChange(n)}
          onMouseEnter={() => setDestaque(n)}
        >
          {n <= mostrado ? <FaStar aria-hidden /> : <FaRegStar aria-hidden />}
        </button>
      ))}
      <span className="small text-muted ms-2">{ROTULOS[mostrado]}</span>
    </div>
  );
}
