
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Dashboard() {
  const [studentCount, setStudentCount] = useState(null);
  const [groupCount, setGroupCount] = useState(null);
  const [events, setEvents] = useState([]);
  const [internships, setInternships] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshStats() {
    setLoading(true);
    setError("");

    try {
      const [
        studentResult,
        groupResult,
        eventResult,
        internshipResult
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*", {
            count: "exact",
            head: true
          }),

        supabase
          .from("study_group_sets")
          .select("groups")
          .eq("id", "main")
          .maybeSingle(),

        supabase
          .from("events")
          .select("id, title, date, time, type")
          .order("date", { ascending: true })
          .order("time", { ascending: true }),

        supabase
          .from("internships")
          .select(
            "id, student, company, position, mentor, status"
          )
          .order("created_at", { ascending: false })
      ]);

      const errors = [];

      if (studentResult.error) {
        errors.push(
          "Students: " + studentResult.error.message
        );
        setStudentCount(null);
      } else {
        setStudentCount(studentResult.count ?? 0);
      }

      if (groupResult.error) {
        errors.push(
          "Study Groups: " + groupResult.error.message
        );
        setGroupCount(null);
      } else {
        const groups = groupResult.data?.groups;

        setGroupCount(
          Array.isArray(groups) ? groups.length : 0
        );
      }

      if (eventResult.error) {
        errors.push(
          "Events: " + eventResult.error.message
        );
        setEvents([]);
      } else {
        setEvents(eventResult.data || []);
      }

      if (internshipResult.error) {
        errors.push(
          "Internships: " + internshipResult.error.message
        );
        setInternships([]);
      } else {
        setInternships(internshipResult.data || []);
      }

      setError(errors.join(" | "));
    } catch (err) {
      setError("Failed to refresh: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStats();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(
        event.date + "T00:00:00"
      );

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

  const completedInternships = internships.filter(
    (item) => item.status === "Completed"
  );

  return (
    <div className="dashboard-page">
      <section className="welcome">
        <h2>Welcome to CollabHub!</h2>

        <p>
          Manage your study groups, schedules
          and internships in one place.
        </p>

        <button
          type="button"
          className="primary-btn"
          onClick={refreshStats}
          disabled={loading}
          style={{ marginTop: "15px" }}
        >
          {loading
            ? "Refreshing..."
            : "Refresh Statistics"}
        </button>
      </section>

      {error && (
        <p
          role="alert"
          style={{
            color: "#dc2626",
            marginBottom: "16px"
          }}
        >
          {error}
        </p>
      )}

      <section className="stats">
        <div className="stat-card">
          <p>Total Students</p>
          <h2>
            {studentCount === null
              ? "..."
              : studentCount}
          </h2>
        </div>

        <div className="stat-card">
          <p>Study Groups</p>
          <h2>
            {groupCount === null
              ? "..."
              : groupCount}
          </h2>
        </div>

        <div className="stat-card">
          <p>Upcoming Events</p>
          <h2>
            {loading ? "..." : upcomingEvents.length}
          </h2>
        </div>

        <div className="stat-card">
          <p>Internships</p>
          <h2>
            {loading ? "..." : internships.length}
          </h2>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="content-card">
          <h2>Upcoming Events</h2>

          {loading ? (
            <p>Loading events...</p>
          ) : upcomingEvents.length === 0 ? (
            <p>No upcoming events.</p>
          ) : (
            upcomingEvents.slice(0, 5).map((event) => (
              <div
                className="dashboard-list-item"
                key={event.id}
              >
                <strong>{event.title}</strong>
                <p>
                  {event.date} at{" "}
                  {event.time?.slice(0, 5)}
                </p>
              </div>
            ))
          )}
        </section>

        <section className="content-card">
          <h2>Ongoing Internships</h2>

          {loading ? (
            <p>Loading internships...</p>
          ) : ongoingInternships.length === 0 ? (
            <p>No ongoing internships.</p>
          ) : (
            ongoingInternships
              .slice(0, 5)
              .map((item) => (
                <div
                  className="dashboard-list-item"
                  key={item.id}
                >
                  <strong>{item.student}</strong>

                  <p>
                    {item.position} at {item.company}
                  </p>
                </div>
              ))
          )}
        </section>
      </div>

      <section
        className="content-card"
        style={{ marginTop: "20px" }}
      >
        <h2>Internship Overview</h2>

        <div className="internship-stats">
          <div className="stat-card">
            <p>Total Internships</p>
            <h2>{loading ? "..." : internships.length}</h2>
          </div>

          <div className="stat-card">
            <p>Ongoing</p>
            <h2>
              {loading ? "..." : ongoingInternships.length}
            </h2>
          </div>

          <div className="stat-card">
            <p>Completed</p>
            <h2>
              {loading ? "..." : completedInternships.length}
            </h2>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
