
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function Schedule() {
  const [events, setEvents] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("Study Session");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, time, type")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function addEvent(e) {
    e.preventDefault();

    if (!title.trim() || !date || !time || saving) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          date,
          time,
          type
        });

      if (error) throw error;

      setTitle("");
      setDate("");
      setTime("09:00");
      setType("Study Session");

      await loadEvents();
      setMessage("Event added successfully.");
    } catch (error) {
      setMessage("Failed to add event: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id) {
    if (saving) return;

    if (!window.confirm("Delete this event?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadEvents();
      setMessage("Event deleted successfully.");
    } catch (error) {
      setMessage("Failed to delete event: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const sortedEvents = [...events].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(
      `${b.date}T${b.time}`
    )
  );

  return (
    <div className="schedule-page">
      <div className="page-heading">
        <div>
          <h2>Schedule Management</h2>
          <p>Organize study sessions and group meetings.</p>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          disabled={loading || saving}
        >
          {loading ? "Loading..." : "Refresh Events"}
        </button>
      </div>

      {message && (
        <p role="status" style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      {loadError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          Failed to load events: {loadError}
        </p>
      )}

      <div className="schedule-layout">
        <form className="schedule-form" onSubmit={addEvent}>
          <h3>Create New Event</h3>

          <label>Event Title</label>
          <input
            type="text"
            placeholder="Enter event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <label>Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />

          <label>Event Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Study Session</option>
            <option>Group Meeting</option>
            <option>Lab Practice</option>
            <option>Extracurricular</option>
          </select>

          <button
            className="primary-btn"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "+ Add Event"}
          </button>
        </form>

        <div className="events-card">
          <h3>Scheduled Events ({events.length})</h3>

          {loading ? (
            <p>Loading events from Supabase...</p>
          ) : sortedEvents.length === 0 ? (
            <p className="empty-message">
              No events scheduled yet.
            </p>
          ) : (
            <div className="event-list">
              {sortedEvents.map((event) => (
                <div className="event-item" key={event.id}>
                  <div className="event-details">
                    <h4>{event.title}</h4>

                    <p>
                      {event.date} · {event.time?.slice(0, 5)}
                    </p>

                    <span className="event-type">
                      {event.type}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteEvent(event.id)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;
