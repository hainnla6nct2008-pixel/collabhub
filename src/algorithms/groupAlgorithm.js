
export function generateSmartGroups(students, groupSize) {
  const size = Number(groupSize);

  if (
    !Array.isArray(students) ||
    students.length === 0 ||
    !Number.isInteger(size) ||
    size < 1
  ) {
    return [];
  }

  const normalized = students.map((student) => ({
    ...student,
    skills: [...new Set(
      (student.skills || [])
        .map((skill) => String(skill).trim().toLowerCase())
        .filter(Boolean)
    )]
  }));

  const groupCount = Math.ceil(normalized.length / size);

  const groups = Array.from(
    { length: groupCount },
    () => []
  );

  const groupSkills = Array.from(
    { length: groupCount },
    () => new Set()
  );

  // Keep group sizes as balanced as possible
  const baseSize = Math.floor(normalized.length / groupCount);
  const remainder = normalized.length % groupCount;

  const capacities = groups.map(
    (_, i) => baseSize + (i < remainder ? 1 : 0)
  );

  // Prioritize students with more skills
  const sorted = [...normalized].sort(
    (a, b) => b.skills.length - a.skills.length
  );

  for (const student of sorted) {
    let bestGroup = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < groupCount; i++) {
      if (groups[i].length >= capacities[i]) continue;

      const newSkills = student.skills.filter(
        (skill) => !groupSkills[i].has(skill)
      ).length;

      const score = newSkills * 10 - groups[i].length;

      if (score > bestScore) {
        bestScore = score;
        bestGroup = i;
      }
    }

    if (bestGroup !== -1) {
      groups[bestGroup].push(student);

      for (const skill of student.skills) {
        groupSkills[bestGroup].add(skill);
      }
    }
  }

  return groups;
}

export function calculateGroupDiversity(group) {
  if (!Array.isArray(group) || group.length === 0) {
    return { uniqueSkills: 0, diversity: 0 };
  }

  const allSkills = group.flatMap(
    (student) => student.skills || []
  );

  const normalizedSkills = allSkills.map(
    (skill) => String(skill).trim().toLowerCase()
  ).filter(Boolean);

  const uniqueSkills = new Set(normalizedSkills).size;

  const diversity = normalizedSkills.length > 0
    ? Math.round(
        (uniqueSkills / normalizedSkills.length) * 100
      )
    : 0;

  return { uniqueSkills, diversity };
}
