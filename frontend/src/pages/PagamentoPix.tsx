import { useEffect, useState } from "react";
import { Alert, Button, Card, Container } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaCircleCheck, FaClock, FaCopy, FaPix, FaWhatsapp } from "react-icons/fa6";
import { useConfigLoja, useInformarPix, usePixPedido } from "../hooks/useLoja";
import { useToast } from "../components/Toast";
import { Carregando, StatusBadge } from "../components/Ui";
import { formatarPreco, mensagemErro } from "../lib/api";
import { formatarPrazo, linkWhatsapp } from "../lib/utils";
import { useTituloPagina } from "../lib/titulo";

/** Copia um texto; sem a API de área de transferência (ex.: http na rede local), seleciona e copia. */
async function copiarTexto(texto: string, campoId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.getElementById(campoId) as HTMLTextAreaElement | null;
    if (!campo) return false;
    campo.select();
    return document.execCommand("copy");
  }
}

/**
 * Tela do Pix do pedido: copia e cola (principal no celular) e QR Code (para quem está no computador).
 * Atualiza sozinha e mostra quando a loja confirmar o pagamento.
 */
function PagamentoPix() {
  const { id } = useParams();
  const { data, isLoading, isError } = usePixPedido(id);
  const { data: config } = useConfigLoja();
  const informar = useInformarPix();
  const notificar = useToast();
  const [copiado, setCopiado] = useState(false);

  useTituloPagina("Pagar com Pix");

  // Quando a loja confirma, a tela troca de conteúdo: volta ao topo para o cliente ver a confirmação
  const statusPedido = data?.pedido.status;
  const confirmado = !!statusPedido && statusPedido !== "aguardando_pagamento" && statusPedido !== "cancelado";
  useEffect(() => {
    if (confirmado) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [confirmado]);

  if (isLoading) return <Carregando texto="Gerando seu Pix..." />;

  if (isError || !data) {
    return (
      <Container className="py-5" style={{ maxWidth: 560 }}>
        <Alert variant="danger">
          Pedido não encontrado. Veja seus pedidos em <Link to="/meus-pedidos">Meus pedidos</Link>.
        </Alert>
      </Container>
    );
  }

  const { pedido, pix } = data;
  const pago = confirmado;
  const mensagemComprovante = `Olá! Fiz o Pix do pedido #${pedido.id} (${formatarPreco(pedido.total)}). Segue o comprovante.`;

  const copiar = async () => {
    if (!pix) return;
    if (await copiarTexto(pix.copia_e_cola, "pix-copia-e-cola")) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 4000);
    } else {
      notificar("Não foi possível copiar. Toque no código e copie manualmente.", "warning");
    }
  };

  if (pago) {
    return (
      <Container className="py-5" style={{ maxWidth: 560 }}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body className="p-4 p-md-5">
            <FaCircleCheck size={56} className="text-success mb-3" aria-hidden />
            <h1 className="h3">Pagamento confirmado!</h1>
            <p>Obrigado pela compra. A loja já está preparando seu pedido.</p>
            <p className="mb-1">
              Pedido <strong>#{pedido.id}</strong> · {formatarPreco(pedido.total)}
            </p>
            <StatusBadge status={pedido.status} />
            <div className="mt-4 d-flex gap-2 justify-content-center flex-wrap">
              <Link to={`/meus-pedidos?pedido=${pedido.id}`} className="btn btn-loja">
                Ver meu pedido
              </Link>
              <Link to="/produtos" className="btn btn-outline-secondary">
                Continuar comprando
              </Link>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: 560 }}>
      {pedido.status === "cancelado" ? (
        <Alert variant="warning">
          Este pedido foi cancelado. Se você já pagou, fale com a loja.{" "}
          <Link to={`/meus-pedidos?pedido=${pedido.id}`}>Ver pedido</Link>
        </Alert>
      ) : !pix ? (
        <Alert variant="info">
          O Pix não está disponível agora. Veja outras formas de pagamento em{" "}
          <Link to={`/meus-pedidos?pedido=${pedido.id}`}>Meus pedidos</Link> ou fale com a loja.
        </Alert>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-3 p-sm-4">
            <div className="text-center">
              <span className="pix-selo">
                <FaPix aria-hidden /> Pix
              </span>
              <h1 className="h4 mt-2 mb-1">Pague com Pix para concluir</h1>
              <p className="text-muted small mb-1">Pedido #{pedido.id}</p>
              <div className="pix-valor">{formatarPreco(pix.valor)}</div>
              {pedido.pagar_ate && (
                <p className="small text-muted mb-0">
                  Pague até <strong>{formatarPrazo(pedido.pagar_ate)}</strong>. Depois disso o pedido é cancelado e as peças voltam
                  para a loja.
                </p>
              )}
            </div>

            <ol className="pix-passos">
              <li>
                <strong>Copie o código Pix</strong> abaixo
              </li>
              <li>
                No app do seu banco, entre em <strong>Pix → Pix Copia e Cola</strong>
              </li>
              <li>
                {pix.automatico ? (
                  <>Confira o valor e confirme o pagamento</>
                ) : (
                  <>
                    Confira o valor e o recebedor (<strong>{pix.recebedor}</strong>) e confirme
                  </>
                )}
              </li>
            </ol>

            <label htmlFor="pix-copia-e-cola" className="visually-hidden">
              Código Pix Copia e Cola
            </label>
            <textarea
              id="pix-copia-e-cola"
              className="form-control pix-codigo"
              readOnly
              rows={3}
              value={pix.copia_e_cola}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button className="btn-loja w-100 mt-2" size="lg" onClick={copiar}>
              {copiado ? (
                <>
                  <FaCircleCheck aria-hidden /> Código copiado!
                </>
              ) : (
                <>
                  <FaCopy aria-hidden /> Copiar código Pix
                </>
              )}
            </Button>

            <div className="pix-qr">
              <p className="small text-muted mb-2">Está no computador? Escaneie com o celular:</p>
              <QRCodeSVG value={pix.copia_e_cola} size={208} level="M" marginSize={2} title="QR Code do Pix" />
            </div>

            <div className="pix-status" aria-live="polite">
              {pix.automatico ? (
                <>
                  <span className="spinner-grow spinner-grow-sm flex-shrink-0 mt-1 text-success" aria-hidden />
                  <span>
                    Aguardando o pagamento. Assim que o Pix for pago, esta tela confirma sozinha, em poucos segundos.
                    {pix.expira_em && <> Código válido até {formatarPrazo(pix.expira_em)}.</>}
                  </span>
                </>
              ) : pedido.pagamento_informado_em ? (
                <>
                  <FaClock className="flex-shrink-0 mt-1" aria-hidden />
                  <span>Recebemos seu aviso! A loja vai conferir o Pix e confirmar o pedido. Esta tela atualiza sozinha.</span>
                </>
              ) : (
                <>
                  <span className="spinner-grow spinner-grow-sm flex-shrink-0 mt-1 text-success" aria-hidden />
                  <span>Aguardando o pagamento. Depois de pagar, toque em “Já paguei”.</span>
                </>
              )}
            </div>

            {!pix.automatico && !pedido.pagamento_informado_em && (
              <Button
                variant="outline-success"
                className="w-100"
                disabled={informar.isPending}
                onClick={() => informar.mutate(pedido.id, { onError: (e) => notificar(mensagemErro(e), "danger") })}
              >
                {informar.isPending ? "Avisando a loja..." : "Já paguei"}
              </Button>
            )}
            {!pix.automatico && config?.whatsapp && (
              <a className="btn btn-success w-100 mt-2" target="_blank" rel="noreferrer" href={linkWhatsapp(config.whatsapp, mensagemComprovante)}>
                <FaWhatsapp aria-hidden /> Enviar comprovante pelo WhatsApp
              </a>
            )}
            {pix.automatico && (
              <p className="small text-muted text-center mt-3 mb-0">
                Pagamento processado com segurança pelo {pix.provedor === "stripe" ? "Stripe" : "Mercado Pago"}.
              </p>
            )}
            <p className="small text-muted text-center mt-3 mb-0">
              Você também encontra este Pix em <Link to={`/meus-pedidos?pedido=${pedido.id}`}>Meus pedidos</Link>.
            </p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default PagamentoPix;
