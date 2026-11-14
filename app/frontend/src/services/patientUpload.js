export async function readPatientFiles(files) {
  const list = Array.from(files);
  if (!list.length || list.length > 50) throw new Error('Selecciona entre 1 y 50 archivos JSON del mismo paciente.');
  if (new Set(list.map((file) => file.name)).size !== list.length) throw new Error('Hay nombres de archivo duplicados.');
  return Promise.all(list.map(async (file) => {
    if (!file.name.toLowerCase().endsWith('.json')) throw new Error(`${file.name}: solo se admiten archivos JSON.`);
    if (file.size > 1024 * 1024) throw new Error(`${file.name}: el límite es 1 MB por archivo.`);
    let datos;
    try {
      datos = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    } catch {
      throw new Error(`${file.name}: el contenido no es un JSON válido.`);
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new Error(`${file.name}: debe contener una única analítica como objeto JSON.`);
    return { archivo: file.name, datos };
  }));
}
