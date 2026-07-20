import { RATING_VOTING_HOURS } from "@/lib/matchRatings";
import {
  MATCH_MVP_BONUS,
  MATCH_RATING_GAIN_CAP,
  MATCH_STAR_MAX_DELTA,
  MATCH_TOP_GOALSCORER_BONUS,
} from "@/lib/matchPlayerRating";
import {
  TRAINING_MAX_OVERALL_DELTA,
  TRAINING_VOTING_HOURS,
} from "@/lib/trainingRatings";

/** Голосование за оценки игроков после матча */
export const AWAY_MATCH_RATING = {
  icon: "★",
  navShort: "Оценить",
  navCta: "Нажмите для оценки",
  navDone: "Оценки отправлены",
  navKind: "оценки матча",
  navRating: `до +${MATCH_RATING_GAIN_CAP} ★`,
  navInfo: `±${MATCH_STAR_MAX_DELTA} ★ · оценки`,
  navInfoBonus: `+${MATCH_TOP_GOALSCORER_BONUS} · гол/асс`,
  navEmpty: "нет игры",
  panelTitle: "Оценки матча",
  kindLabel: "Оценки · влияние на рейтинг",
  deltaMax: MATCH_RATING_GAIN_CAP,
  deltaLabel: `до +${MATCH_RATING_GAIN_CAP} ★`,
  votingHours: RATING_VOTING_HOURS,
  hint: `★ обновляются сразу: голы и ассисты — больше всего, MVP (+${MATCH_MVP_BONUS}) — чуть больше, остальным — немного по звёздам (±${MATCH_STAR_MAX_DELTA}).`,
} as const;

/** Домашняя тренировка — небольшой бонус к ★ */
export const HOME_TRAINING_RATING = {
  icon: "★",
  navShort: "Тренировка",
  navKind: "тренировки",
  navRating: `±${TRAINING_MAX_OVERALL_DELTA} ★`,
  panelTitle: "Оценки тренировки",
  kindLabel: "Тренировка · малый бонус",
  deltaMax: TRAINING_MAX_OVERALL_DELTA,
  deltaLabel: `до ±${TRAINING_MAX_OVERALL_DELTA} ★`,
  votingHours: TRAINING_VOTING_HOURS,
  hint: "Тренировка — влияние на ★ небольшое.",
} as const;
