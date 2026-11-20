
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { matchStudents } from "../algorithms/internshipAlgorithm";

function InternshipMatching({ internships = [], onAssign }) {
  const [students, setStudents] = useState([]);
  const [positions, setPositions] = useState([]);

  const [company, setCompany] = useState("");
  const [positionName, setPositionName] = useState("");
  const [skills, setSkills] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [studentResult, positionResult] =
        await Promise.all([
          supabase
            .from("students")
            .select("id, name, major, skills")
            .order("id", { ascending: true }),

          supabase
            .from("internship_positions")
            .select("id, company, name, required_skills")
            .order("created_at", { ascending: false })
        ]);

      if (studentResult.error) {
        throw studentResult.error;
      }

      if (positionResult.error) {
        throw positionResult.error;
      }

      setStudents(studentResult.data || []);

      const list = (positionResult.data || []).map(
        (item) => ({
          id: item.id,
          company: item.company,
          name: item.name,
          requiredSkills: item.required_skills || []
        })
      );

      setPositions(list);
      setResults([]);

      setSelectedId((previous) =>
        list.some((item) => item.id === previous)
          ? previous
          : ""
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addPosition(e) {
    e.preventDefault();

    if (saving) return;

    const requiredSkills = [
      ...new Set(
        skills.split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      )
    ];

    if (
      !company.trim() ||
      !positionName.trim() ||
      requiredSkills.length === 0
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("internship_positions")
        .insert({
          company: company.trim(),
          name: positionName.trim(),
          required_skills: requiredSkills
        });

      if (error) throw error;

      setCompany("");
      setPositionName("");
      setSkills("");

      await loadData();
      setMessage("Position added successfully.");
    } catch (err) {
      setMessage("Failed to add position: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function findMatches() {
    const position = positions.find(
      (item) => item.id === selectedId
    );

    if (!position) {
      alert("Please select an internship position.");
      return;
    }

    if (students.length === 0) {
      alert("Please add students first.");
      return;
    }

    setResults(matchStudents(students, position));
  }

  async function assignMatchedStudent(student) {
    const position = positions.find(
      (item) => item.id === selectedId
    );

    if (!position) {
      alert("Please select an internship position.");
      return;
    }

    if (assigningId !== null) return;

    setAssigningId(student.id);

    try {
      await onAssign(student, position);
    } finally {
      setAssigningId(null);
    }
  }

  async function deletePosition(id) {
    if (saving) return;

    if (!window.confirm("Delete this position?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("internship_positions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (selectedId === id) {
        setSelectedId("");
        setResults([]);
      }

      await loadData();
      setMessage("Position deleted successfully.");
    } catch (err) {
      setMessage("Failed to delete position: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function isAssigned(student) {
    const position = positions.find(
      (item) => item.id === selectedId
    );

    if (!position) return false;

    return internships.some((item) => {
      const sameStudent = item.studentId != null
        ? String(item.studentId) === String(student.id)
        : item.student === student.name;

      return (
        sameStudent &&
        item.company === position.company &&
        item.position === position.name
      );
    });
  }

  return (
    <section className="matching-page">
      <div className="matching-heading">
        <h2>Smart Internship Matching</h2>
        <p>
          Find students who match company requirements.
        </p>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || saving}
        >
          {loading ? "Loading..." : "Refresh Matching"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          Failed to load matching data: {error}
        </p>
      )}

      {message && (
        <p role="status">
          {message}
        </p>
      )}

      <div className="matching-layout">
        <form
          className="matching-card"
          onSubmit={addPosition}
        >
          <h3>Create Internship Position</h3>

          <label>Company</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. FPT Software"
            required
          />

          <label>Position Name</label>
          <input
            value={positionName}
            onChange={(e) => setPositionName(e.target.value)}
            placeholder="e.g. Backend Developer Intern"
            required
          />

          <label>Required Skills</label>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Python, SQL, Java"
            required
          />

          <button
            className="primary-btn"
            type="submit"
            disabled={loading || saving || Boolean(error)}
          >
            {saving ? "Saving..." : "+ Add Position"}
          </button>
        </form>

        <div className="matching-card">
          <h3>Find Matching Students</h3>

          <label>Select Internship Position</label>

          <select
            value={selectedId}
            disabled={loading || saving}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setResults([]);
            }}
          >
            <option value="">Select position</option>

            {positions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.company} - {item.name}
              </option>
            ))}
          </select>

          <p>
            Available Students: {students.length}
          </p>

          <button
            className="primary-btn"
            type="button"
            onClick={findMatches}
            disabled={
              loading ||
              saving ||
              Boolean(error) ||
              !selectedId ||
              students.length === 0
            }
          >
            Find Matching Students
          </button>
        </div>
      </div>

      <div className="matching-card">
        <h3>Available Positions ({positions.length})</h3>

        {loading ? (
          <p>Loading positions from Supabase...</p>
        ) : positions.length === 0 ? (
          <p>No internship positions yet.</p>
        ) : (
          positions.map((item) => (
            <div className="position-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.company}</p>

                {item.requiredSkills.map((skill) => (
                  <span className="skill-tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="delete-btn"
                disabled={saving}
                onClick={() => deletePosition(item.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {results.length > 0 && (
        <div className="matching-card">
          <h3>Recommended Students</h3>

          {results.map((student, index) => {
            const assigned = isAssigned(student);

            return (
              <div className="match-result" key={student.id}>
                <div className="match-result-header">
                  <div>
                    <strong>
                      #{index + 1} {student.name}
                    </strong>
                    <p>{student.major}</p>
                  </div>

                  <strong className="match-score">
                    {student.score}%
                  </strong>
                </div>

                <div className="match-progress">
                  <div
                    style={{ width: `${student.score}%` }}
                  />
                </div>

                <p>
                  Matched Skills:{" "}
                  {student.matchedSkills.join(", ") || "None"}
                </p>

                <p>
                  Missing Skills:{" "}
                  {student.missingSkills.join(", ") || "None"}
                </p>

                <button
                  type="button"
                  className="primary-btn assign-btn"
                  disabled={
                    assigned ||
                    assigningId !== null ||
                    saving
                  }
                  onClick={() => assignMatchedStudent(student)}
                >
                  {assigned
                    ? "Assigned"
                    : assigningId === student.id
                      ? "Assigning..."
                      : "Assign Student"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default InternshipMatching;
