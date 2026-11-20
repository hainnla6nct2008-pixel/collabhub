
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const emptyData = () => ({
  students: [],
  groups: [],
  events: [],
  internships: [],
  positions: []
});

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@\t\r]/.test(text)
    ? "'" + text
    : text;

  return '"' + safe.replace(/"/g, '""') + '"';
}

function createCSV(headers, rows) {
  return "\uFEFF" + [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      row.map(csvCell).join(",")
    )
  ].join("\r\n");
}

async function fetchAll(table, columns = "*") {
  const result = [];
  const size = 500;

  for (let start = 0; ; start += size) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(start, start + size - 1);

    if (error) throw error;

    const rows = data || [];
    result.push(...rows);

    if (rows.length < size) break;
  }

  return result;
}

async function fetchWorkspace() {
  const [students, groupSets, events, internships, positions] =
    await Promise.all([
      fetchAll("students"),
      fetchAll("study_group_sets"),
      fetchAll("events"),
      fetchAll("internships"),
      fetchAll("internship_positions")
    ]);

  const main = groupSets.find((item) => item.id === "main");

  return {
    students,
    groups: Array.isArray(main?.groups) ? main.groups : [],
    events,
    internships,
    positions
  };
}

async function insertBatches(table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);

    const { error } = await supabase
      .from(table)
      .insert(batch);

    if (error) throw error;
  }
}

