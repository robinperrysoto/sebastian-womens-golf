import { serviceClient } from "@/lib/supabase/server";
import { gameLabel, gameType, rankGameResults, scoreRound } from "@/lib/games";
import { totalPar, type League } from "@/lib/league";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { data, error } = await serviceClient()
      .from("league_state")
      .select("data,version")
      .eq("id", 1)
      .single();
    if (error) throw error;
    const league = data.data as League;
    const url = new URL(request.url),
      roundId = url.searchParams.get("round");
    if (!roundId) {
      const events = league.rounds
        .filter((round) => round.groups.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((round) => ({
          id: round.id,
          date: round.date,
          season: round.season,
          status: round.status,
          format: gameLabel(round),
          players: round.participants.length,
          scores: scoreRound(league, round).length,
        }));
      return Response.json(
        { events },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const round = league.rounds.find((item) => item.id === roundId);
    if (!round || !round.groups.length)
      return Response.json({ error: "Event not found." }, { status: 404 });
    const names = new Map(
      league.players.map((player) => [player.id, player.name]),
    );
    const course = round.course ?? league.course;
    const entries = rankGameResults(
      scoreRound(league, round).map((result) => ({
        ...result,
        name: names.get(result.playerId) ?? "Former player",
      })),
      round,
    );
    const linked = round.game?.linkedRoundId
      ? league.rounds.find((item) => item.id === round.game!.linkedRoundId)
      : undefined;
    return Response.json(
      {
        event: {
          id: round.id,
          date: round.date,
          season: round.season,
          status: round.status,
          format: gameLabel(round),
          gameType: gameType(round),
          linkedDate: linked?.date,
          course: course.name,
          par: totalPar(course),
          players: round.participants.length,
          scores: entries.length,
          entries,
        },
        version: data.version,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Leaderboard is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
