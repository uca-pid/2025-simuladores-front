# Uso actual (UCA, cátedra Informática General, vía Exam.net) vs. Examline

| Funcionalidad | Hoy (Exam.net) | Examline |
|---|---|---|
| **Examen combinado (choice + programación)** | ❌ No existe — se toman como **2 exámenes separados**, sin corte controlado entre ambos | ✅ Un solo examen con **partes ordenadas** (`ExamPart`), avance forward-only controlado por el servidor |
| **Pausa/corte entre partes** | ❌ No aplica (son exámenes distintos). "Una pregunta a la vez" permite navegar libremente entre preguntas, y "varias sesiones" solo retoma el mismo examen | ✅ Tres modos de paso a la parte siguiente: **por el alumno**, **manual por el profesor** o **con código** |
| **Retroceder a una parte ya rendida** | — | ❌ Bloqueado: el servidor nunca expone preguntas/test cases de partes pasadas o futuras |
| **Corrección automática de opción múltiple** | ✅ Sí | ✅ Sí |
| **Corrección automática de programación (test cases)** | ❌ No — el código solo se guarda como adjunto y se corrige **manualmente** | ✅ Ejecución en sandbox contra test cases definidos por el profesor |
| **Puntaje personalizado por caso de prueba** | ❌ No aplica (no existen test cases) | ✅ Cada caso de prueba puede tener su propio puntaje |
| **Carga de archivos TXT/CSV usables por el código** | ❌ No documentado/soportado | ✅ Datasets disponibles para el código del alumno **y** al corregir/probar la parte desde la vista del profesor |
| **Código inicial precargado para el alumno** | ❌ No documentado/soportado | ✅ Ya existente (desarrollo previo), incluso con opción de bloquear partes como solo lectura |
| **Imagen en el enunciado de la pregunta** | ✅ Sí (las preguntas admiten texto, imágenes, fórmulas y tablas) | ✅ Sí *(paridad)* |
| **Imagen en las opciones de multiple choice** | ❌ No documentado (las opciones se describen solo como texto) | ✅ Nuevo en este trabajo |
| **Plan gratuito permanente** | ❌ Solo trial de 30 días por institución | ✅ Plataforma propia, sin licencia |
| **Integración con Moodle** | ❌ No existe (ni siquiera vía LTI genérico) — solo integra con Google Classroom y Microsoft Teams | ✅ Ya existente: conexión, lectura de cursos/actividades y sincronización automática de calificaciones |
| **Lenguajes de programación soportados** | Python, JavaScript (sin módulos adicionales) | ✅ Python, JavaScript **y C** *(nuevo en este trabajo)* |

**En una frase**: Examline ya resolvía dos de los tres problemas reales de la cátedra (archivos de datos y código inicial); lo que faltaba —y lo que se construyó en este trabajo— era poder tomar el examen combinado como una sola instancia con corrección automática de ambas partes, con control del paso entre partes, puntaje por caso de prueba y soporte para el lenguaje C.

## Fuentes

- Exam.net — pricing: https://exam.net/pricing
- Exam.net Support — Programming/Code editor: https://support.exam.net/s/article/programming-code-editor
- Exam.net Support — List of all available tools/accommodations: https://support.exam.net/s/article/list-of-all-available-tools-accommodations
- Exam.net Support — The exam format "Use question types": https://support.exam.net/s/article/the-exam-format-use-question-types
- Exam.net Support — Create a "Multiple choice" question: https://support.exam.net/s/article/create-a-multiple-choice-question
- Exam.net Support — Conduct exams over several sessions / Resume exam: https://support.exam.net/s/article/conduct-exams-over-several-sessions-resume-exam
- Exam.net — Integraciones LMS (confirma solo Google Classroom y Microsoft Teams, sin Moodle): https://exam.net/es/streamline-exam-workflow-with-lms-integration
- Búsquedas "moodle" y "LTI" en support.exam.net: 0 resultados en ambos casos
