import { useEffect } from "react";

/** Anima a entrada dos elementos com a classe "revelar" quando aparecem na tela. */
export function useRevelar(dependencia?: unknown) {
  useEffect(() => {
    const elementos = Array.from(document.querySelectorAll<HTMLElement>(".revelar:not(.visivel)"));
    if (!("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("visivel"));
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visivel");
            observador.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [dependencia]);
}
