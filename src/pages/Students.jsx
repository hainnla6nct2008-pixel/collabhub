
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ExcelImport from "../components/ExcelImport";

function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [skills, setSkills] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStudents() {
    setLoading(true);

    const { data, error } = await supabase
      .from("students")
      .select("id, name, major, skills")
      .order("id", { ascending: true });

    if (error) {
      setMessage("Load failed: " + error.message);
    } else {
      setStudents(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const q = search.toLowerCase();

    return (
      student.name.toLowerCase().includes(q) ||
      String(student.id).toLowerCase().includes(q)
    );
  });

  function resetForm() {
    setStudentId("");
    setName("");
    setMajor("");
    setSkills("");
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(student) {
    setEditingId(student.id);
    setStudentId(student.id);
    setName(student.name);
    setMajor(student.major);
    setSkills((student.skills || []).join(", "));
    setShowForm(true);
  }

  async function saveStudent(e) {
    e.preventDefault();

    if (!studentId.trim() || !name.trim()) return;

    setSaving(true);
    setMessage("");

    const studentData = {
      name: name.trim(),
      major,
      skills: [
        ...new Set(
          skills.split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ]
    };

    let error;

    if (editingId !== null) {
      ({ error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("students")
        .insert({
          id: studentId.trim(),
          ...studentData
        }));
    }

    setSaving(false);

    if (error) {
      setMessage("Save failed: " + error.message);
      return;
    }

    resetForm();
    await loadStudents();
  }

  async function importStudents(imported) {
    const rows = imported.map((student) => ({
      id: String(student.studentId).trim(),
      name: student.name.trim(),
      major: student.major.trim(),
      skills: student.skills
    }));

    const { error } = await supabase
      .from("students")
      .insert(rows);

    if (error) {
      throw new Error(error.message);
    }

    await loadStudents();
    return rows.length;
  }

  async function deleteStudent(id) {
    if (!window.confirm("Delete this student?")) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Delete failed: " + error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadStudents();
  }

  return (
    <div className="students-page">
      <div className="page-heading">
        <div>
          <h2>Student Management</h2>
          <p>Manage student profiles and skills.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            if (showForm) resetForm();
            else openAddForm();
          }}
        >
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      <ExcelImport onImport={importStudents} />

      {message && (
        <p role="status" style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      {showForm && (
        <form className="student-form" onSubmit={saveStudent}>
          <h3>
            {editingId !== null
              ? "Edit Student"
              : "Add New Student"}
          </h3>

          <label>Student ID</label>
          <input
            type="text"
            placeholder="Example: 2610001"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            pattern={editingId === null ? "2610[0-9]{3}" : undefined}
            title="Example: 2610001"
            maxLength={editingId === null ? 7 : undefined}
            readOnly={editingId !== null}
            required
          />

          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          
            <label>Major</label>
            <input
              type="text"
              placeholder="Enter your major"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              required
            />


          <label>Skills (separated by commas)</label>
          <input
            type="text"
            placeholder="Python, Java, SQL"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />

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
                  : "Save Student"}
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
        <div className="table-toolbar">
          <h3>All Students ({students.length})</h3>

          <input
            type="text"
            placeholder="Search by name or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading students from Supabase...</p>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Major</th>
                <th>Skills</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.major}</td>

                  <td>
                    {(student.skills || []).map((skill) => (
                      <span className="skill-tag" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </td>

                  <td>
                    <div className="student-actions">
                      <button
                        className="edit-btn"
                        onClick={() => openEditForm(student)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteStudent(student.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filteredStudents.length === 0 && (
          <p>No students found.</p>
        )}
      </div>
    </div>
  );
}

export default Students;
