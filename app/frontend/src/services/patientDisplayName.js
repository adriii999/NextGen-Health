export function patientDisplayName(patient) {
  const name = String(patient.nombre || patient.paciente_id || '').trim();
  const id = String(patient.paciente_id || '');
  const demo = name.match(/^Seguimiento\s+(\d+)\s*·/i);
  if (demo && new RegExp(`^paciente_${demo[1]}_`, 'i').test(id)) {
    return `Paciente ${demo[1]}`;
  }
  return name || 'Paciente sin nombre';
}
