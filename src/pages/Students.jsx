
import { useState, useEffect } from "react";
import ExcelImport from "../components/ExcelImport";

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
      {
        id: 1,
        name: "Nguyen Van An",
        major: "IT",
        skills: ["Python", "SQL"]
      },
      {
        id: 2,
        name: "Tran Minh Duc",
        major: "IT",
        skills: ["Java", "HTML"]
      },
      {
        id: 3,
        name: "Le Thu Ha",
        major: "Computer Science",
        skills: ["Python", "AI"]
      },
      {
        id: 4,
        name: "Pham Quang Huy",
        major: "Software Engineering",
        skills: ["React", "CSS"]
      }
    ];
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("Information Technology");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "collabhub_students",
      JSON.stringify(students)
    );
  }, [students]);

  const filteredStudents = students.filter((student) => {
    const q = search.toLowerCase();

    return (
      student.name.toLowerCase().includes(q) ||
      String(student.studentId ?? student.id)
        .toLowerCase()
        .includes(q)
    );
  });

  function resetForm() {
    setStudentId("");
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
    setStudentId(String(student.studentId ?? student.id));
    setName(student.name);
    setMajor(student.major);
    setSkills(student.skills.join(", "));
    setShowForm(true);
  }

  function saveStudent(e) {
    e.preventDefault();

    if (!name.trim() || !studentId.trim()) return;

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
            ? {
                ...student,
                ...studentData
              }
            : student
        )
      );
    } else {
      const id = studentId.trim();

      const newStudent = {
        id,
        studentId: id,
        ...studentData
      };

      setStudents((previous) => [
        ...previous,
        newStudent
      ]);
    }

    resetForm();
  }

  function importStudents(imported) {
    const newStudents = imported.map((student) => ({
      id: student.studentId.trim(),
      studentId: student.studentId.trim(),
      name: student.name.trim(),
      major: student.major.trim(),
      skills: student.skills
    }));

    setStudents((previous) => [
      ...previous,
      ...newStudents
    ]);

    return newStudents.length;
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

      <ExcelImport onImport={importStudents} />

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
            title="Student ID must have 7 digits, for example 2610001"
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
            placeholder="Search by name or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
            {filteredStudents.map((student, index) => (
              <tr key={`${student.id}-${index}`}>
                <td>
                  {student.studentId ?? student.id}
                </td>

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
