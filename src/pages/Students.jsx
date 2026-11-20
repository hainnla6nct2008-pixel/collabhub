
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ExcelImport from "../components/ExcelImport";
import useUserRole from "../hooks/useUserRole";

function Students() {
  const { isAdmin, loadingRole, roleError } = useUserRole();

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
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const canManage = !loadingRole && isAdmin;

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
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!loadingRole && !isAdmin) {
      setShowForm(false);
      setEditingId(null);
    }
  }, [loadingRole, isAdmin]);

  const filteredStudents = students.filter((student) => {
    const q = search.trim().toLowerCase();

    return (
      String(student.name || "").toLowerCase().includes(q) ||
      String(student.id || "").toLowerCase().includes(q)
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
    if (!canManage) return;

    resetForm();
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(student) {
    if (!canManage) return;

    setEditingId(student.id);
    setStudentId(student.id);
    setName(student.name || "");
    setMajor(student.major || "");
    setSkills((student.skills || []).join(", "));
    setMessage("");
    setShowForm(true);
  }

  async function saveStudent(e) {
    e.preventDefault();

    if (!canManage || saving) {
      return;
    }

    const id = studentId.trim();
    const fullName = name.trim();
    const studentMajor = major.trim();

    if (!id || !fullName || !studentMajor) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (editingId === null && !/^2610[0-9]{3}$/.test(id)) {
      setMessage(
        "Student ID must have 7 digits and start with 2610."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const studentData = {
      name: fullName,
      major: studentMajor,
      skills: [
        ...new Set(
          skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ]
    };

    try {
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
            id,
            ...studentData
          }));
      }

      if (error) {
        throw error;
      }

      resetForm();
      await loadStudents();
      setMessage("Student saved successfully.");
    } catch (err) {
      setMessage(
        "Save failed: " +
        (err?.message || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  }

  async function importStudents(imported) {
    if (!canManage) {
      throw new Error(
        "Only Admin can import students."
      );
    }

    if (!Array.isArray(imported) || imported.length === 0) {
      throw new Error("No students to import.");
    }

    const rows = imported.map((student) => ({
      id: String(student.studentId).trim(),
      name: String(student.name || "").trim(),
      major: String(student.major || "").trim(),
      skills: Array.isArray(student.skills)
        ? student.skills
        : []
    }));

    const invalid = rows.some(
      (student) =>
        !/^2610[0-9]{3}$/.test(student.id) ||
        !student.name ||
        !student.major
    );

    if (invalid) {
      throw new Error(
        "Invalid student data. Check IDs, names and majors."
      );
    }

    setMessage("");

    const { error } = await supabase
      .from("students")
      .insert(rows);

    if (error) {
      throw new Error(error.message);
    }

    await loadStudents();
    setMessage(
      `Imported ${rows.length} students successfully.`
    );

    return rows.length;
  }

  async function deleteStudent(id) {
    if (!canManage || deletingId !== null) {
      return;
    }

    if (!window.confirm("Delete this student?")) {
      return;
    }

    setDeletingId(id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      if (editingId === id) {
        resetForm();
      }

      await loadStudents();
      setMessage("Student deleted successfully.");
    } catch (err) {
      setMessage(
        "Delete failed: " +
        (err?.message || "Unknown error")
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="students-page">
      <div className="page-heading">
        <div>
          <h2>Student Management</h2>

          <p>
            {canManage
              ? "Manage student profiles and skills."
              : "View student profiles and skills."}
          </p>
        </div>

        {canManage && (
          <button
            className="primary-btn"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                openAddForm();
              }
            }}
            disabled={saving}
          >
            {showForm ? "Cancel" : "+ Add Student"}
          </button>
        )}
      </div>

      {loadingRole ? (
        <p>Checking account permissions...</p>
      ) : canManage ? (
        <ExcelImport onImport={importStudents} />
      ) : (
        <p className="student-readonly">
          Read-only access: only Admin can modify
          student information.
        </p>
      )}

      {roleError && (
        <p role="alert" className="auth-error">
          Unable to load permissions: {roleError}
        </p>
      )}

      {message && (
        <p role="status" style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      {canManage && showForm && (
        <form
          className="student-form"
          onSubmit={saveStudent}
        >
          <h3>
            {editingId !== null
              ? "Edit Student"
              : "Add New Student"}
          </h3>

          <label htmlFor="student-id">
            Student ID
          </label>

          <input
            id="student-id"
            type="text"
            placeholder="Example: 2610001"
            value={studentId}
            onChange={(e) =>
              setStudentId(e.target.value)
            }
            pattern={
              editingId === null
                ? "2610[0-9]{3}"
                : undefined
            }
            title="Example: 2610001"
            maxLength={
              editingId === null ? 7 : undefined
            }
            readOnly={editingId !== null}
            required
          />

          <label htmlFor="student-name">
            Full Name
          </label>

          <input
            id="student-name"
            type="text"
            placeholder="Enter student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="student-major">
            Major
          </label>

          <input
            id="student-major"
            type="text"
            placeholder="Enter your major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            required
          />

          <label htmlFor="student-skills">
            Skills (separated by commas)
          </label>

          <input
            id="student-skills"
            type="text"
            placeholder="Python, Java, SQL"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />

          <div className="form-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={saving || !canManage}
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
          <h3>
            All Students ({students.length})
          </h3>

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

                {canManage && (
                  <th>Actions</th>
                )}
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
                      <span
                        className="skill-tag"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </td>

                  {canManage && (
                    <td>
                      <div className="student-actions">
                        <button
                          className="edit-btn"
                          onClick={() =>
                            openEditForm(student)
                          }
                          disabled={saving || deletingId !== null}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            deleteStudent(student.id)
                          }
                          disabled={saving || deletingId !== null}
                        >
                          {deletingId === student.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  )}
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
