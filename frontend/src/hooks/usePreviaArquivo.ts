import { useEffect, useMemo } from "react";

/** Endereço local para mostrar a foto escolhida antes de enviar. */
export function usePreviaArquivo(arquivo: File | null | undefined): string | null {
  const url = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}
