import { useRef, useState } from "react";
import { Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import { FaTrash } from "react-icons/fa6";
import {
  useAtualizarBanner,
  useBannersAdmin,
  useCriarBanner,
  useExcluirBanner,
  useRemoverImagemBanner,
} from "../hooks/useAdmin";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { Carregando } from "../components/Ui";
import { imagemUrl, mensagemErro } from "../lib/api";
import type { Banner } from "../types";

function Banners() {
  const { data: banners = [], isLoading } = useBannersAdmin();
  const criar = useCriarBanner();
  const atualizar = useAtualizarBanner();
  const excluir = useExcluirBanner();
  const removerImagem = useRemoverImagemBanner();
  const notificar = useToast();

  const [nome, setNome] = useState("");
  const [link, setLink] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const [paraExcluir, setParaExcluir] = useState<Banner | null>(null);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivos.length) return notificar("Selecione ao menos uma imagem.", "warning");

    const form = new FormData();
    form.append("bannerName", nome);
    if (link.trim()) form.append("link", link.trim());
    arquivos.forEach((a) => form.append("bannerImages[]", a));

    criar.mutate(form, {
      onSuccess: () => {
        notificar("Banner cadastrado!");
        setNome("");
        setLink("");
        setArquivos([]);
        if (inputArquivos.current) inputArquivos.current.value = "";
      },
      onError: (err) => notificar(mensagemErro(err), "danger"),
    });
  };

  return (
    <>
      <h1 className="h3 mb-1">Banners</h1>
      <p className="text-muted mb-4">
        Imagens do carrossel da página inicial. Tamanho recomendado: 1600 × 500 px.
      </p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h2 className="h5 mb-3">Novo banner</h2>
          <Form onSubmit={enviar}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="banner-nome">
                  <Form.Label>Nome (texto alternativo)</Form.Label>
                  <Form.Control value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={255} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="banner-link">
                  <Form.Label>Link ao clicar (opcional)</Form.Label>
                  <Form.Control value={link} onChange={(e) => setLink(e.target.value)} placeholder="/produtos?promocao=1" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="banner-imagens">
                  <Form.Label>Imagens</Form.Label>
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
            </Row>
            <Button type="submit" className="btn-loja mt-3" disabled={criar.isPending}>
              {criar.isPending ? "Enviando..." : "Cadastrar banner"}
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
                <div>
                  <strong>{banner.name}</strong>{" "}
                  {!banner.ativo && <Badge bg="secondary">Oculto</Badge>}
                  {banner.link && <div className="small text-muted">Link: {banner.link}</div>}
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Form.Check
                    type="switch"
                    id={`banner-ativo-${banner.id}`}
                    label="Visível"
                    checked={banner.ativo}
                    onChange={() => atualizar.mutate({ id: banner.id, ativo: !banner.ativo })}
                  />
                  <Button size="sm" variant="outline-danger" onClick={() => setParaExcluir(banner)}>
                    <FaTrash className="me-1" /> Excluir
                  </Button>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {banner.image_urls.map((url) => (
                  <div key={url} className="position-relative">
                    <img src={imagemUrl(url)} alt={banner.name} style={{ width: 240, height: 90, objectFit: "cover" }} className="rounded" />
                    <Button
                      size="sm"
                      variant="danger"
                      className="position-absolute top-0 end-0 m-1 py-0 px-2"
                      onClick={() =>
                        removerImagem.mutate(
                          { id: banner.id, imageUrl: url },
                          { onSuccess: () => notificar("Imagem removida.") }
                        )
                      }
                      aria-label="Remover imagem"
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
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
