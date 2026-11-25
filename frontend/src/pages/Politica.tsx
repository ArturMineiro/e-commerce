import { useEffect } from "react";
import { Card, Container } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { useConfigLoja } from "../hooks/useLoja";
import { Carregando } from "../components/Ui";
import { POLITICAS, textoPolitica, type TipoPolitica } from "../lib/politicas";
import NaoEncontrado from "./NaoEncontrado";

/** Trocas e devoluções / Política de privacidade (texto do dono ou o sugerido). */
function Politica() {
  const { tipo } = useParams();
  const { data: config, isLoading } = useConfigLoja();
  const politica = tipo && tipo in POLITICAS ? POLITICAS[tipo as TipoPolitica] : null;

  useEffect(() => {
    if (politica && config) document.title = `${politica.titulo} · ${config.nome_loja}`;
  }, [politica, config]);

  if (!politica) return <NaoEncontrado />;
  if (isLoading || !config) return <Carregando />;

  // Texto simples: cada bloco separado por linha em branco vira um parágrafo; a 1ª linha do bloco é o título
  const blocos = textoPolitica(tipo as TipoPolitica, config)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <Container className="py-4" style={{ maxWidth: 760 }}>
      <h1 className="h3 mb-1">{politica.titulo}</h1>
      <p className="text-muted mb-4">{config.nome_loja}</p>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 texto-politica">
          {blocos.map((bloco, i) => {
            const [primeira, ...resto] = bloco.split("\n");
            return resto.length > 0 ? (
              <section key={i} className="mb-3">
                <h2 className="h6 fw-bold mb-1">{primeira}</h2>
                <p className="mb-0">{resto.join("\n")}</p>
              </section>
            ) : (
              <p key={i}>{bloco}</p>
            );
          })}
        </Card.Body>
      </Card>
      <p className="small text-muted mt-3">
        Ficou com alguma dúvida? Fale com a loja pelos contatos do rodapé. Veja também{" "}
        {tipo === "trocas" ? (
          <Link to="/politicas/privacidade">a política de privacidade</Link>
        ) : (
          <Link to="/politicas/trocas">trocas e devoluções</Link>
        )}
        .
      </p>
    </Container>
  );
}

export default Politica;
