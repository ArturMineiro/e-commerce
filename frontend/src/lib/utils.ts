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
