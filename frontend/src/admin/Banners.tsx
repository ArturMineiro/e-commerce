import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, ButtonGroup, Card, Col, Form, Row } from "react-bootstrap";
import { FaMobileScreenButton, FaPen, FaTrash } from "react-icons/fa6";
import {
  useAtualizarBanner,
  useBannersAdmin,
  useCriarBanner,
  useExcluirBanner,
  useImagemMobileBanner,
  useRemoverImagemBanner,
  useRemoverImagemMobileBanner,
} from "../hooks/useAdmin";
import { SlideBanner } from "../components/BannerCarousel";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { imagemUrl, mensagemErro } from "../lib/api";
import { useTituloPagina } from "../lib/titulo";
import type { Banner, PosicaoTextoBanner } from "../types";
import { comprimirImagem } from "../lib/imagens";

interface Textos {
  titulo: string;
  subtitulo: string;
  botao_texto: string;
  posicao_texto: PosicaoTextoBanner;
  link: string;
}

const textosVazios: Textos = { titulo: "", subtitulo: "", botao_texto: "", posicao_texto: "esquerda", link: "" };

/** Endereço local para mostrar a foto escolhida antes de enviar. */
function usePreviaArquivo(arquivo: File | null | undefined): string | null {
  const url = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

/** Campos de texto do banner (usados ao criar e ao editar). */
function CamposTexto({ valor, onChange, idBase }: { valor: Textos; onChange: (v: Textos) => void; idBase: string }) {
  const mudar = (campo: keyof Textos) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...valor, [campo]: e.target.value });
  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group controlId={`${idBase}-titulo`}>
          <Form.Label>Título (opcional)</Form.Label>
          <Form.Control value={valor.titulo} onChange={mudar("titulo")} maxLength={80} placeholder="Nova coleção de festa" />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group controlId={`${idBase}-subtitulo`}>
          <Form.Label>Frase (opcional)</Form.Label>
          <Form.Control value={valor.subtitulo} onChange={mudar("subtitulo")} maxLength={160} placeholder="Bordados feitos à mão" />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group controlId={`${idBase}-link`}>
          <Form.Label>Abre ao tocar (opcional)</Form.Label>
          <Form.Control value={valor.link} onChange={mudar("link")} placeholder="/produtos?promocao=1" />
          <Form.Text>Uma página da loja (ex.: /produtos) ou um endereço com https://</Form.Text>
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group controlId={`${idBase}-botao`}>
          <Form.Label>Texto do botão (opcional)</Form.Label>
          <Form.Control value={valor.botao_texto} onChange={mudar("botao_texto")} maxLength={30} placeholder="Ver coleção" />
          {valor.botao_texto && !valor.link.trim() && <Form.Text className="text-warning">O botão só aparece com um link.</Form.Text>}
        </Form.Group>
      </Col>
      <Col xs={12}>
        <div className="form-label mb-1">Posição do texto</div>
        <ButtonGroup aria-label="Posição do texto">
          {(["esquerda", "centro", "direita"] as const).map((p) => (
            <Button key={p} variant={valor.posicao_texto === p ? "dark" : "outline-secondary"} onClick={() => onChange({ ...valor, posicao_texto: p })} aria-pressed={valor.posicao_texto === p}>
              {p === "esquerda" ? "Esquerda" : p === "centro" ? "Centro" : "Direita"}
            </Button>
          ))}
        </ButtonGroup>
        <Form.Text className="d-block">No celular o texto fica embaixo da imagem, para não cobrir as peças.</Form.Text>
      </Col>
    </Row>
  );
}

/** Prévia do banner como fica no computador e no celular. */
function PreviaBanner({ banner }: { banner: Banner }) {
  if (!banner.image_urls.length) return null;
  return (
    <div className="previas-banner">
      <figure className="mb-0 flex-grow-1">
        <div className="previa-banner previa-computador">
          <SlideBanner banner={banner} url={banner.image_urls[0]} modo="computador" />
        </div>
        <figcaption className="small text-muted mt-1">Computador</figcaption>
      </figure>
      <figure className="mb-0">
        <div className="previa-banner previa-celular">
          <SlideBanner banner={banner} url={banner.image_urls[0]} modo="celular" />
        </div>
        <figcaption className="small text-muted mt-1">Celular</figcaption>
      </figure>
    </div>
  );
}

const paraEnvio = (t: Textos) => ({
  titulo: t.titulo.trim() || null,
  subtitulo: t.subtitulo.trim() || null,
  botao_texto: t.botao_texto.trim() || null,
  posicao_texto: t.posicao_texto,
  link: t.link.trim() || null,
});

