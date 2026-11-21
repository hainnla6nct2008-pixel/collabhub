import { useEffect, useState } from "react";
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
      const [registrations, profiles, positionResult] = await Promise.all([
        supabase.from("internship_registrations")
          .select("user_id, student_id, full_name"),
        supabase.from("students").select("id, name, major, skills"),
        supabase.from("internship_positions")
          .select("id, company, name, required_skills")
          .order("created_at", { ascending: false })
      ]);
      if (registrations.error) throw registrations.error;
      if (profiles.error) throw profiles.error;
      if (positionResult.error) throw positionResult.error;

      const profileMap = new Map((profiles.data || []).map((s) => [String(s.id), s]));
      setStudents((registrations.data || []).map((reg) => {
        const profile = profileMap.get(String(reg.student_id));
        return {
          id: reg.student_id,
          name: reg.full_name,
          major: profile?.major || "Not specified",
          skills: profile?.skills || [],
          user_id: reg.user_id
        };
      }));
      const list = (positionResult.data || []).map((p) => ({
        id: p.id,
        company: p.company,
        name: p.name,
        requiredSkills: p.required_skills || []
      }));
      setPositions(list);
      setResults([]);
      setSelectedId((old) => list.some((p) => p.id === old) ? old : "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function addPosition(e) {
    e.preventDefault();
    if (saving) return;
    const requiredSkills = [...new Set(skills.split(",").map((s) => s.trim()).filter(Boolean))];
    if (!company.trim() || !positionName.trim() || requiredSkills.length === 0) {
      setMessage("Complete all required fields.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("internship_positions").insert({
        company: company.trim(),
        name: positionName.trim(),
        required_skills: requiredSkills
      });
      if (error) throw error;
      setCompany(""); setPositionName(""); setSkills("");
      await loadData();
      setMessage("Position added successfully. Use Refresh in Internship Management to update the assignment form.");
    } catch (err) {
      setMessage("Failed to add position: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function findMatches() {
    const position = positions.find((p) => p.id === selectedId);
    if (!position) return setMessage("Select an internship position.");
    if (students.length === 0) return setMessage("No registered students yet.");
    try {
      setResults(matchStudents(students, position));
      setMessage("");
    } catch (err) {
      setMessage("Matching failed: " + err.message);
    }
  }

  async function assignMatchedStudent(student) {
    const position = positions.find((p) => p.id === selectedId);
    if (!position || assigningId !== null || !onAssign) return;
    setAssigningId(student.id);
    setMessage("");
    try {
      const registered = students.find((s) => String(s.id) === String(student.id));
      if (!registered?.user_id) throw new Error("Student registration not found.");
      await onAssign({ ...student, user_id: registered.user_id }, position);
      setMessage("Student assigned successfully.");
    } catch (err) {
      setMessage("Assignment failed: " + err.message);
    } finally {
      setAssigningId(null);
    }
  }

  async function deletePosition(id) {
    if (saving || !window.confirm("Delete this internship position?")) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("internship_positions").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      setMessage("Position deleted. Existing internship records are kept.");
    } catch (err) {
      setMessage("Delete failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function isAssigned(student) {
    const position = positions.find((p) => p.id === selectedId);
    if (!position) return false;
    return internships.some((i) =>
      (i.user_id ? i.user_id === student.user_id : String(i.student_id) === String(student.id)) &&
      i.company === position.company && i.position === position.name
    );
  }

  return (
    <section className="matching-page">
      <div className="matching-heading">
        <h2>Smart Internship Matching</h2>
        <p>Recommend registered students based on required skills.</p>
        <button type="button" onClick={loadData} disabled={loading || saving}>
          {loading ? "Loading..." : "Refresh Matching"}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {message && <p role="status">{message}</p>}

      <div className="matching-layout">
        <form className="matching-card" onSubmit={addPosition}>
          <h3>Create Internship Position</h3>
          <label htmlFor="position-company">Company</label>
          <input id="position-company" value={company} onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. FPT Software" required />
          <label htmlFor="position-name">Position Name</label>
          <input id="position-name" value={positionName} onChange={(e) => setPositionName(e.target.value)}
            placeholder="e.g. Backend Developer Intern" required />
          <label htmlFor="position-skills">Required Skills</label>
          <input id="position-skills" value={skills} onChange={(e) => setSkills(e.target.value)}
            placeholder="Python, SQL, Java" required />
          <button type="submit" className="primary-btn" disabled={loading || saving || Boolean(error)}>
            {saving ? "Saving..." : "+ Add Position"}
          </button>
        </form>

        <div className="matching-card">
          <h3>Find Matching Students</h3>
          <label htmlFor="choose-position">Select Internship Position</label>
          <select id="choose-position" value={selectedId} disabled={loading || saving}
            onChange={(e) => { setSelectedId(e.target.value); setResults([]); }}>
            <option value="">Select position</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.company} - {p.name}</option>)}
          </select>
          <p>Registered Students: {students.length}</p>
          <button type="button" className="primary-btn" onClick={findMatches}
            disabled={loading || saving || Boolean(error) || !selectedId || students.length === 0}>
            Find Matching Students
          </button>
        </div>
      </div>

      <div className="matching-card">
        <h3>Available Positions ({positions.length})</h3>
        {loading ? <p>Loading positions...</p> : positions.length === 0 ? (
          <p>No positions yet.</p>
        ) : positions.map((p) => (
          <div className="position-item" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              <p>{p.company}</p>
              {p.requiredSkills.map((s) => <span className="skill-tag" key={s}>{s}</span>)}
            </div>
            <button type="button" className="delete-btn" disabled={saving}
              onClick={() => deletePosition(p.id)}>Delete</button>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="matching-card">
          <h3>Recommended Registered Students</h3>
          {results.map((student, index) => {
            const assigned = isAssigned(student);
            return (
              <div className="match-result" key={student.user_id || student.id}>
                <div className="match-result-header">
                  <div><strong>#{index + 1} {student.name}</strong><p>{student.major}</p></div>
                  <strong className="match-score">{student.score}%</strong>
                </div>
                <div className="match-progress"><div style={{ width: `${student.score}%` }} /></div>
                <p>Matched Skills: {student.matchedSkills.join(", ") || "None"}</p>
                <p>Missing Skills: {student.missingSkills.join(", ") || "None"}</p>
                <button type="button" className="primary-btn assign-btn"
                  disabled={assigned || assigningId !== null || saving}
                  onClick={() => assignMatchedStudent(student)}>
                  {assigned ? "Assigned" : assigningId === student.id ? "Assigning..." : "Assign Student"}
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
