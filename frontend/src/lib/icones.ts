import type { IconType } from "react-icons";
import {
  FaBabyCarriage,
  FaBookOpen,
  FaCakeCandles,
  FaCouch,
  FaDumbbell,
  FaGamepad,
  FaGem,
  FaHeadphones,
  FaPaw,
  FaPersonDress,
  FaScissors,
  FaShirt,
  FaSprayCanSparkles,
  FaWandMagicSparkles,
} from "react-icons/fa6";
import { GiLotus, GiRunningShoe } from "react-icons/gi";

/** Ícone de cada modelo de loja (chave "icone" de config/modelos_loja.php). */
const ICONES: Record<string, IconType> = {
  vestido: FaPersonDress,
  lotus: GiLotus,
  camisa: FaShirt,
  tenis: GiRunningShoe,
  controle: FaGamepad,
  fone: FaHeadphones,
  beleza: FaSprayCanSparkles,
  joia: FaGem,
  bolo: FaCakeCandles,
  pet: FaPaw,
  sofa: FaCouch,
  bebe: FaBabyCarriage,
  haltere: FaDumbbell,
  livro: FaBookOpen,
  artesanato: FaScissors,
  magica: FaWandMagicSparkles,
};

export function iconeModelo(chave?: string | null): IconType {
  return (chave && ICONES[chave]) || FaWandMagicSparkles;
}
