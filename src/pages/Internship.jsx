
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import InternshipMatching from "./InternshipMatching";

function Internship() {
  const [internships, setInternships] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [student, setStudent] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [mentor, setMentor] = useState("");
  const [status, setStatus] = useState("Pending");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadInternships() {
    setLoading(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("internships")
        .select(
          "id, student_id, student, company, position, mentor, status"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const records = (data || []).map((item) => ({
        ...item,
        studentId: item.student_id
      }));

      setInternships(records);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInternships();
  }, []);

  function resetForm() {
    setStudent("");
    setCompany("");
    setPosition("");
    setMentor("");
    setStatus("Pending");
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setStudent(item.student);
    setCompany(item.company);
    setPosition(item.position);
    setMentor(item.mentor || "");
    setStatus(item.status);
    setShowForm(true);
  }

  async function saveInternship(e) {
    e.preventDefault();

    if (
      !student.trim() ||
      !company.trim() ||
      !position.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    const data = {
      student: student.trim(),
      company: company.trim(),
      position: position.trim(),
      mentor: mentor.trim(),
      status
    };

    try {
      let result;

      if (editingId !== null) {
        result = await supabase
          .from("internships")
          .update(data)
          .eq("id", editingId);
      } else {
        result = await supabase
          .from("internships")
          .insert(data);
      }

      if (result.error) throw result.error;

      resetForm();
      await loadInternships();
      setMessage("Internship saved successfully.");
    } catch (error) {
      setMessage("Save failed: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteInternship(id) {
    if (saving) return;

    if (!window.confirm("Delete this internship?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("internships")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (editingId === id) resetForm();

      await loadInternships();
      setMessage("Internship deleted successfully.");
    } catch (error) {
      setMessage("Delete failed: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, newStatus) {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("internships")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      await loadInternships();
      setMessage("Status updated successfully.");
    } catch (error) {
      setMessage("Status update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function assignStudent(studentData, positionData) {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const studentId = String(studentData.id);

      const exists = internships.some((item) => {
        const sameStudent = item.studentId != null
          ? String(item.studentId) === studentId
          : item.student === studentData.name;

        return (
          sameStudent &&
          item.company === positionData.company &&
          item.position === positionData.name
        );
      });

      if (exists) {
        alert("This student is already assigned to this position.");
        return;
      }

      const { data: duplicate, error: checkError } =
        await supabase
          .from("internships")
          .select("id")
          .eq("student_id", studentId)
          .eq("company", positionData.company)
          .eq("position", positionData.name)
          .limit(1);

      if (checkError) throw checkError;

      if (duplicate && duplicate.length > 0) {
        alert("This student is already assigned to this position.");
        return;
      }

      const { error } = await supabase
        .from("internships")
        .insert({
          student_id: studentId,
          student: studentData.name,
          company: positionData.company,
          position: positionData.name,
          mentor: "",
          status: "Pending"
        });

      if (error) throw error;

      await loadInternships();
      setMessage("Student assigned successfully.");
    } catch (error) {
      setMessage("Assignment failed: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const total = internships.length;

  const ongoing = internships.filter(
    (item) => item.status === "Ongoing"
  ).length;

  const completed = internships.filter(
    (item) => item.status === "Completed"
  ).length;

  return (
    <div className="internship-page">
      <div className="page-heading">
        <div>
          <h2>Internship Management</h2>
          <p>Track student internships and company placements.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={loadInternships}
            disabled={loading || saving}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            className="primary-btn"
            disabled={saving}
            onClick={() => {
              if (showForm) resetForm();
              else openAddForm();
            }}
          >
            {showForm ? "Cancel" : "+ Add Internship"}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      {loadError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          Failed to load internships: {loadError}
        </p>
      )}

      <div className="internship-stats">
        <div className="stat-card">
          <p>Total Internships</p>
          <h2>{loading ? "..." : total}</h2>
        </div>

        <div className="stat-card">
          <p>Ongoing</p>
          <h2>{loading ? "..." : ongoing}</h2>
        </div>

        <div className="stat-card">
          <p>Completed</p>
          <h2>{loading ? "..." : completed}</h2>
        </div>
      </div>

      {showForm && (
        <form
          className="internship-form"
          onSubmit={saveInternship}
        >
          <h3>
            {editingId !== null
              ? "Edit Internship"
              : "Add New Internship"}
          </h3>

          <label>Student Name</label>
          <input
            type="text"
            value={student}
            onChange={(e) => setStudent(e.target.value)}
            placeholder="Enter student name"
            required
          />

          <label>Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Enter company name"
            required
          />

          <label>Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Frontend Developer"
            required
          />

          <label>Mentor</label>
          <input
            type="text"
            value={mentor}
            onChange={(e) => setMentor(e.target.value)}
            placeholder="Enter mentor name (optional)"
          />

          <label>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="form-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Save Internship"}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="table-card">
        <h3>Internship Records ({internships.length})</h3>

        {loading ? (
          <p>Loading internships from Supabase...</p>
        ) : (
          <>
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Company</th>
                  <th>Position</th>
                  <th>Mentor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {internships.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student}</td>
                    <td>{item.company}</td>
                    <td>{item.position}</td>
                    <td>{item.mentor || "Not assigned"}</td>

                    <td>
                      <select
                        className={`status-select ${item.status.toLowerCase()}`}
                        value={item.status}
                        disabled={saving}
                        onChange={(e) =>
                          updateStatus(item.id, e.target.value)
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    <td>
                      <div className="student-actions">
                        <button
                          className="edit-btn"
                          disabled={saving}
                          onClick={() => openEditForm(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          disabled={saving}
                          onClick={() => deleteInternship(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {internships.length === 0 && (
              <p className="empty-message">
                No internship records yet.
              </p>
            )}
          </>
        )}
      </div>

      <InternshipMatching
        internships={internships}
        onAssign={assignStudent}
      />
    </div>
  );
}

export default Internship;