function isUUID(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

function signature(...values) {
  return JSON.stringify(
    values.map((v) =>
      String(v ?? "").trim().toLowerCase()
    )
  );
}

function normalizeTime(value) {
  return String(value ?? "").slice(0, 5);
}

function DataManagement() {
  const fileRef = useRef(null);

  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshData(showMessage = true) {
    setLoading(true);

    try {
      const workspace = await fetchWorkspace();
      setData(workspace);

      if (showMessage) {
        setMessage("Data refreshed from Supabase.");
      }

      return workspace;
    } catch (error) {
      setMessage("Refresh failed: " + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData(false).catch(console.error);
  }, []);

  async function exportStudents() {
    setBusy(true);

    try {
      const workspace = await refreshData(false);

      const rows = workspace.students.map((s) => [
        s.id,
        s.name,
        s.major,
        (s.skills || []).join("; ")
      ]);

      downloadFile(
        createCSV(
          ["Student ID", "Student Name", "Major", "Skills"],
          rows
        ),
        "collabhub_students.csv",
        "text/csv;charset=utf-8;"
      );

      setMessage("Students CSV downloaded.");
    } catch (error) {
      setMessage("Export failed: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportGroups() {
    setBusy(true);

    try {
      const workspace = await refreshData(false);

      const rows = workspace.groups.flatMap((group, index) =>
        group.map((student) => [
          index + 1,
          student.id,
          student.name,
          (student.skills || []).join("; ")
        ])
      );

      downloadFile(
        createCSV(
          ["Group", "Student ID", "Student Name", "Skills"],
          rows
        ),
        "collabhub_groups.csv",
        "text/csv;charset=utf-8;"
      );

      setMessage("Groups CSV downloaded.");
    } catch (error) {
      setMessage("Export failed: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function backupData() {
    setBusy(true);

    try {
      const workspace = await refreshData(false);

      const backup = {
        app: "CollabHub",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: workspace
      };

      downloadFile(
        JSON.stringify(backup, null, 2),
        "collabhub_supabase_backup.json",
        "application/json"
      );

      setMessage("Supabase backup downloaded.");
    } catch (error) {
      setMessage("Backup failed: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function restoreData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setMessage("");

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Backup file is too large (max 5 MB).");
      }

      const backup = JSON.parse(await file.text());

      if (
        backup.app !== "CollabHub" ||
        ![1, 2].includes(backup.version) ||
        !backup.data
      ) {
        throw new Error("Invalid CollabHub backup file.");
      }

      const keys = [
        "students",
        "groups",
        "events",
        "internships",
        "positions"
      ];

      for (const key of keys) {
        if (!Array.isArray(backup.data[key])) {
          throw new Error(`Invalid ${key} data.`);
        }
      }

      const confirmed = window.confirm(
        "Import this backup into the shared Supabase database?\n\n" +
        "Only missing records will be added. Existing records " +
        "will not be overwritten.\n\n" +
        "Other users may see the imported data."
      );

      if (!confirmed) return;

      const current = await fetchWorkspace();
      const source = backup.data;

      // 1. Students: keep existing IDs unchanged
      const studentIds = new Set(
        current.students.map((s) => String(s.id))
      );

      const newStudents = [];

      for (const s of source.students) {
        const id = String(s.studentId ?? s.id ?? "").trim();

        if (!id || studentIds.has(id)) continue;
        if (!String(s.name ?? "").trim()) continue;
        if (!String(s.major ?? "").trim()) continue;

        studentIds.add(id);

        newStudents.push({
          id,
          name: String(s.name).trim(),
          major: String(s.major).trim(),
          skills: Array.isArray(s.skills) ? s.skills : []
        });
      }

      await insertBatches("students", newStudents);

      // 2. Internship positions
      const positionIds = new Set(
        current.positions.map((p) => String(p.id))
      );

      const positionKeys = new Set(
        current.positions.map((p) =>
          signature(p.company, p.name, p.required_skills)
        )
      );

      const newPositions = [];

      for (const p of source.positions) {
        const company = String(p.company ?? "").trim();
        const name = String(p.name ?? "").trim();
        const requiredSkills =
          p.required_skills ?? p.requiredSkills ?? [];

        if (!company || !name) continue;

        const key = signature(
          company,
          name,
          JSON.stringify(requiredSkills)
        );

        if (positionKeys.has(key)) continue;

        const row = {
          company,
          name,
          required_skills: Array.isArray(requiredSkills)
            ? requiredSkills
            : []
        };

        if (isUUID(p.id)) {
          if (positionIds.has(p.id)) continue;
          row.id = p.id;
          positionIds.add(p.id);
        }

        positionKeys.add(key);
        newPositions.push(row);
      }

      await insertBatches("internship_positions", newPositions);

      // 3. Events: do not reuse legacy IDs
      const eventKeys = new Set(
        current.events.map((e) =>
          signature(
            e.title,
            e.date,
            normalizeTime(e.time),
            e.type
          )
        )
      );

      const newEvents = [];

      for (const e of source.events) {
        const title = String(e.title ?? "").trim();
        const date = String(e.date ?? "");
        const time = normalizeTime(e.time);
        const type = String(e.type ?? "Other");

        if (
          !title ||
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !/^\d{2}:\d{2}$/.test(time)
        ) continue;

        const key = signature(title, date, time, type);
        if (eventKeys.has(key)) continue;

        eventKeys.add(key);
        newEvents.push({ title, date, time, type });
      }

      await insertBatches("events", newEvents);

      // 4. Internships
      const internshipIds = new Set(
        current.internships.map((i) => String(i.id))
      );

      const internshipKeys = new Set(
        current.internships.map((i) =>
          signature(
            i.student_id ?? i.student,
            i.company,
            i.position
          )
        )
      );

      const newInternships = [];

      for (const i of source.internships) {
        const student = String(i.student ?? "").trim();
        const company = String(i.company ?? "").trim();
        const position = String(i.position ?? "").trim();
        const studentId = i.student_id ?? i.studentId ?? null;

        if (!student || !company || !position) continue;

        const key = signature(
          studentId ?? student,
          company,
          position
        );

        if (internshipKeys.has(key)) continue;

        const row = {
          student_id: studentId == null
            ? null
            : String(studentId),
          student,
          company,
          position,
          mentor: String(i.mentor ?? ""),
          status: ["Pending", "Ongoing", "Completed"]
            .includes(i.status)
              ? i.status
              : "Pending"
        };

        if (isUUID(i.id)) {
          if (internshipIds.has(i.id)) continue;
          row.id = i.id;
          internshipIds.add(i.id);
        }

        internshipKeys.add(key);
        newInternships.push(row);
      }

      await insertBatches("internships", newInternships);

      // 5. Restore groups only when shared groups are empty
      let restoredGroups = false;

      if (
        current.groups.length === 0 &&
        source.groups.length > 0 &&
        source.groups.every(Array.isArray)
      ) {
        const { error } = await supabase
          .from("study_group_sets")
          .upsert(
            {
              id: "main",
              groups: source.groups,
              updated_at: new Date().toISOString()
            },
            { onConflict: "id" }
          );

        if (error) throw error;
        restoredGroups = true;
      }

      await refreshData(false);

      setMessage(
        "Restore completed: " +
        `${newStudents.length} students, ` +
        `${newPositions.length} positions, ` +
        `${newEvents.length} events, ` +
        `${newInternships.length} internships. ` +
        `Groups: ${restoredGroups ? "restored" : "unchanged"}.`
      );
    } catch (error) {
      setMessage(
        "Restore failed: " + error.message +
        ". Some records may already have been imported."
      );
    } finally {
      setBusy(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
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
          <p>
            Export, backup and restore shared Supabase data.
          </p>
        </div>

        <button
          className="primary-btn"
          type="button"
          onClick={() => refreshData().catch(console.error)}
          disabled={loading || busy}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      <div className="data-stats">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <p>{stat.label}</p>
            <h2>{loading ? "..." : stat.count}</h2>
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
            type="button"
            onClick={exportStudents}
            disabled={loading || busy}
          >
            Export Students CSV
          </button>

          <button
            className="primary-btn"
            type="button"
            onClick={exportGroups}
            disabled={loading || busy}
          >
            Export Groups CSV
          </button>
        </section>

        <section className="data-card">
          <h3>Backup & Restore</h3>
          <p>
            Save all shared workspace data into one JSON file.
            Restore adds missing records without replacing
            existing records.
          </p>

          <button
            className="primary-btn"
            type="button"
            onClick={backupData}
            disabled={loading || busy}
          >
            {busy ? "Processing..." : "Download JSON Backup"}
          </button>

          <label className="upload-label">
            Select Backup File
            <input
              type="file"
              accept=".json,application/json"
              ref={fileRef}
              onChange={restoreData}
              disabled={loading || busy}
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
