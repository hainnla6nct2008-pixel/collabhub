import { useState, useEffect } from "react";

function Schedule() {
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem("collabhub_events");

      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.error("Cannot load events:", error);
    }

    return [];
  });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("Study Session");

  useEffect(() => {
    localStorage.setItem(
      "collabhub_events",
      JSON.stringify(events)
    );
  }, [events]);

  function addEvent(e) {
    e.preventDefault();

    if (!title.trim() || !date || !time) return;

    const newEvent = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time,
      type
    };

    setEvents((prev) => [...prev, newEvent]);

    setTitle("");
    setDate("");
    setTime("09:00");
    setType("Study Session");
  }

  function deleteEvent(id) {
    if (!window.confirm("Delete this event?")) return;

    setEvents((prev) =>
      prev.filter((event) => event.id !== id)
    );
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
      </div>

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

          <button className="primary-btn" type="submit">
            + Add Event
          </button>
        </form>

        <div className="events-card">
          <h3>Scheduled Events ({events.length})</h3>

          {sortedEvents.length === 0 ? (
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
                      {event.date} · {event.time}
                    </p>
                    <span className="event-type">
                      {event.type}
                    </span>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => deleteEvent(event.id)}
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
