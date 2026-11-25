import { useEffect, useState } from "react";

/** "termina em 2 dias e 5h" (perto do fim) ou "até 30/12" (longe). Atualiza a cada minuto. */
function TempoRestante({ ate }: { ate: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const fim = new Date(ate).getTime();
  const ms = fim - agora;
  if (!Number.isFinite(fim) || ms <= 0) return null;

  const dias = Math.floor(ms / 86_400_000);
  if (dias >= 7) return <>até {new Date(ate).toLocaleDateString("pt-BR")}</>;
  const horas = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  const texto =
    dias > 0 ? `${dias} ${dias === 1 ? "dia" : "dias"}${horas ? ` e ${horas}h` : ""}` : horas > 0 ? `${horas}h ${minutos}min` : `${Math.max(minutos, 1)} min`;
  return <>termina em {texto}</>;
}

export default TempoRestante;
