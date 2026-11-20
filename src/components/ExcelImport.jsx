
import { useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.min.js";

function ExcelImport({ onImport }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState([]);

  async function downloadTemplate() {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students");

    
sheet.columns = [
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Name", key: "name", width: 28 },
  { header: "Major", key: "major", width: 28 },
  { header: "Skills", key: "skills", width: 40 }
];


     
sheet.addRow({
  studentId: "2610001",
  name: "Nguyen Van An",
  major: "Information Technology",
  skills: "Python, SQL"
});

sheet.addRow({
  studentId: "2610002",
  name: "Tran Minh Duc",
  major: "Computer Science",
  skills: "Java, HTML"
});


      const header = sheet.getRow(1);
      header.font = {
        bold: true,
        color: { argb: "FFFFFFFF" }
      };

      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4158D8" }
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "collabhub_students_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage("Download failed: " + error.message);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("");
    setPreview([]);

    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("Please choose an .xlsx file.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File must be smaller than 5 MB.");
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const sheet = workbook.worksheets[0];

      if (!sheet) {
        throw new Error("No worksheet found.");
      }

      const cell = (r, c) =>
        sheet.getRow(r).getCell(c).text.trim();

      
const headers = [
  cell(1, 1),
  cell(1, 2),
  cell(1, 3),
  cell(1, 4)
].map((x) => x.toLowerCase());

if (
  headers[0] !== "student id" ||
  headers[1] !== "name" ||
  headers[2] !== "major" ||
  headers[3] !== "skills"
) {
  throw new Error(
    "Columns must be Student ID, Name, Major, Skills."
  );
}

const students = [];
const seenIds = new Set();

for (let i = 2; i <= sheet.rowCount; i++) {
  const studentId = cell(i, 1);
  const name = cell(i, 2);
  const major = cell(i, 3);
  const skillsText = cell(i, 4);

  if (!studentId && !name && !major && !skillsText) {
    continue;
  }

  if (!studentId || !name || !major) {
    throw new Error(
      `Row ${i}: Student ID, Name and Major are required.`
    );
  }

  const normalizedId = studentId.toLowerCase();

  if (seenIds.has(normalizedId)) {
    throw new Error(
      `Row ${i}: Duplicate Student ID ${studentId}.`
    );
  }

  seenIds.add(normalizedId);

  students.push({
    studentId,
    name,
    major,
    skills: [...new Set(
      skillsText.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )]
  });
}

if (students.length === 0) {
  throw new Error("No students found.");
}

setPreview(students);

      setMessage(
        `Found ${students.length} students. Please review before importing.`
      );
    } catch (error) {
      setMessage("Import failed: " + error.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  function confirmImport() {
    try {
      const count = onImport(preview);

      setMessage(
        `Import successful: ${count} new students added. ` +
        `${preview.length - count} duplicates skipped.`
      );

      setPreview([]);
    } catch (error) {
      setMessage("Import failed: " + error.message);
    }
  }

  function cancelImport() {
    setPreview([]);
    setMessage("Import cancelled.");
  }

  return (
    <div className="excel-import">
      <h3>Import Students from Excel</h3>

      <p>
        Download the template, fill in student information,
        then upload your Excel file.
      </p>

      <div className="excel-actions">
        <button
          type="button"
          className="template-btn"
          onClick={downloadTemplate}
          disabled={loading}
        >
          Download Template
        </button>

        <label className="primary-btn excel-upload">
          {loading ? "Reading..." : "Choose Excel File"}

          <input
            type="file"
            accept=".xlsx"
            onChange={handleFile}
            disabled={loading}
          />
        </label>
      </div>

      {message && <p role="status">{message}</p>}

      {preview.length > 0 && (
        <div className="excel-preview">
          <h3>Excel Preview ({preview.length} students)</h3>

          <div className="excel-table-wrap">
            <table className="excel-table">
              
<thead>
  <tr>
    <th>Student ID</th>
    <th>Name</th>
    <th>Major</th>
    <th>Skills</th>
  </tr>
</thead>


              
<tbody>
  {preview.map((student, index) => (
    <tr key={index}>
      <td>{student.studentId}</td>
      <td>{student.name}</td>
      <td>{student.major}</td>
      <td>{student.skills.join(", ")}</td>
    </tr>
  ))}
</tbody>

            </table>
          </div>

          <div className="excel-preview-actions">
            <button
              type="button"
              className="excel-cancel-btn"
              onClick={cancelImport}
            >
              Cancel
            </button>

            <button
              type="button"
              className="excel-confirm-btn"
              onClick={confirmImport}
            >
              Confirm Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelImport;
