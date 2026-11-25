import { FaMinus, FaPlus } from "react-icons/fa6";

/** Quantidade com botões − e + (fáceis de tocar no celular). */
function SeletorQuantidade({
  valor,
  max,
  onChange,
  disabled = false,
  rotulo,
}: {
  valor: number;
  max?: number;
  onChange: (valor: number) => void;
  disabled?: boolean;
  /** ex.: "Quantidade de Kurti Bordado" */
  rotulo: string;
}) {
  const limite = max && max > 0 ? max : Infinity;
  return (
    <div className="seletor-quantidade" role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onChange(valor - 1)} disabled={disabled || valor <= 1} aria-label="Diminuir quantidade">
        <FaMinus aria-hidden />
      </button>
      <output aria-live="polite" aria-label="Quantidade">
        {valor}
      </output>
      <button type="button" onClick={() => onChange(valor + 1)} disabled={disabled || valor >= limite} aria-label="Aumentar quantidade">
        <FaPlus aria-hidden />
      </button>
    </div>
  );
}

export default SeletorQuantidade;
