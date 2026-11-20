
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  generateSmartGroups,
  calculateGroupDiversity
} from "../algorithms/groupAlgorithm";

function StudyGroups() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  const [groupSize, setGroupSize] = useState(4);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadGroups() {
    setGroupsLoading(true);

    try {
      const { data, error } = await supabase
        .from("study_group_sets")
        .select("groups")
        .eq("id", "main")
        .maybeSingle();

      if (error) throw error;

      setGroups(
        Array.isArray(data?.groups) ? data.groups : []
      );
      setMessage("");
    } catch (err) {
      setMessage("Failed to load groups: " + err.message);
    } finally {
      setGroupsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase
        .from("students")
        .select("id, name, major, skills")
        .order("id", { ascending: true });

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
        setStudents([]);
        setSelectedIds([]);
      } else {
        const list = data || [];

        setStudents(list);
        setSelectedIds(list.map((s) => s.id));
      }

      setLoading(false);
    }

    loadStudents();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadGroups();
  }, []);

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

  async function generateGroups() {
    if (loading || groupsLoading || saving || error) return;

    const selectedStudents = students.filter((student) =>
      selectedIds.includes(student.id)
    );

    if (selectedStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const result = generateSmartGroups(
        selectedStudents,
        groupSize
      );

      const { error: saveError } = await supabase
        .from("study_group_sets")
        .upsert(
          {
            id: "main",
            groups: result,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        );

      if (saveError) throw saveError;

      setGroups(result);
      setMessage("Groups saved to Supabase successfully.");
    } catch (err) {
      setMessage("Failed to save groups: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroups() {
    if (saving || groupsLoading) return;

    if (!window.confirm("Delete all generated groups?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("study_group_sets")
        .upsert(
          {
            id: "main",
            groups: [],
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        );

      if (deleteError) throw deleteError;

      setGroups([]);
      setMessage("All shared groups deleted.");
    } catch (err) {
      setMessage("Failed to delete groups: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="groups-page">
      <div className="page-heading">
        <div>
          <h2>Study Groups</h2>
          <p>Create balanced groups based on student skills.</p>
        </div>

        <button
          type="button"
          onClick={loadGroups}
          disabled={saving || groupsLoading}
        >
          {groupsLoading ? "Loading..." : "Refresh Groups"}
        </button>
      </div>

      {message && (
        <p role="status" style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      <div className="generator-card">
        <h3>Smart Group Generator</h3>

        <p>
          Select students and choose the maximum
          number of members per group.
        </p>

        {loading && (
          <p>Loading students from Supabase...</p>
        )}

        {error && (
          <p role="alert" style={{ color: "#dc2626" }}>
            Failed to load students: {error}
          </p>
        )}

        <div className="selection-header">
          <h3>
            Select Students ({selectedIds.length}/{students.length})
          </h3>

          <div className="selection-actions">
            <button
              type="button"
              onClick={selectAll}
              disabled={loading || Boolean(error)}
            >
              Select All
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={loading || Boolean(error)}
            >
              Clear
            </button>
          </div>
        </div>

        {!loading && !error && students.length === 0 ? (
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
                  disabled={loading || Boolean(error)}
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
            type="button"
            className="primary-btn"
            onClick={generateGroups}
            disabled={
              loading ||
              groupsLoading ||
              saving ||
              Boolean(error) ||
              selectedIds.length === 0
            }
          >
            {saving ? "Saving..." : "Generate Smart Groups"}
          </button>
        </div>
      </div>

      {groupsLoading && <p>Loading shared groups...</p>}

      {!groupsLoading && groups.length > 0 && (
        <div className="groups-result">
          <div className="groups-result-header">
            <h3>Generated Groups ({groups.length})</h3>

            <button
              className="delete-btn"
              onClick={deleteGroups}
              disabled={saving}
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
