import { useMemo, useState } from "react";
import { Alert, Badge, Button, Col, Container, Form, Offcanvas, Row } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { FaSliders, FaXmark } from "react-icons/fa6";
import ProdutoCard from "../components/ProdutoCard";
import { GradeEsqueleto } from "../components/Ui";
import { useCategorias, useConfigLoja, useCores, useEspecificacoes, useProdutos } from "../hooks/useLoja";

/**
 * Catálogo com filtros na URL: ?busca= &categoria_id= &promocao=1 &destaque=1 &ordenar=
 * &cor_id= &tamanho= &esp-3=Seda&esp-3=Chiffon (especificações marcadas como filtro)
 */
function Produtos() {
  const [params, setParams] = useSearchParams();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { data: categorias = [] } = useCategorias();
  const { data: cores = [] } = useCores();
  const { data: especificacoes = [] } = useEspecificacoes();
  const { data: config } = useConfigLoja();

  const filtraveis = especificacoes.filter((e) => e.filtravel && e.opcoes.length);
  const tamanhos = useMemo(
    () => [...new Set((config?.grades_tamanho ?? []).flatMap((g) => g.valores))].slice(0, 30),
    [config?.grades_tamanho]
  );

  const esp: Record<string, string[]> = {};
  filtraveis.forEach((e) => {
    const valores = params.getAll(`esp-${e.id}`);
    if (valores.length) esp[String(e.id)] = valores;
  });

  const filtros = {
    busca: params.get("busca") ?? "",
    categoria_id: params.get("categoria_id") ?? "",
    promocao: params.get("promocao") === "1",
    destaque: params.get("destaque") === "1",
    ordenar: params.get("ordenar") ?? "",
    cor_id: params.get("cor_id") ?? "",
    tamanho: params.get("tamanho") ?? "",
    esp,
  };

  const { data: produtos = [], isLoading, isError, isFetching } = useProdutos(filtros);

  const alterar = (chave: string, valor: string | boolean) => {
    const novos = new URLSearchParams(params);
    if (valor === "" || valor === false) novos.delete(chave);
    else novos.set(chave, valor === true ? "1" : valor);
    setParams(novos, { replace: true });
  };

  const alternarEsp = (id: number, valor: string) => {
    const novos = new URLSearchParams(params);
    const chave = `esp-${id}`;
    const atuais = novos.getAll(chave);
    novos.delete(chave);
    (atuais.includes(valor) ? atuais.filter((v) => v !== valor) : [...atuais, valor]).forEach((v) => novos.append(chave, v));
    setParams(novos, { replace: true });
  };

  const limparTudo = () => {
    const novos = new URLSearchParams();
    if (filtros.busca) novos.set("busca", filtros.busca);
    setParams(novos, { replace: true });
  };

  const qtdFiltros =
    Object.values(esp).reduce((s, v) => s + v.length, 0) +
    [filtros.categoria_id, filtros.cor_id, filtros.tamanho].filter(Boolean).length +
    [filtros.promocao, filtros.destaque].filter(Boolean).length;

  const categoriaAtual = categorias.find((c) => String(c.id) === filtros.categoria_id);
  const titulo = filtros.busca
    ? `Resultados para "${filtros.busca}"`
    : categoriaAtual?.nome ?? (filtros.promocao ? "Promoções" : filtros.destaque ? "Destaques" : "Todos os produtos");

  const painelFiltros = (
    <>
      <Form.Group className="mb-3" controlId="filtro-categoria">
        <Form.Label className="fw-semibold">Categoria</Form.Label>
        <Form.Select value={filtros.categoria_id} onChange={(e) => alterar("categoria_id", e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3" controlId="filtro-ordem">
        <Form.Label className="fw-semibold">Ordenar por</Form.Label>
        <Form.Select value={filtros.ordenar} onChange={(e) => alterar("ordenar", e.target.value)}>
          <option value="">Mais recentes</option>
          <option value="menor_preco">Menor preço</option>
          <option value="maior_preco">Maior preço</option>
          <option value="nome">Nome (A-Z)</option>
        </Form.Select>
      </Form.Group>

      {cores.length > 0 && (
        <fieldset className="mb-3">
          <legend className="fw-semibold fs-6">Cor</legend>
          <div className="d-flex flex-wrap gap-2">
            {cores.map((c) => {
              const ativa = filtros.cor_id === String(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`filtro-cor ${ativa ? "ativo" : ""}`}
                  onClick={() => alterar("cor_id", ativa ? "" : String(c.id))}
                  aria-pressed={ativa}
                  title={c.nome}
                >
                  <span className="bolinha-cor" style={{ backgroundColor: c.codigo_hex ?? "#ccc" }} />
                  <span className="visually-hidden">{c.nome}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {tamanhos.length > 0 && (
        <fieldset className="mb-3">
          <legend className="fw-semibold fs-6">Tamanho</legend>
          <div className="d-flex flex-wrap gap-2">
            {tamanhos.map((t) => {
              const ativo = filtros.tamanho === t;
              return (
                <button type="button" key={t} className={`filtro-chip ${ativo ? "ativo" : ""}`} onClick={() => alterar("tamanho", ativo ? "" : t)} aria-pressed={ativo}>
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {filtraveis.map((e) => (
        <fieldset className="mb-3" key={e.id}>
          <legend className="fw-semibold fs-6">{e.nome}</legend>
          <div className="d-flex flex-wrap gap-2">
            {e.opcoes.map((o) => {
              const ativo = esp[String(e.id)]?.includes(o) ?? false;
              return (
                <button type="button" key={o} className={`filtro-chip ${ativo ? "ativo" : ""}`} onClick={() => alternarEsp(e.id, o)} aria-pressed={ativo}>
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <Form.Check type="switch" id="filtro-promocao" label="Somente promoções" checked={filtros.promocao} onChange={(e) => alterar("promocao", e.target.checked)} />
      <Form.Check type="switch" id="filtro-destaque" label="Somente destaques" checked={filtros.destaque} onChange={(e) => alterar("destaque", e.target.checked)} />

      {(qtdFiltros > 0 || filtros.busca) && (
        <div className="d-flex gap-3 mt-3">
          {qtdFiltros > 0 && (
            <button type="button" className="btn btn-link px-0" onClick={limparTudo}>
              Limpar filtros
            </button>
          )}
          {filtros.busca && (
            <button type="button" className="btn btn-link px-0" onClick={() => alterar("busca", "")}>
              Limpar busca
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h3 fw-bold titulo-secao mb-0">{titulo}</h1>
        <Button variant="outline-secondary" className="d-lg-none flex-shrink-0" onClick={() => setFiltrosAbertos(true)}>
          <FaSliders className="me-1" aria-hidden /> Filtrar {qtdFiltros > 0 && <Badge bg="secondary">{qtdFiltros}</Badge>}
        </Button>
      </div>

      <Row className="g-4">
        <Col lg={3} className="d-none d-lg-block">
          <div className="bg-white rounded-4 shadow-sm p-3 position-sticky" style={{ top: 120 }}>
            {painelFiltros}
          </div>
        </Col>

        <Col lg={9}>
          {isLoading ? (
            <GradeEsqueleto quantidade={6} />
          ) : isError ? (
            <Alert variant="danger">Não foi possível carregar os produtos.</Alert>
          ) : produtos.length === 0 ? (
            <Alert variant="light" className="text-center border">
              Nenhum produto encontrado.
              {qtdFiltros > 0 && (
                <>
                  {" "}
                  <button type="button" className="btn btn-link p-0 align-baseline" onClick={limparTudo}>
                    Limpar filtros
                  </button>
                </>
              )}
            </Alert>
          ) : (
            <>
              <p className="text-muted small" aria-live="polite">
                {produtos.length} produto(s) {isFetching && "· atualizando..."}
              </p>
              <Row xs={2} md={3} className="g-3 g-md-4">
                {produtos.map((p) => (
                  <Col key={p.id}>
                    <ProdutoCard produto={p} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Col>
      </Row>

      <Offcanvas show={filtrosAbertos} onHide={() => setFiltrosAbertos(false)} placement="bottom" className="filtros-celular">
        <Offcanvas.Header>
          <Offcanvas.Title>Filtros</Offcanvas.Title>
          <Button variant="link" className="text-body p-1" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros">
            <FaXmark />
          </Button>
        </Offcanvas.Header>
        <Offcanvas.Body>{painelFiltros}</Offcanvas.Body>
        <div className="p-3 border-top">
          <Button className="btn-loja w-100" size="lg" onClick={() => setFiltrosAbertos(false)}>
            Ver {produtos.length} produto(s)
          </Button>
        </div>
      </Offcanvas>
    </Container>
  );
}

export default Produtos;
