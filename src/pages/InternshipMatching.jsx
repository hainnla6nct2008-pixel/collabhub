
import { useState, useEffect } from "react";
import { matchStudents } from "../algorithms/internshipAlgorithm";

function readData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function InternshipMatching({ internships, onAssign }) {
  const [students] = useState(() =>
    readData("collabhub_students")
  );

  const [positions, setPositions] = useState(() =>
    readData("collabhub_positions")
  );

  const [company, setCompany] = useState("");
  const [positionName, setPositionName] = useState("");
  const [skills, setSkills] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    localStorage.setItem(
      "collabhub_positions",
      JSON.stringify(positions)
    );
  }, [positions]);

  function addPosition(e) {
    e.preventDefault();

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

    const newPosition = {
      id: crypto.randomUUID(),
      company: company.trim(),
      name: positionName.trim(),
      requiredSkills
    };

    setPositions((previous) => [
      ...previous,
      newPosition
    ]);

    setCompany("");
    setPositionName("");
    setSkills("");
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

function assignMatchedStudent(student) {
  const position = positions.find(
    (item) => item.id === selectedId
  );

  if (!position) {
    alert("Please select an internship position.");
    return;
  }

  onAssign(student, position);
}

  function deletePosition(id) {
    if (!window.confirm("Delete this position?")) return;

    setPositions((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (selectedId === id) {
      setSelectedId("");
      setResults([]);
    }
  }

  return (
    <section className="matching-page">
      <div className="matching-heading">
        <h2>Smart Internship Matching</h2>
        <p>
          Find students who match company requirements.
        </p>
      </div>

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

          <button className="primary-btn" type="submit">
            + Add Position
          </button>
        </form>

        <div className="matching-card">
          <h3>Find Matching Students</h3>

          <label>Select Internship Position</label>

          <select
            value={selectedId}
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
            disabled={!selectedId || students.length === 0}
          >
            Find Matching Students
          </button>
        </div>
      </div>

      <div className="matching-card">
        <h3>Available Positions ({positions.length})</h3>

        {positions.length === 0 ? (
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
                className="delete-btn"
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

          {results.map((student, index) => (
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
  disabled={internships.some((item) => {
    const position = positions.find(
      (p) => p.id === selectedId
    );

    if (!position) return false;

    const sameStudent = item.studentId != null
      ? String(item.studentId) === String(student.id)
      : item.student === student.name;

    return (
      sameStudent &&
      item.company === position.company &&
      item.position === position.name
    );
  })}
  onClick={() => assignMatchedStudent(student)}
>
  {internships.some((item) => {
    const position = positions.find(
      (p) => p.id === selectedId
    );

    if (!position) return false;

    const sameStudent = item.studentId != null
      ? String(item.studentId) === String(student.id)
      : item.student === student.name;

    return (
      sameStudent &&
      item.company === position.company &&
      item.position === position.name
    );
  }) ? "Assigned" : "Assign Student"}
</button>

            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default InternshipMatching;
