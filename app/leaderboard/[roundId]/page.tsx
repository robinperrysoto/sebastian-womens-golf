"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { relativeToPar } from "@/lib/leaderboard";
type Entry = {
  playerId: string;
  name: string;
  gross: number | null;
  playingHandicap: number;
  net: number | null;
  points: number | null;
  score: number;
  toPar: number | null;
  detail: string;
  rank: number;
  tied: boolean;
};
type Event = {
  id: string;
  date: string;
  season: string;
  status: string;
  format: string;
  gameType: string;
  linkedDate?: string;
  course: string;
  par: number;
  players: number;
  scores: number;
  entries: Entry[];
};
const pretty = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
export default function EventLeaderboard() {
  const { roundId } = useParams<{ roundId: string }>(),
    [event, setEvent] = useState<Event | null>(null),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState<Date | null>(null);
  const load = useCallback(
    () =>
      fetch(`/api/leaderboard?round=${encodeURIComponent(roundId)}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw Error(body.error);
          setEvent(body.event);
          setUpdated(new Date());
          setError("");
        })
        .catch((reason) => setError(reason.message)),
    [roundId],
  );
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);
  const stable = event?.gameType === "stableford";
  return (
    <main className="leaderboard-shell">
      <header className="leaderboard-brand">
        <a href="/leaderboard" aria-label="All event leaderboards">
          <span className="brand-mark">S</span>
        </a>
        <div>
          <strong>SEBASTIAN</strong>
          <small>WOMEN'S GOLF · LEADERBOARD</small>
        </div>
        <a className="all-events" href="/leaderboard">
          All events
        </a>
      </header>
      {error ? (
        <section className="leaderboard-home">
          <div className="alert error">{error}</div>
        </section>
      ) : !event ? (
        <div className="leaderboard-loading">Loading leaderboard…</div>
      ) : (
        <section className="leaderboard-event">
          <div className="leaderboard-title">
            <div>
              <span className={`leaderboard-state ${event.status}`}>
                {event.status === "completed" ? "FINAL" : "LIVE"}
              </span>
              <div className="eyebrow">
                {event.format.toUpperCase()} · {event.season}
              </div>
              <h1>{pretty(event.date)}</h1>
              <p>
                {event.course} · Par {event.par}
                {event.linkedDate
                  ? ` · Linked with ${pretty(event.linkedDate)}`
                  : ""}
              </p>
            </div>
            <div className="score-progress">
              <strong>{event.scores}</strong>
              <span>
                of {event.players}
                <br />
                scores posted
              </span>
            </div>
          </div>
          {event.entries.length ? (
            <div className="leaderboard-table">
              <div className="leaderboard-row leaderboard-head">
                <span>Pos</span>
                <span>Player</span>
                <span>Gross</span>
                <span>PH</span>
                <span>{stable ? "Points" : "Net"}</span>
                <span>{stable ? "Counted" : "To par"}</span>
              </div>
              {event.entries.map((entry) => (
                <div
                  className={`leaderboard-row ${entry.rank <= 3 ? "podium" : ""}`}
                  key={entry.playerId}
                >
                  <span className="position">
                    {entry.tied ? "T" : ""}
                    {entry.rank}
                  </span>
                  <strong>{entry.name}</strong>
                  <span>{entry.gross ?? "—"}</span>
                  <span>{entry.playingHandicap}</span>
                  <b>{stable ? entry.points : entry.net}</b>
                  <em>
                    {stable
                      ? entry.detail
                      : entry.toPar == null
                        ? "—"
                        : relativeToPar(entry.toPar, 0)}
                  </em>
                </div>
              ))}
            </div>
          ) : (
            <div className="leaderboard-empty">
              Scores will appear here as the administrator posts them.
            </div>
          )}
          <div className="leaderboard-update">
            <span>Updates automatically every 15 seconds</span>
            <button onClick={() => void load()}>Refresh now</button>
            {updated && (
              <small>
                Last checked{" "}
                {updated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </small>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
