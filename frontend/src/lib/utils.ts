/** Escolhe texto claro ou escuro conforme a cor de fundo (contraste/acessibilidade). */
export function corDeContraste(hex: string): string {
  const valor = hex.replace("#", "");
  if (valor.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16) / 255);
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.6 ? "#212529" : "#ffffff";
}

export function fundoEhClaro(hex: string): boolean {
  return corDeContraste(hex) !== "#ffffff";
}

/** Link absoluto para redes sociais aceitando "@usuario", "usuario" ou URL completa. */
export function linkRede(rede: "instagram" | "facebook" | "tiktok", valor: string): string {
  if (/^https?:\/\//.test(valor)) return valor;
  const usuario = valor.replace(/^@/, "");
  const bases = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://www.tiktok.com/@",
  };
  return bases[rede] + usuario;
}

export function linkWhatsapp(numero: string, mensagem = ""): string {
  let digitos = numero.replace(/\D/g, "");
  if (digitos.length <= 11) digitos = "55" + digitos;
  return `https://wa.me/${digitos}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

/**
 * Link cadastrado pelo dono da loja (banner etc.): caminho interno da loja ou endereço http(s).
 * Qualquer outra coisa (javascript:, data:, //outro-site) é ignorada: as lojas dividem o domínio.
 */
export function tipoLink(link: string | null | undefined): "interno" | "externo" | null {
  const valor = (link ?? "").trim();
  if (/^https?:\/\/\S+$/i.test(valor)) return "externo";
  if (/^\/(?![/\\])\S*$/.test(valor)) return "interno";
  return null;
}

/** Prazo curto e legível: "hoje às 14:30", "amanhã às 09:00" ou "25/11 às 14:30". */
export function formatarPrazo(iso: string): string {
  const data = new Date(iso);
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = (d: Date) => d.toLocaleDateString("pt-BR");
  const hoje = new Date();
  const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
  if (dia(data) === dia(hoje)) return `hoje às ${hora}`;
  if (dia(data) === dia(amanha)) return `amanhã às ${hora}`;
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hora}`;
}

/** "1 produto", "3 produtos" (no lugar de "produto(s)"). */
export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${quantidade.toLocaleString("pt-BR")} ${quantidade === 1 ? singular : pluralTexto}`;
}
