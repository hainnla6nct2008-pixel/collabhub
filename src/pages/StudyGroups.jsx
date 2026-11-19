
import { useState } from "react";
import {
  generateSmartGroups,
  calculateGroupDiversity
} from "../algorithms/groupAlgorithm";

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function StudyGroups() {
  const [students] = useState(() =>
    readStorage("collabhub_students")
  );

  const [groups, setGroups] = useState(() =>
    readStorage("collabhub_groups")
  );

  const [groupSize, setGroupSize] = useState(4);

  const [selectedIds, setSelectedIds] = useState(() =>
    students.map((student) => student.id)
  );

  function toggleStudent(id) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((studentId) => studentId !== id)
        : [...previous, id]
    );
  }

  function selectAll() {
    setSelectedIds(students.map((s) => s.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function generateGroups() {
    const selectedStudents = students.filter((student) =>
      selectedIds.includes(student.id)
    );

    if (selectedStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }

    const result = generateSmartGroups(
      selectedStudents,
      groupSize
    );

    setGroups(result);

    localStorage.setItem(
      "collabhub_groups",
      JSON.stringify(result)
    );
  }

  function deleteGroups() {
    if (!window.confirm("Delete all generated groups?")) {
      return;
    }

    setGroups([]);
    localStorage.setItem("collabhub_groups", "[]");
  }

  return (
    <div className="groups-page">
      <div className="page-heading">
        <div>
          <h2>Study Groups</h2>
          <p>
            Create balanced groups based on student skills.
          </p>
        </div>
      </div>

      <div className="generator-card">
        <h3>Smart Group Generator</h3>

        <p>
          Select students and choose the maximum
          number of members per group.
        </p>

        <div className="selection-header">
          <h3>
            Select Students ({selectedIds.length}/{students.length})
          </h3>

          <div className="selection-actions">
            <button onClick={selectAll}>
              Select All
            </button>

            <button onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <p>
            No students found. Please add students
            in the Students page first.
          </p>
        ) : (
          <div className="student-selection-grid">
            {students.map((student) => (
              <label
                className="select-student-card"
                key={student.id}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                />

                <div>
                  <strong>{student.name}</strong>
                  <p>{student.major}</p>

                  <div>
                    {(student.skills || []).map((skill) => (
                      <span
                        className="skill-tag"
                        key={skill}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="generator-controls">
          <div>
            <label>Maximum students per group</label>

            <select
              value={groupSize}
              onChange={(e) =>
                setGroupSize(Number(e.target.value))
              }
            >
              <option value={2}>2 students</option>
              <option value={3}>3 students</option>
              <option value={4}>4 students</option>
              <option value={5}>5 students</option>
              <option value={6}>6 students</option>
              <option value={8}>8 students</option>
            </select>
          </div>

          <button
            className="primary-btn"
            onClick={generateGroups}
            disabled={selectedIds.length === 0}
          >
            Generate Smart Groups
          </button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="groups-result">
          <div className="groups-result-header">
            <h3>
              Generated Groups ({groups.length})
            </h3>

            <button
              className="delete-btn"
              onClick={deleteGroups}
            >
              Delete All Groups
            </button>
          </div>

          <div className="groups-grid">
            {groups.map((group, index) => {
              const metrics = calculateGroupDiversity(group);

              const skills = [
                ...new Set(
                  group.flatMap((student) =>
                    student.skills || []
                  )
                )
              ];

              return (
                <div className="group-card" key={index}>
                  <div className="group-card-header">
                    <h3>Group {index + 1}</h3>
                    <span>{group.length} members</span>
                  </div>

                  {group.map((student) => (
                    <div
                      className="group-member"
                      key={student.id}
                    >
                      <strong>{student.name}</strong>

                      <div>
                        {(student.skills || []).map((skill) => (
                          <span
                            className="skill-tag"
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="group-metrics">
                    <div>
                      <span>Unique Skills</span>
                      <strong>{metrics.uniqueSkills}</strong>
                    </div>

                    <div>
                      <span>Skill Diversity</span>
                      <strong>{metrics.diversity}%</strong>
                    </div>
                  </div>

                  <div className="group-skills-summary">
                    <strong>Group Skills:</strong>
                    <p>{skills.join(", ") || "None"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyGroups;
