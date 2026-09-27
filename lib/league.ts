export type Player = {
  id: string;
  name: string;
  ghin: string;
  index: number | null;
  email: string;
  phone: string;
  active: boolean;
};
export type Participant = {
  playerId: string;
  index: number;
  courseHandicap: number;
  playingHandicap: number;
  gross: number | null;
  holes: (number | null)[];
};
export type Group = { id: string; playerIds: string[]; locked: boolean };
export type GameType =
  | "individual-net"
  | "selected-holes"
  | "stableford"
  | "three-three-three"
  | "two-round-aggregate"
  | "two-round-best-hole";
export type GameSettings = {
  type: GameType;
  countingHoles?: number[];
  linkedRoundId?: string;
};
export type Round = {
  id: string;
  season: string;
  date: string;
  firstTime: string;
  interval: number;
  instructions?: string;
  game?: GameSettings;
  attendees: string[];
  groups: Group[];
  participants: Participant[];
  course?: Course;
  status: "draft" | "paired" | "completed";
};
export type Course = {
  name: string;
  rating: number;
  slope: number;
  par: number[];
  strokeIndex: number[];
  allowance: number;
};
export type League = {
  season: string;
  seasons: string[];
  players: Player[];
  rounds: Round[];
  course: Course;
};
export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// The hole pars and women's stroke allocations follow the city's published card.
// Rating and slope reflect the FSGA's current women's red-tee listing.
export const initialLeague: League = {
  season: "2026–27",
  seasons: ["2026–27"],
  players: [],
  rounds: [],
  course: {
    name: "Sebastian Municipal Golf Course",
    rating: 69.4,
    slope: 118,
    allowance: 100,
    par: [4, 3, 4, 5, 3, 4, 5, 4, 4, 4, 4, 3, 4, 4, 5, 3, 4, 5],
    strokeIndex: [
      7, 17, 3, 9, 15, 11, 1, 13, 5, 6, 2, 18, 12, 10, 4, 16, 8, 14,
    ],
  },
};

export const totalPar = (course: Course) =>
  course.par.reduce((a, b) => a + b, 0);
export const courseHandicap = (index: number, course: Course) =>
  Math.round((index * course.slope) / 113 + course.rating - totalPar(course));
export const playingHandicap = (ch: number, course: Course) =>
  Math.round((ch * course.allowance) / 100);
export function strokesOnHole(ph: number, si: number) {
  if (ph >= 0) return Math.floor(ph / 18) + (si <= ph % 18 ? 1 : 0);
  const positive = -ph;
  return -(Math.floor(positive / 18) + (si > 18 - (positive % 18) ? 1 : 0));
}
export const timeFor = (start: string, interval: number, i: number) => {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + i * interval;
  const hour = Math.floor(t / 60) % 24;
  return `${hour % 12 || 12}:${String(t % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

export function makeGroups(
  attendees: string[],
  previous: Round[],
  locked: Group[] = [],
  seed = Math.random(),
) {
  const lockedIds = new Set(locked.flatMap((g) => g.playerIds));
  const remaining = attendees.filter((id) => !lockedIds.has(id));
  const counts = new Map<string, number>();
  const threes = new Map<string, number>();
  for (const r of previous.filter((r) => r.status !== "draft"))
    for (const g of r.groups) {
      if (g.playerIds.length === 3)
        g.playerIds.forEach((id) => threes.set(id, (threes.get(id) || 0) + 1));
      for (let i = 0; i < g.playerIds.length; i++)
        for (let j = i + 1; j < g.playerIds.length; j++) {
          const key = [g.playerIds[i], g.playerIds[j]].sort().join("|");
          counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
  const sizes: number[] = [];
  const n = remaining.length;
  // Prefer 3s and 4s; 1 or 2 players cannot form a valid group.
  if (n === 1 || n === 2) sizes.push(n);
  else {
    const threesNeeded = (4 - (n % 4)) % 4;
    if (n < threesNeeded * 3) sizes.push(n);
    else {
      for (let i = 0; i < threesNeeded; i++) sizes.push(3);
      for (let i = 0; i < (n - threesNeeded * 3) / 4; i++) sizes.push(4);
    }
  }
  const score = (ids: string[][]) =>
    ids.reduce(
      (sum, g) =>
        sum +
        g.reduce(
          (s, a, i) =>
            s +
            g
              .slice(i + 1)
              .reduce(
                (p, b) =>
                  p +
                  Math.pow((counts.get([a, b].sort().join("|")) || 0) + 1, 2),
                0,
              ),
          0,
        ) +
        (g.length === 3
          ? g.reduce((s, id) => s + (threes.get(id) || 0) * 5, 0)
          : 0),
      0,
    );
  let best: string[][] = [];
  let bestScore = Infinity;
  const trials = Math.min(1000, Math.max(120, n * n * 2));
  for (let trial = 0; trial < trials; trial++) {
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    if (trial === 0)
      shuffled.sort((a, b) => (threes.get(a) || 0) - (threes.get(b) || 0));
    let at = 0;
    const candidate = sizes.map((s) => shuffled.slice(at, (at += s)));
    // Local swaps improve the rotation while keeping group sizes fixed.
    for (let pass = 0; pass < 50; pass++) {
      const ai = Math.floor(Math.random() * candidate.length),
        bi = Math.floor(Math.random() * candidate.length);
      if (ai === bi || !candidate[ai]?.length || !candidate[bi]?.length)
        continue;
      const aj = Math.floor(Math.random() * candidate[ai].length),
        bj = Math.floor(Math.random() * candidate[bi].length);
      const before = score(candidate);
      [candidate[ai][aj], candidate[bi][bj]] = [
        candidate[bi][bj],
        candidate[ai][aj],
      ];
      if (score(candidate) > before)
        [candidate[ai][aj], candidate[bi][bj]] = [
          candidate[bi][bj],
          candidate[ai][aj],
        ];
    }
    const value = score(candidate) + Math.random() * 0.001 + seed * 0.00001;
    if (value < bestScore) {
      bestScore = value;
      best = candidate.map((g) => [...g]);
    }
  }
  return [
    ...locked.filter((g) => g.playerIds.every((id) => attendees.includes(id))),
    ...best.map((ids) => ({ id: newId(), playerIds: ids, locked: false })),
  ].sort((a, b) => a.playerIds.length - b.playerIds.length);
}
