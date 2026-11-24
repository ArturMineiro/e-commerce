import { useState } from "react";
import { Badge, Button, Form, InputGroup } from "react-bootstrap";
import { FaPlus, FaXmark } from "react-icons/fa6";

/**
 * Lista de valores editável como "etiquetas": digite e aperte Enter (ou vírgula).
 * Colar "P, M, G" adiciona os três de uma vez.
 */
function EditorChips({
  valores,
  onChange,
  placeholder = "Digite e aperte Enter",
  rotulo,
  id,
}: {
  valores: string[];
  onChange: (valores: string[]) => void;
  placeholder?: string;
  rotulo?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState("");

  const adicionar = (entrada: string) => {
    const novos = entrada
      .split(/[,;\n]/)
      .map((v) => v.trim())
      .filter((v) => v && !valores.some((x) => x.toLowerCase() === v.toLowerCase()));
    if (novos.length) onChange([...valores, ...novos]);
    setTexto("");
  };

  return (
    <div>
      {valores.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {valores.map((v) => (
            <Badge key={v} bg="light" text="dark" className="border d-inline-flex align-items-center gap-1 fw-normal fs-6 py-2 px-2">
              {v}
              <button
                type="button"
                className="btn btn-link p-0 text-danger lh-1"
                onClick={() => onChange(valores.filter((x) => x !== v))}
                aria-label={`Remover ${v}`}
              >
                <FaXmark />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <InputGroup>
        <Form.Control
          id={id}
          value={texto}
          placeholder={placeholder}
          aria-label={rotulo ?? placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]/.test(v)) adicionar(v);
            else setTexto(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar(texto);
            }
          }}
          onPaste={(e) => {
            const colado = e.clipboardData.getData("text");
            if (/[,;\n]/.test(colado)) {
              e.preventDefault();
              adicionar(colado);
            }
          }}
        />
        <Button variant="outline-secondary" onClick={() => adicionar(texto)} disabled={!texto.trim()} aria-label="Adicionar">
          <FaPlus />
        </Button>
      </InputGroup>
    </div>
  );
}

export default EditorChips;