function EditorBanner({ banner, onFechar }: { banner: Banner; onFechar: () => void }) {
  const atualizar = useAtualizarBanner();
  const enviarMobile = useImagemMobileBanner();
  const removerMobile = useRemoverImagemMobileBanner();
  const notificar = useToast();
  const [textos, setTextos] = useState<Textos>({
    titulo: banner.titulo ?? "",
    subtitulo: banner.subtitulo ?? "",
    botao_texto: banner.botao_texto ?? "",
    posicao_texto: banner.posicao_texto ?? "esquerda",
    link: banner.link ?? "",
  });

  const salvar = () =>
    atualizar.mutate(
      { id: banner.id, ...paraEnvio(textos) },
      {
        onSuccess: () => {
          notificar("Banner atualizado.");
          onFechar();
        },
        onError: (err) => notificar(mensagemErro(err), "danger"),
      }
    );

  const trocarMobile = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    enviarMobile.mutate(
      { id: banner.id, arquivo: await comprimirImagem(arquivo, 1400) },
      { onSuccess: () => notificar("Imagem do celular salva."), onError: (err) => notificar(mensagemErro(err), "danger") }
    );
  };

  return (
    <div className="border-top pt-3 mt-3">
      <CamposTexto valor={textos} onChange={setTextos} idBase={`banner-${banner.id}`} />
      <div className="mt-3">
        <div className="form-label mb-1">
          <FaMobileScreenButton className="me-1" aria-hidden />
          Imagem para celular (opcional, em pé: 900 × 1125 px)
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Form.Control
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => trocarMobile((e.target as HTMLInputElement).files?.[0])}
            style={{ maxWidth: 320 }}
            aria-label="Imagem para celular"
            disabled={enviarMobile.isPending}
          />
          {banner.imagem_mobile && (
            <Button variant="outline-danger" size="sm" onClick={() => removerMobile.mutate(banner.id, { onSuccess: () => notificar("Imagem do celular removida.") })}>
              Remover imagem do celular
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <PreviaBanner banner={{ ...banner, ...paraEnvio(textos), posicao_texto: textos.posicao_texto }} />
      </div>
      <div className="d-flex gap-2 mt-3">
        <Button className="btn-loja" onClick={salvar} disabled={atualizar.isPending}>
          {atualizar.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="secondary" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

function Banners() {
  useTituloPagina("Banners");
  const { data: banners = [], isLoading } = useBannersAdmin();
  const criar = useCriarBanner();
  const atualizar = useAtualizarBanner();
  const excluir = useExcluirBanner();
  const removerImagem = useRemoverImagemBanner();
  const notificar = useToast();

  const [nome, setNome] = useState("");
  const [textos, setTextos] = useState<Textos>(textosVazios);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [arquivoMobile, setArquivoMobile] = useState<File | null>(null);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const inputMobile = useRef<HTMLInputElement>(null);
  const [paraExcluir, setParaExcluir] = useState<Banner | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [preparando, setPreparando] = useState(false);

  const previaLarga = usePreviaArquivo(arquivos[0]);
  const previaMobile = usePreviaArquivo(arquivoMobile);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivos.length) return notificar("Selecione ao menos uma imagem.", "warning");

    const form = new FormData();
    form.append("bannerName", nome);
    Object.entries(paraEnvio(textos)).forEach(([campo, valor]) => valor && form.append(campo, valor));
    // Fotos de celular passam fácil do limite de 4 MB: reduz antes de enviar
    setPreparando(true);
    const imagens = await Promise.all(arquivos.map((a) => comprimirImagem(a, 2000)));
    if (arquivoMobile) form.append("imagem_mobile", await comprimirImagem(arquivoMobile, 1400));
    setPreparando(false);
    imagens.forEach((a) => form.append("bannerImages[]", a));

    criar.mutate(form, {
      onSuccess: () => {
        notificar("Banner cadastrado!");
        setNome("");
        setTextos(textosVazios);
        setArquivos([]);
        setArquivoMobile(null);
        if (inputArquivos.current) inputArquivos.current.value = "";
        if (inputMobile.current) inputMobile.current.value = "";
      },
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });
  };

  const previaNova: Banner | null = previaLarga
    ? { id: 0, name: nome || "Prévia", image_urls: [previaLarga], imagem_mobile: previaMobile, ativo: true, ...paraEnvio(textos) }
    : null;

  return (
    <>
      <h1 className="h3 mb-1">Banners</h1>
      <p className="text-muted mb-4">
        Imagens do carrossel da página inicial, com título, frase e botão por cima (opcionais). Imagem larga: 1600 × 600 px. Para o
        celular, você pode mandar uma imagem em pé (900 × 1125 px); sem ela, a larga é cortada nas laterais.
      </p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h2 className="h5 mb-3">Novo banner</h2>
          <Form onSubmit={enviar}>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group controlId="banner-nome">
                  <Form.Label>Nome do banner *</Form.Label>
                  <Form.Control value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={255} placeholder="Coleção de festa" />
                  <Form.Text>Também é lido por quem usa leitor de tela.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="banner-imagens">
                  <Form.Label>Imagem larga (computador) *</Form.Label>
                  <Form.Control
                    ref={inputArquivos}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => setArquivos(Array.from((e.target as HTMLInputElement).files ?? []))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="banner-mobile">
                  <Form.Label>Imagem em pé (celular)</Form.Label>
                  <Form.Control
                    ref={inputMobile}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setArquivoMobile((e.target as HTMLInputElement).files?.[0] ?? null)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <CamposTexto valor={textos} onChange={setTextos} idBase="banner-novo" />
            {previaNova && (
              <div className="mt-3">
                <PreviaBanner banner={previaNova} />
              </div>
            )}
            <Button type="submit" className="btn-loja mt-3" disabled={preparando || criar.isPending}>
              {preparando ? "Preparando fotos..." : criar.isPending ? "Enviando..." : "Cadastrar banner"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {isLoading ? (
        <Carregando />
      ) : banners.length === 0 ? (
        <p className="text-muted">Nenhum banner cadastrado.</p>
      ) : (
        banners.map((banner) => (
          <Card key={banner.id} className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div style={{ minWidth: 0 }}>
                  <strong>{banner.name}</strong> {!banner.ativo && <Badge bg="secondary">Oculto</Badge>}{" "}
                  {banner.imagem_mobile && (
                    <Badge bg="light" text="dark" className="border">
                      <FaMobileScreenButton className="me-1" aria-hidden />
                      com imagem do celular
                    </Badge>
                  )}
                  {banner.titulo && <div className="small text-muted text-truncate">“{banner.titulo}”</div>}
                  {banner.link && <div className="small text-muted text-truncate">Abre: {banner.link}</div>}
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Form.Check
                    type="switch"
                    id={`banner-ativo-${banner.id}`}
                    label="Visível"
                    checked={banner.ativo}
                    onChange={() => atualizar.mutate({ id: banner.id, ativo: !banner.ativo })}
                  />
                  <Button size="sm" variant="outline-secondary" onClick={() => setEditando(editando === banner.id ? null : banner.id)} aria-expanded={editando === banner.id}>
                    <FaPen className="me-1" /> Textos e celular
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(banner)}>
                    <FaTrash className="me-1" /> Excluir
                  </Button>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {banner.image_urls.map((url) => (
                  <div key={url} className="position-relative">
                    <img src={imagemUrl(url)} alt={banner.name} style={{ width: 240, maxWidth: "100%", height: 90, objectFit: "cover" }} className="rounded" />
                    <Button
                      size="sm"
                      variant="danger"
                      className="position-absolute top-0 end-0 m-1 py-0 px-2"
                      onClick={() => removerImagem.mutate({ id: banner.id, imageUrl: url }, { onSuccess: () => notificar("Imagem removida.") })}
                      aria-label="Remover imagem"
                    >
                      &times;
                    </Button>
                  </div>
                ))}
                {banner.imagem_mobile && (
                  <img src={imagemUrl(banner.imagem_mobile)} alt={`${banner.name} (celular)`} style={{ width: 72, height: 90, objectFit: "cover" }} className="rounded" />
                )}
              </div>
              {editando === banner.id && <EditorBanner banner={banner} onFechar={() => setEditando(null)} />}
            </Card.Body>
          </Card>
        ))
      )}

      <ConfirmDialog
        show={!!paraExcluir}
        title="Excluir banner"
        message={`Excluir o banner "${paraExcluir?.name}" e todas as suas imagens?`}
        confirmLabel="Excluir"
        onCancel={() => setParaExcluir(null)}
        onConfirm={() => {
          if (paraExcluir) excluir.mutate(paraExcluir.id, { onSuccess: () => notificar("Banner excluído.") });
          setParaExcluir(null);
        }}
      />
    </>
  );
}

export default Banners;
