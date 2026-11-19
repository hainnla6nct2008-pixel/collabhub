
function normalizeSkills(skills) {
  return [...new Set(
    (Array.isArray(skills) ? skills : [])
      .map((skill) => String(skill).trim().toLowerCase())
      .filter(Boolean)
  )];
}

export function matchStudents(students, position) {
  const requiredSkills = normalizeSkills(position.requiredSkills);

  if (
    !Array.isArray(students) ||
    requiredSkills.length === 0
  ) {
    return [];
  }

  const results = students.map((student) => {
    const studentSkills = normalizeSkills(student.skills);

    const matchedSkills = requiredSkills.filter(
      (skill) => studentSkills.includes(skill)
    );

    const missingSkills = requiredSkills.filter(
      (skill) => !studentSkills.includes(skill)
    );

    const score = Math.round(
      (matchedSkills.length / requiredSkills.length) * 100
    );

    return {
      ...student,
      score,
      matchedSkills,
      missingSkills
    };
  });

  results.sort(
    (a, b) =>
      b.score - a.score ||
      String(a.name).localeCompare(String(b.name))
  );

  return results;
}
