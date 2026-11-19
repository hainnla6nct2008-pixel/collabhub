
import { useRef, useState } from "react";

const STORAGE_KEYS = {
  students: "collabhub_students",
  groups: "collabhub_groups",
  events: "collabhub_events",
  internships: "collabhub_internships",
  positions: "collabhub_positions"
};

function readData(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");

  // Prevent spreadsheet formulas from executing
  const safe = /^[\s]*[=+\-@]/.test(text)
    ? "'" + text
    : text;

  return '"' + safe.replace(/"/g, '""') + '"';
}

function createCSV(headers, rows) {
  return "\uFEFF" + [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\r\n");
}

function DataManagement() {
  const fileRef = useRef(null);

  const [data, setData] = useState(() => ({
    students: readData(STORAGE_KEYS.students),
    groups: readData(STORAGE_KEYS.groups),
    events: readData(STORAGE_KEYS.events),
    internships: readData(STORAGE_KEYS.internships),
    positions: readData(STORAGE_KEYS.positions)
  }));

  const [message, setMessage] = useState("");

  function refreshData() {
    setData({
      students: readData(STORAGE_KEYS.students),
      groups: readData(STORAGE_KEYS.groups),
      events: readData(STORAGE_KEYS.events),
      internships: readData(STORAGE_KEYS.internships),
      positions: readData(STORAGE_KEYS.positions)
    });
    setMessage("Data refreshed successfully.");
  }

  function exportStudents() {
    const rows = data.students.map((s) => [
      s.id,
      s.name,
      s.major,
      (s.skills || []).join("; ")
    ]);

    const csv = createCSV(
      ["ID", "Student Name", "Major", "Skills"],
      rows
    );

    downloadFile(
      csv,
      "collabhub_students.csv",
      "text/csv;charset=utf-8;"
    );
  }

  function exportGroups() {
    const rows = data.groups.flatMap((group, index) =>
      group.map((student) => [
        index + 1,
        student.id,
        student.name,
        (student.skills || []).join("; ")
      ])
    );

    const csv = createCSV(
      ["Group", "Student ID", "Student Name", "Skills"],
      rows
    );

    downloadFile(
      csv,
      "collabhub_groups.csv",
      "text/csv;charset=utf-8;"
    );
  }

  function backupData() {
    const backup = {
      app: "CollabHub",
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };

    downloadFile(
      JSON.stringify(backup, null, 2),
      "collabhub_backup.json",
      "application/json"
    );
  }

  async function restoreData(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Backup file is too large (max 5 MB).");
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      if (
        backup.app !== "CollabHub" ||
        backup.version !== 1 ||
        !backup.data ||
        typeof backup.data !== "object"
      ) {
        throw new Error("Invalid CollabHub backup file.");
      }

      const restored = {};

      for (const key of Object.keys(STORAGE_KEYS)) {
        if (!Array.isArray(backup.data[key])) {
          throw new Error(`Invalid ${key} data.`);
        }

        restored[key] = backup.data[key];
      }

      const confirmed = window.confirm(
        "Restore backup? This will replace all current workspace data."
      );

      if (!confirmed) return;

      const oldValues = {};

      for (const key of Object.keys(STORAGE_KEYS)) {
        oldValues[key] = localStorage.getItem(STORAGE_KEYS[key]);
      }

      try {
        for (const key of Object.keys(STORAGE_KEYS)) {
          localStorage.setItem(
            STORAGE_KEYS[key],
            JSON.stringify(restored[key])
          );
        }
      } catch (error) {
        for (const key of Object.keys(STORAGE_KEYS)) {
          if (oldValues[key] === null) {
            localStorage.removeItem(STORAGE_KEYS[key]);
          } else {
            localStorage.setItem(
              STORAGE_KEYS[key],
              oldValues[key]
            );
          }
        }

        throw error;
      }

      setData(restored);
      setMessage("Backup restored successfully.");

      // Reload so other pages read the restored data
      window.location.reload();
    } catch (error) {
      setMessage("Restore failed: " + error.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const stats = [
    { label: "Students", count: data.students.length },
    { label: "Groups", count: data.groups.length },
    { label: "Events", count: data.events.length },
    { label: "Internships", count: data.internships.length },
    { label: "Positions", count: data.positions.length }
  ];

  return (
    <div className="data-page">
      <div className="page-heading">
        <div>
          <h2>Data Management</h2>
          <p>Export, backup and restore your data.</p>
        </div>

        <button className="primary-btn" onClick={refreshData}>
          Refresh Data
        </button>
      </div>

      <div className="data-stats">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <p>{stat.label}</p>
            <h2>{stat.count}</h2>
          </div>
        ))}
      </div>

      <div className="data-layout">
        <section className="data-card">
          <h3>Export CSV</h3>
          <p>
            Export student information and generated groups
            for Excel or data analysis.
          </p>

          <button
            className="primary-btn"
            onClick={exportStudents}
          >
            Export Students CSV
          </button>

          <button
            className="primary-btn"
            onClick={exportGroups}
          >
            Export Groups CSV
          </button>
        </section>

        <section className="data-card">
          <h3>Backup & Restore</h3>
          <p>
            Save all workspace data into one JSON file
            or restore from a previous backup.
          </p>

          <button
            className="primary-btn"
            onClick={backupData}
          >
            Download JSON Backup
          </button>

          <label className="upload-label">
            Select Backup File
            <input
              type="file"
              accept=".json,application/json"
              ref={fileRef}
              onChange={restoreData}
            />
          </label>
        </section>
      </div>

      {message && (
        <p className="data-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default DataManagement;
