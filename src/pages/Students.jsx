
import { useState, useEffect } from "react";

function Students() {
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem("collabhub_students");

      if (saved !== null) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) return data;
      }
    } catch (error) {
      console.error("Cannot load students:", error);
    }

    return [
      { id: 1, name: "Nguyen Van An", major: "IT", skills: ["Python", "SQL"] },
      { id: 2, name: "Tran Minh Duc", major: "IT", skills: ["Java", "HTML"] },
      { id: 3, name: "Le Thu Ha", major: "Computer Science", skills: ["Python", "AI"] },
      { id: 4, name: "Pham Quang Huy", major: "Software Engineering", skills: ["React", "CSS"] }
    ];
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [major, setMajor] = useState("Information Technology");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "collabhub_students",
      JSON.stringify(students)
    );
  }, [students]);

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setName("");
    setMajor("Information Technology");
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
    setName(student.name);
    setMajor(student.major);
    setSkills(student.skills.join(", "));
    setShowForm(true);
  }

  function saveStudent(e) {
    e.preventDefault();

    if (!name.trim()) return;

    const studentData = {
      name: name.trim(),
      major,
      skills: [
        ...new Set(
          skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        )
      ]
    };

    if (editingId !== null) {
      setStudents((previous) =>
        previous.map((student) =>
          student.id === editingId
            ? { ...student, ...studentData }
            : student
        )
      );
    } else {
      const newStudent = {
        id: Math.max(0, ...students.map((s) => Number(s.id) || 0)) + 1,
        ...studentData
      };

      setStudents((previous) => [...previous, newStudent]);
    }

    resetForm();
  }

  function deleteStudent(id) {
    if (!window.confirm("Delete this student?")) return;

    setStudents((previous) =>
      previous.filter((student) => student.id !== id)
    );

    if (editingId === id) {
      resetForm();
    }
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

      {showForm && (
        <form className="student-form" onSubmit={saveStudent}>
          <h3>
            {editingId !== null
              ? "Edit Student"
              : "Add New Student"}
          </h3>

          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Major</label>
          <select
            value={major}
            onChange={(e) => setMajor(e.target.value)}
          >
            <option value="Information Technology">
              Information Technology
            </option>
            <option value="Computer Science">
              Computer Science
            </option>
            <option value="Software Engineering">
              Software Engineering
            </option>
            <option value="IT">IT</option>
          </select>

          <label>Skills (separated by commas)</label>
          <input
            type="text"
            placeholder="Python, Java, SQL"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />

          <div className="form-actions">
            <button className="primary-btn" type="submit">
              {editingId !== null
                ? "Save Changes"
                : "Save Student"}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={resetForm}
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
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="student-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Major</th>
              <th>Skills</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>#{student.id}</td>
                <td>{student.name}</td>
                <td>{student.major}</td>
                <td>
                  {student.skills.map((skill) => (
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

        {filteredStudents.length === 0 && (
          <p>No students found.</p>
        )}
      </div>
    </div>
  );
}

export default Students;
