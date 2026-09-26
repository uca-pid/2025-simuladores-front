# Uso actual (UCA, cátedra Informática General, vía Exam.net) vs. Examline

| Funcionalidad | Hoy (Exam.net) | Examline |
|---|---|---|
| **Examen combinado (choice + programación)** | ❌ No existe — se toman como **2 exámenes separados**, sin corte controlado entre ambos | ✅ Un solo examen con **partes ordenadas** (`ExamPart`), avance forward-only controlado por el servidor |
| **Pausa/corte entre partes** | ❌ No aplica (son exámenes distintos) | ✅ Pantalla de **"Continuar"** manual entre partes, sin avance automático por tiempo |
| **Retroceder a una parte ya rendida** | — | ❌ Bloqueado: el servidor nunca expone preguntas/test cases de partes pasadas o futuras |
| **Corrección automática de opción múltiple** | ✅ Sí | ✅ Sí |
| **Corrección automática de programación (test cases)** | ❌ No — corrección **manual** | ✅ Ejecución en sandbox contra test cases definidos por el profesor |
| **Carga de archivos TXT/CSV usables por el código** | ❌ No documentado/soportado | ✅ Ya existente (desarrollo previo) |
| **Código inicial precargado para el alumno** | ❌ No soportado | ✅ Ya existente (desarrollo previo), incluso con opción de bloquear partes como solo lectura |
| **Imagen adjunta por pregunta (choice)** | ❌ No soportado | ✅ Nuevo en este trabajo |
| **Plan gratuito permanente** | ❌ Solo trial de 30 días por institución | ✅ Plataforma propia, sin licencia |
| **Integración con Moodle** | ❌ No existe (ni siquiera vía LTI genérico) — solo integra con Google Classroom y Microsoft Teams | ✅ Ya existente: conexión, lectura de cursos/actividades y sincronización automática de calificaciones |
| **Lenguajes de programación soportados** | Python, JavaScript | Python, JavaScript *(paridad, no mejora — pendiente en Futuras Discusiones)* |

**En una frase**: Examline ya resolvía dos de los tres problemas reales de la cátedra (archivos de datos y código inicial); lo que faltaba —y lo que se construyó en este trabajo— era poder tomar el examen combinado como una sola instancia con corrección automática de ambas partes.

## Fuentes

- Exam.net — pricing: https://exam.net/pricing
- Exam.net Support — Programming/Code editor: https://support.exam.net/s/article/programming-code-editor
- Exam.net Support — List of all available tools/accommodations: https://support.exam.net/s/article/list-of-all-available-tools-accommodations
- Exam.net — Integraciones LMS (confirma solo Google Classroom y Microsoft Teams, sin Moodle): https://exam.net/es/streamline-exam-workflow-with-lms-integration
- Búsquedas "moodle" y "LTI" en support.exam.net: 0 resultados en ambos casos
