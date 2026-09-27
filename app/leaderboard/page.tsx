"use client";
import { useEffect, useState } from "react";
type Event = {
  id: string;
  date: string;
  season: string;
  status: string;
  format: string;
  players: number;
  scores: number;
};
const pretty = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
export default function Leaderboards() {
  const [events, setEvents] = useState<Event[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/leaderboard", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        setEvents(body.events);
      })
      .catch((reason) => setError(reason.message));
  }, []);
  return (
    <main className="leaderboard-shell">
      <header className="leaderboard-brand">
        <span className="brand-mark">S</span>
        <div>
          <strong>SEBASTIAN</strong>
          <small>WOMEN'S GOLF · EVENT LEADERBOARDS</small>
        </div>
      </header>
      <section className="leaderboard-home">
        <div className="eyebrow">TOURNAMENT RESULTS</div>
        <h1>Event leaderboards</h1>
        <p>Select an event to see its current standings.</p>
        {error && <div className="alert error">{error}</div>}
        <div className="event-list">
          {events.map((event) => (
            <a
              href={`/leaderboard/${encodeURIComponent(event.id)}`}
              key={event.id}
            >
              <span>
                <strong>{pretty(event.date)}</strong>
                <small>
                  {event.format} · {event.season} · {event.players} players
                </small>
              </span>
              <span>
                <b>
                  {event.scores}/{event.players}
                </b>
                <small>
                  {event.status === "completed" ? "Final" : "Scores posted"}
                </small>
              </span>
            </a>
          ))}
        </div>
        {!error && events.length === 0 && (
          <div className="leaderboard-empty">
            No paired events are available yet.
          </div>
        )}
      </section>
    </main>
  );
}
