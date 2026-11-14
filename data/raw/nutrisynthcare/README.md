# 🩺 NutriSynthCare – Dataset Sintético Salud (España)

Este dataset forma parte del proyecto **NutriSynthCare**, cuyo propósito es generar, combinar e imputar bases de datos clínicas **sintéticas** para crear un único conjunto de datos centrado en el **riesgo cardiovascular en personas con diabetes**, basado en la población española y fundamentado en literatura científica previa al COVID-19.

El **objetivo final** de NutriSynthCare es emplear esta base de datos integrada como soporte para el desarrollo de sistemas de **recomendaciones alimenticias personalizadas**, mediante el uso de **ontologías clínicas y nutricionales**, con el fin de promover mejoras en la salud.

Incluye tres bases `.csv`:
- `db_diabetes.csv`: Datos clínicos sobre diferentes tipos de diabetes.
- `db_cardio.csv`: Datos sobre riesgo cardiovascular y factores sociodemográficos.
- `db_cardiabetes.csv`: Unión e imputación avanzada de las anteriores. Lista para análisis.

> ⚠️ Los datos son totalmente **sintéticos** y se publican únicamente con fines educativos y exploratorios.

---

## 🔄 Proceso de Generación

1. Generación individual de las bases (`diabetes` y `cardio`) usando distribución realista de variables clínicas.
2. Unión y detección de campos faltantes (outer join por columnas comunes).
3. Imputación avanzada usando:
   - Regresión múltiple
   - Random Forest & XGBoost

---

## 📊 Variables destacadas

- **Numéricas**: Edad, IMC, Colesterol, PAS, PAD, HbA1c, LDL, HDL, Triglicéridos...
- **Categóricas**: Sexo, Tipo de Diabetes, Nivel de Estrés, Actividad Física...
- **Targets**:
   - `Tipo_Diabetes` (multiclase)
   - `Riesgo_Cardiovascular` (multiclase, pasa a ser binaria en la dataset final)

---

## 🧪 Aplicaciones previstas

- Evaluación de técnicas de **imputación clínica**
- Agrupamiento de perfiles con **clustering no supervisado**
- Desarrollo de **recomendadores nutricionales** usando **ontologías**
- Testing de modelos de clasificación en contexto sanitario

---

## 🔗 Recursos y Documentación

Si quieres profundizar en el proceso de creación, unión e imputación de estas bases de datos, consulta el repositorio de GitHub con todo el código y documentación:

[https://github.com/dCruzCoding/NutriSynthCare](https://github.com/dCruzCoding/NutriSynthCare)

---

## 👥 Autores

Proyecto creado por:

- [dCruzCoding](https://github.com/dCruzCoding)  
- [Aniballll](https://github.com/Aniballll)

---

## 📜 Licencia

Distribuido bajo Licencia MIT.
