import { useState } from "react";

function readData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Cannot read:", key, error);
    return [];
  }
}

function Dashboard() {
  const [students] = useState(() =>
    readData("collabhub_students")
  );

  const [events] = useState(() =>
    readData("collabhub_events")
  );

  const [internships] = useState(() =>
    readData("collabhub_internships")
  );

  const [groups] = useState(() =>
    readData("collabhub_groups")
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date + "T00:00:00");
      return eventDate >= today;
    })
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(
        `${b.date}T${b.time}`
      )
    );

  const ongoingInternships = internships.filter(
    (item) => item.status === "Ongoing"
  );

  return (
    <div className="dashboard-page">
      <section className="welcome">
        <h2>Welcome to CollabHub!</h2>
        <p>
          Manage your study groups, schedules
          and internships in one place.
        </p>
      </section>

      <section className="stats">
        <div className="stat-card">
          <p>Total Students</p>
          <h2>{students.length}</h2>
        </div>

        <div className="stat-card">
          <p>Study Groups</p>
          <h2>{groups.length}</h2>
        </div>

        <div className="stat-card">
          <p>Upcoming Events</p>
          <h2>{upcomingEvents.length}</h2>
        </div>

        <div className="stat-card">
          <p>Internships</p>
          <h2>{internships.length}</h2>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="content-card">
          <h2>Upcoming Events</h2>

          {upcomingEvents.length === 0 ? (
            <p>No upcoming events.</p>
          ) : (
            upcomingEvents.slice(0, 5).map((event) => (
              <div className="dashboard-list-item" key={event.id}>
                <strong>{event.title}</strong>
                <p>
                  {event.date} at {event.time}
                </p>
              </div>
            ))
          )}
        </section>

        <section className="content-card">
          <h2>Ongoing Internships</h2>

          {ongoingInternships.length === 0 ? (
            <p>No ongoing internships.</p>
          ) : (
            ongoingInternships.slice(0, 5).map((item) => (
              <div className="dashboard-list-item" key={item.id}>
                <strong>{item.student}</strong>
                <p>
                  {item.position} at {item.company}
                </p>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
