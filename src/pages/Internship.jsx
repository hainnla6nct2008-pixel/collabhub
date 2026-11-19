import { useState, useEffect } from "react";
import InternshipMatching from "./InternshipMatching";

function Internship() {
  const [internships, setInternships] = useState(() => {
    try {
      const saved = localStorage.getItem("collabhub_internships");

      if (saved !== null) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) return data;
      }
    } catch (error) {
      console.error("Cannot load internships:", error);
    }
    return [];
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [student, setStudent] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [mentor, setMentor] = useState("");
  const [status, setStatus] = useState("Pending");

  useEffect(() => {
    localStorage.setItem(
      "collabhub_internships",
      JSON.stringify(internships)
    );
  }, [internships]);

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

  function saveInternship(e) {
    e.preventDefault();

    if (
      !student.trim() ||
      !company.trim() ||
      !position.trim()
    ) {
      return;
    }

    const data = {
      student: student.trim(),
      company: company.trim(),
      position: position.trim(),
      mentor: mentor.trim(),
      status
    };

    if (editingId !== null) {
      setInternships((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? { ...item, ...data }
            : item
        )
      );
    } else {
      setInternships((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          ...data
        }
      ]);
    }

    resetForm();
  }

  function deleteInternship(id) {
    if (!window.confirm("Delete this internship?")) return;

    setInternships((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (editingId === id) resetForm();
  }

  function updateStatus(id, newStatus) {
    setInternships((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, status: newStatus }
          : item
      )
    );
  }

function assignStudent(studentData, positionData) {
  const exists = internships.some((item) => {
    const sameStudent = item.studentId != null
      ? String(item.studentId) === String(studentData.id)
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

  const newInternship = {
    id: crypto.randomUUID(),
    studentId: studentData.id,
    student: studentData.name,
    company: positionData.company,
    position: positionData.name,
    mentor: "",
    status: "Pending"
  };

  setInternships((previous) => [
    ...previous,
    newInternship
  ]);
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

        <button
          className="primary-btn"
          onClick={() => {
            if (showForm) resetForm();
            else openAddForm();
          }}
        >
          {showForm ? "Cancel" : "+ Add Internship"}
        </button>
      </div>

      <div className="internship-stats">
        <div className="stat-card">
          <p>Total Internships</p>
          <h2>{total}</h2>
        </div>

        <div className="stat-card">
          <p>Ongoing</p>
          <h2>{ongoing}</h2>
        </div>

        <div className="stat-card">
          <p>Completed</p>
          <h2>{completed}</h2>
        </div>
      </div>

      {showForm && (
        <form className="internship-form" onSubmit={saveInternship}>
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
            <button className="primary-btn" type="submit">
              {editingId !== null
                ? "Save Changes"
                : "Save Internship"}
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
        <h3>Internship Records ({internships.length})</h3>

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
                      onClick={() => openEditForm(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
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
      </div>
     <InternshipMatching
  internships={internships}
  onAssign={assignStudent}
/>
    </div>
  );
}

export default Internship;
