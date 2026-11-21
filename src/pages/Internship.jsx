import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import useUserRole from "../hooks/useUserRole";
import InternshipMatching from "./InternshipMatching";

function Internship() {
  const { isAdmin, loadingRole, roleError } = useUserRole();
  const canManage = !loadingRole && isAdmin;
  const [userId, setUserId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentSkills, setStudentSkills] = useState("");
  const [internships, setInternships] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [mentor, setMentor] = useState("");
  const [status, setStatus] = useState("Pending");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const uid = auth.user?.id;
      if (!uid) throw new Error("Please sign in again.");
      setUserId(uid);

      const { data: registration, error: registrationError } = await supabase
        .from("internship_registrations")
        .select("user_id, student_id, full_name, skills")
        .eq("user_id", uid)
        .maybeSingle();
      if (registrationError) throw registrationError;
      setMyRegistration(registration);
      setStudentId(registration?.student_id || "");
      setFullName(registration?.full_name || "");
      setStudentSkills((registration?.skills || []).join(", "));

      const { data: records, error: recordError } = await supabase
        .from("internships")
        .select("id, user_id, student_id, student, company, position, mentor, status, created_at")
        .order("created_at", { ascending: false });
      if (recordError) throw recordError;
      setInternships((records || []).map((x) => ({ ...x, studentId: x.student_id })));

      if (canManage) {
        const [r, p] = await Promise.all([
          supabase.from("internship_registrations")
            .select("user_id, student_id, full_name, skills")
            .order("created_at", { ascending: false }),
          supabase.from("internship_positions")
            .select("id, company, name, required_skills")
            .order("created_at", { ascending: false })
        ]);
        if (r.error) throw r.error;
        if (p.error) throw p.error;
        setRegistrations(r.data || []);
        setPositions(p.data || []);
      } else {
        setRegistrations([]);
        setPositions([]);
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadingRole) loadData();
  }, [loadingRole, isAdmin]);

  function resetForm() {
    setEditingId(null);
    setSelectedUserId("");
    setSelectedPositionId("");
    setMentor("");
    setStatus("Pending");
    setShowForm(false);
  }

  function editInternship(item) {
    if (!canManage) return;
    setEditingId(item.id);
    setSelectedUserId(item.user_id || "");
    const matched = positions.find(
      (p) => p.company === item.company && p.name === item.position
    );
    setSelectedPositionId(matched?.id || "");
    setMentor(item.mentor || "");
    setStatus(item.status || "Pending");
    setShowForm(true);
  }

  async function registerStudent(e) {
    e.preventDefault();
    if (canManage || loadingRole || saving || !userId) return;
    const id = studentId.trim();
    const name = fullName.trim();
    if (!/^2610[0-9]{3}$/.test(id) || !name) {
      setMessage("Student ID must be 7 digits starting with 2610, and name is required.");
      return;
    }
    if (!studentSkills.split(",").some((s) => s.trim())) {
      setMessage("Please enter at least one skill.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("internship_registrations")
        .upsert({
          user_id: userId,
          student_id: id,
          full_name: name,
          skills: [...new Set(studentSkills.split(",").map((s) => s.trim()).filter(Boolean))],
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      if (error) throw error;
      await loadData();
      setMessage("Your internship registration has been saved.");
    } catch (err) {
      setMessage("Registration failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveInternship(e) {
    e.preventDefault();
    if (!canManage || saving) return;
    const reg = registrations.find((r) => r.user_id === selectedUserId);
    const pos = positions.find((p) => p.id === selectedPositionId);
    if (!reg || !pos) {
      setMessage("Select a registered student and an internship position.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const row = {
        user_id: reg.user_id,
        student_id: reg.student_id,
        student: reg.full_name,
        company: pos.company,
        position: pos.name,
        mentor: mentor.trim(),
        status
      };
      const { error } = editingId
        ? await supabase.from("internships").update(row).eq("id", editingId)
        : await supabase.from("internships").insert(row);
      if (error) throw error;
      resetForm();
      await loadData();
      setMessage("Internship saved successfully.");
    } catch (err) {
      setMessage("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteInternship(id) {
    if (!canManage || saving || !window.confirm("Delete this internship?")) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("internships").delete().eq("id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      await loadData();
      setMessage("Internship deleted.");
    } catch (err) {
      setMessage("Delete failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, next) {
    if (!canManage || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("internships").update({ status: next }).eq("id", id);
      if (error) throw error;
      await loadData();
      setMessage("Status updated.");
    } catch (err) {
      setMessage("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function assignStudent(studentData, positionData) {
    if (!canManage || saving) throw new Error("Not authorized or busy.");
    if (!studentData.user_id) {
      throw new Error("Only registered students can be assigned.");
    }
    setSaving(true);
    setMessage("");
    try {
      const { data: duplicates, error: checkError } = await supabase
        .from("internships")
        .select("id")
        .eq("user_id", studentData.user_id)
        .eq("company", positionData.company)
        .eq("position", positionData.name)
        .limit(1);
      if (checkError) throw checkError;
      if (duplicates?.length) throw new Error("Student already assigned to this position.");
      const { error } = await supabase.from("internships").insert({
        user_id: studentData.user_id,
        student_id: String(studentData.id),
        student: studentData.name,
        company: positionData.company,
        position: positionData.name,
        mentor: "",
        status: "Pending"
      });
      if (error) throw error;
      await loadData();
      setMessage("Student assigned successfully.");
    } catch (err) {
      setMessage("Assignment failed: " + err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const visibleInternships = canManage
    ? internships
    : internships.filter((x) => x.user_id === userId);
  const total = visibleInternships.length;
  const ongoing = visibleInternships.filter((x) => x.status === "Ongoing").length;
  const completed = visibleInternships.filter((x) => x.status === "Completed").length;

  return (
    <div className="internship-page">
      <div className="page-heading">
        <div>
          <h2>{canManage ? "Internship Management" : "My Internship"}</h2>
          <p>{canManage
            ? "Manage registered students, companies and internship placements."
            : "Register for internship and view your assignments."}</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading || saving || loadingRole}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loadingRole && <p>Checking permissions...</p>}
      {roleError && <p role="alert" style={{ color: "#dc2626" }}>{roleError}</p>}
      {message && <p role="status">{message}</p>}
      {loadError && <p role="alert" style={{ color: "#dc2626" }}>Load failed: {loadError}</p>}

      {!loadingRole && !canManage && (
        <form className="internship-form" onSubmit={registerStudent}>
          <h3>{myRegistration ? "Update My Registration" : "Register for Internship"}</h3>
          <label htmlFor="intern-student-id">Student ID</label>
          <input id="intern-student-id" value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="2610001" pattern="2610[0-9]{3}" maxLength={7} required />
          <label htmlFor="intern-student-name">Full Name</label>
          <input id="intern-student-name" value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name" required />
          <label htmlFor="intern-student-skills">Skills (separated by commas)</label>
          <input id="intern-student-skills" value={studentSkills}
            onChange={(e) => setStudentSkills(e.target.value)}
            placeholder="Python, Java, SQL, Communication" required />
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Add the skills you already have. Admin will use them for internship matching.
          </p>
          <button className="primary-btn" type="submit" disabled={saving || loading || !userId}>
            {saving ? "Saving..." : myRegistration ? "Update Registration" : "Register"}
          </button>
          {myRegistration && <p>Your registration is saved. Admin can now assign a company.</p>}
        </form>
      )}

      {canManage && (
        <>
          <div className="table-card" style={{ marginBottom: 24 }}>
            <h3>Registered Students ({registrations.length})</h3>
            {registrations.length === 0 ? <p>No registrations yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table className="student-table">
                  <thead><tr><th>Student ID</th><th>Full Name</th><th>Skills</th><th>Assignment</th></tr></thead>
                  <tbody>{registrations.map((r) => (
                    <tr key={r.user_id}>
                      <td>{r.student_id}</td><td>{r.full_name}</td>
                      <td>{(r.skills || []).length ? (r.skills || []).map((skill) => (
                        <span className="skill-tag" key={skill}>{skill}</span>
                      )) : "Not specified"}</td>
                      <td>{internships.some((i) => i.user_id === r.user_id)
                        ? "Assigned" : "Waiting"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <button type="button" className="primary-btn" style={{ marginTop: 16 }}
              onClick={() => { resetForm(); setShowForm(true); }}>
              + Assign Internship
            </button>
          </div>

          {showForm && (
            <form className="internship-form" onSubmit={saveInternship}>
              <h3>{editingId ? "Edit Internship" : "Assign Internship"}</h3>
              <label htmlFor="assign-student">Registered Student</label>
              <select id="assign-student" required value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">Select student</option>
                {registrations.map((r) => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.student_id} - {r.full_name}
                  </option>
                ))}
              </select>
              <label htmlFor="assign-position">Company and Position</label>
              <select id="assign-position" required value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}>
                <option value="">Select internship position</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.company} - {p.name}</option>
                ))}
              </select>
              <p style={{ color: "#64748b", fontSize: 13 }}>
                Create company positions in Smart Internship Matching below.
              </p>
              <label htmlFor="assign-mentor">Mentor</label>
              <input id="assign-mentor" value={mentor}
                onChange={(e) => setMentor(e.target.value)} placeholder="Optional" />
              <label htmlFor="assign-status">Status</label>
              <select id="assign-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
              <div className="form-actions">
                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Internship"}
                </button>
                <button type="button" className="cancel-btn" disabled={saving} onClick={resetForm}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      <div className="internship-stats">
        <div className="stat-card"><p>Total Internships</p><h2>{loading ? "..." : total}</h2></div>
        <div className="stat-card"><p>Ongoing</p><h2>{loading ? "..." : ongoing}</h2></div>
        <div className="stat-card"><p>Completed</p><h2>{loading ? "..." : completed}</h2></div>
      </div>

      <div className="table-card">
        <h3>{canManage ? "All Internship Records" : "My Assignments"} ({visibleInternships.length})</h3>
        {loading ? <p>Loading internships...</p> : visibleInternships.length === 0 ? (
          <p className="empty-message">{canManage
            ? "No internship records yet." : "You have not been assigned an internship yet."}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="student-table">
              <thead><tr>
                {canManage && <th>Student</th>}
                <th>Company</th><th>Position</th><th>Mentor</th><th>Status</th>
                {canManage && <th>Actions</th>}
              </tr></thead>
              <tbody>{visibleInternships.map((item) => (
                <tr key={item.id}>
                  {canManage && <td>{item.student}</td>}
                  <td>{item.company}</td><td>{item.position}</td>
                  <td>{item.mentor || "Not assigned"}</td>
                  <td>{canManage ? (
                    <select className={`status-select ${(item.status || "Pending").toLowerCase()}`}
                      value={item.status} disabled={saving}
                      onChange={(e) => updateStatus(item.id, e.target.value)}>
                      <option value="Pending">Pending</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  ) : (
                    <span className={`internship-status ${(item.status || "Pending").toLowerCase()}`}>
                      {item.status}
                    </span>
                  )}</td>
                  {canManage && <td><div className="student-actions">
                    <button type="button" className="edit-btn" disabled={saving}
                      onClick={() => editInternship(item)}>Edit</button>
                    <button type="button" className="delete-btn" disabled={saving}
                      onClick={() => deleteInternship(item.id)}>Delete</button>
                  </div></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <InternshipMatching internships={internships} onAssign={assignStudent} />
      )}
    </div>
  );
}

export default Internship;
