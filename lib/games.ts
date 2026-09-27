import {
  strokesOnHole,
  totalPar,
  type Course,
  type GameType,
  type League,
  type Participant,
  type Round,
} from "./league.ts";

export const GAME_LABELS: Record<GameType, string> = {
  "individual-net": "Individual net",
  "selected-holes": "Selected holes",
  stableford: "Net Stableford",
  "three-three-three": "3-3-3",
  "two-round-aggregate": "Two-round aggregate",
  "two-round-best-hole": "Two-round best hole",
};
export const gameType = (round: Round): GameType =>
  round.game?.type ?? "individual-net";
export const gameLabel = (round: Round) => GAME_LABELS[gameType(round)];
export const countingHoles = (round: Round) =>
  round.game?.countingHoles?.length
    ? [...new Set(round.game.countingHoles)]
        .filter((h) => h >= 0 && h < 18)
        .sort((a, b) => a - b)
    : Array.from({ length: 18 }, (_, i) => i);
export const hasCompleteHoles = (
  p: Participant,
  holes = Array.from({ length: 18 }, (_, i) => i),
) => holes.every((i) => p.holes[i] != null);
export const netHole = (p: Participant, course: Course, hole: number) =>
  p.holes[hole]! - strokesOnHole(p.playingHandicap, course.strokeIndex[hole]);
export const stablefordPoints = (net: number, par: number) =>
  Math.max(0, Math.min(5, 2 + par - net));

export type GameResult = {
  playerId: string;
  gross: number | null;
  playingHandicap: number;
  net: number | null;
  points: number | null;
  score: number;
  toPar: number | null;
  detail: string;
};
const findPlayer = (round: Round, id: string) =>
  round.participants.find((p) => p.playerId === id);
export function scoreRound(league: League, round: Round): GameResult[] {
  const course = round.course ?? league.course,
    type = gameType(round),
    linked = round.game?.linkedRoundId
      ? league.rounds.find((r) => r.id === round.game!.linkedRoundId)
      : undefined;
  return round.participants.flatMap((p) => {
    const gross =
      p.gross ??
      (hasCompleteHoles(p)
        ? p.holes.reduce<number>((s, x) => s + (x ?? 0), 0)
        : null);
    if (type === "individual-net")
      return gross == null
        ? []
        : [
            {
              playerId: p.playerId,
              gross,
              playingHandicap: p.playingHandicap,
              net: gross - p.playingHandicap,
              points: null,
              score: gross - p.playingHandicap,
              toPar: gross - p.playingHandicap - totalPar(course),
              detail: "Net",
            },
          ];
    const holes = countingHoles(round);
    if (type === "selected-holes" || type === "stableford") {
      if (!hasCompleteHoles(p, holes)) return [];
      const net = holes.reduce((s, h) => s + netHole(p, course, h), 0),
        par = holes.reduce((s, h) => s + course.par[h], 0);
      const points =
        type === "stableford"
          ? holes.reduce(
              (s, h) =>
                s + stablefordPoints(netHole(p, course, h), course.par[h]),
              0,
            )
          : null;
      return [
        {
          playerId: p.playerId,
          gross,
          playingHandicap: p.playingHandicap,
          net,
          points,
          score: points ?? net,
          toPar: net - par,
          detail: `${holes.length} holes`,
        },
      ];
    }
    if (type === "three-three-three") {
      if (!hasCompleteHoles(p)) return [];
      const chosen = [3, 4, 5].flatMap((par) =>
        course.par
          .map((v, h) => ({ v, h, d: netHole(p, course, h) - v }))
          .filter((x) => x.v === par)
          .sort((a, b) => a.d - b.d || a.h - b.h)
          .slice(0, 3),
      );
      if (chosen.length < 9) return [];
      const net = chosen.reduce((s, x) => s + netHole(p, course, x.h), 0),
        par = chosen.reduce((s, x) => s + x.v, 0);
      return [
        {
          playerId: p.playerId,
          gross,
          playingHandicap: p.playingHandicap,
          net,
          points: null,
          score: net - par,
          toPar: net - par,
          detail: `Holes ${chosen
            .map((x) => x.h + 1)
            .sort((a, b) => a - b)
            .join(", ")}`,
        },
      ];
    }
    const other = linked ? findPlayer(linked, p.playerId) : undefined,
      otherCourse = linked ? (linked.course ?? league.course) : course;
    if (!linked || !other) return [];
    if (type === "two-round-aggregate") {
      const a = gross == null ? null : gross - p.playingHandicap,
        b = other.gross == null ? null : other.gross - other.playingHandicap;
      if (a == null || b == null) return [];
      return [
        {
          playerId: p.playerId,
          gross: (gross ?? 0) + (other.gross ?? 0),
          playingHandicap: p.playingHandicap + other.playingHandicap,
          net: a + b,
          points: null,
          score: a + b,
          toPar: a + b - totalPar(course) - totalPar(otherCourse),
          detail: "Two rounds",
        },
      ];
    }
    if (!hasCompleteHoles(p) || !hasCompleteHoles(other)) return [];
    const best = Array.from({ length: 18 }, (_, h) =>
      Math.min(netHole(p, course, h), netHole(other, otherCourse, h)),
    );
    const net = best.reduce((s, x) => s + x, 0);
    return [
      {
        playerId: p.playerId,
        gross: null,
        playingHandicap: p.playingHandicap,
        net,
        points: null,
        score: net,
        toPar: net - totalPar(course),
        detail: "Best net by hole",
      },
    ];
  });
}
export const higherWins = (round: Round) => gameType(round) === "stableford";
export function rankGameResults<T extends GameResult & { name: string }>(
  rows: T[],
  round: Round,
): (T & { rank: number; tied: boolean })[] {
  const high = higherWins(round),
    sorted = [...rows].sort(
      (a, b) =>
        (high ? b.score - a.score : a.score - b.score) ||
        a.name.localeCompare(b.name),
    );
  return sorted.map((row) => ({
    ...row,
    rank: sorted.findIndex((x) => x.score === row.score) + 1,
    tied: sorted.filter((x) => x.score === row.score).length > 1,
  }));
}
