---
name: agentes personalizados
description: >-
  Guía completa y de referencia para crear, configurar e invocar Agentes Personalizados (Custom Agents) en Google Antigravity.
  Usa esta habilidad cuando el usuario solicite crear nuevos agentes, configurar subagentes especializados, definir archivos de agente (.agent.md o agent.md),
  delimitar herramientas o modelos para agentes, o invocar agentes a través de la CLI (agy), la interfaz TUI (/agents) o mediante invoke_subagent.
---

# Agentes Personalizados en Google Antigravity

Los **Agentes Personalizados** (*Custom Agents*) son configuraciones declarativas basadas en archivos Markdown con encabezados YAML que permiten definir asistentes de IA altamente especializados, con roles, modelos, herramientas e instrucciones delimitadas.

---

## 1. Concepto Central y Beneficios

* **Especialización Radical**: Evita el modelo de "asistente generalista monolítico" donde un solo prompt sobrecargado intenta resolver todo.
* **Prevención de Context Window Bloat**: Cada agente mantiene un contexto limpio y enfocado exclusivamente en su tarea, reduciendo drásticamente el consumo de tokens y las alucinaciones.
* **Simetría Total (*True Symmetry*)**: Un agente personalizado puede operar indistintamente como:
  1. **Agente Primario**: El usuario interactúa directamente con él en la sesión principal (vía CLI o selector en la interfaz).
  2. **Subagente**: Un agente coordinador lo invoca en segundo plano para delegar tareas paralelas y asíncronas.

---

## 2. Dónde se Guardan (Rutas de Descubrimiento)

Antigravity busca definiciones de agentes en las siguientes ubicaciones según el alcance deseado:

| Alcance | Ruta de Directorio | Uso Recomendado |
| :--- | :--- | :--- |
| **Workspace (Proyecto)** | `.agents/agents/<nombre>/agent.md`<br>o `.agents/agents/<nombre>.md` | Específico para el repositorio actual; versionable en Git con el equipo. |
| **Global (Máquina)** | `~/.gemini/config/agents/<nombre>/agent.md` | Disponible para todos los proyectos en la máquina del desarrollador. |
| **Plugins** | `plugins/<plugin_name>/agents/<nombre>/agent.md` | Distribuido en paquetes reutilizables con skills, reglas y hooks. |

> [!IMPORTANT]
> Para mantener la configuración confinada a este proyecto y compartirla con el equipo, crea los agentes siempre dentro de `.agents/agents/` en la raíz del proyecto.

---

## 3. Formato del Archivo de Agente (`agent.md`)

El archivo se compone de dos partes:
1. **Encabezado YAML (Frontmatter)**: Metadatos y configuración de permisos/herramientas.
2. **Cuerpo Markdown**: Las instrucciones del sistema (*System Prompt*), identidad y directrices.

### Campos YAML de Configuración

```markdown
---
name: nombre-del-agente         # (Obligatorio) Identificador único en minúsculas con guiones.
description: >-                 # (Obligatorio) Descripción clara de qué hace y cuándo debe usarse.
  Especialista en pruebas unitarias y análisis de cobertura con Jest y Vitest.
subagent: true                  # (Booleano) Si es true, puede ser invocado como subagente en segundo plano.
model: flash                    # (Opcional) Modelo a utilizar: 'flash', 'pro', o 'default'.
tools:                          # (Opcional) Lista estricta de herramientas permitidas.
  - view_file
  - replace_file_content
  - run_command
skills:                         # (Opcional) Habilidades a precargar o asociar al agente.
  - skills/supabase-postgres-best-practices
---

# Rol e Identidad
Actúa como un Ingeniero Senior de QA especializado en pruebas automatizadas...

## Directrices Inquebrantables
1. Nunca alteres código de lógica de negocio salvo que sea estrictamente necesario para hacer pasar los tests.
2. Cada prueba debe ser determinista e idempotente.

## Flujo de Trabajo
1. Analizar el archivo objetivo con `view_file`.
2. Identificar casos de éxito, casos de borde y errores tipados.
3. Ejecutar los tests con `run_command` y verificar salida.
```

### Detalle de Campos YAML:
* **`name`** *(string, requerido)*: Nombre identificador del agente (ej. `unit-test-runner`, `dependency-modernizer`).
* **`description`** *(string, requerido)*: Texto clave leído por el agente principal para decidir si delegarle una tarea.
* **`subagent`** *(boolean, opcional, por defecto `false`)*: Habilita al agente para ser invocado mediante `invoke_subagent` por otro agente.
* **`model`** *(string, opcional)*: Permite seleccionar un modelo más ligero y rápido (como `flash`) para tareas rutinarias, o `pro` para razonamiento complejo.
* **`tools`** *(array de strings, opcional)*: **Crítico para la seguridad y precisión.** Si se define, el agente **solo** tendrá acceso a esas herramientas. Evita alucinaciones y llamadas a herramientas peligrosas o irrelevantes.
* **`skills`** *(array de strings, opcional)*: Rutas a skills locales o nombres de skills que el agente debe activar automáticamente.

---

## 4. Cómo se Invocan los Agentes

### A. Invocación como Agente Primario (Sesión de Usuario)

1. **Desde la CLI de Antigravity (`agy`)**:
   ```bash
   agy --agent nombre-del-agente
   ```
   Inicia la sesión interactiva utilizando la identidad, herramientas y directrices del agente especificado.

2. **Desde el Panel de Gestión de Agentes en la TUI / IDE**:
   * Escribe el comando de barra **`/agents`** en el prompt.
   * Se abrirá el **Agent Manager Panel**.
   * Selecciona el agente deseado de la lista para cambiar de contexto o ver su estado.

---

### B. Invocación como Subagente (Delegación Asíncrona)

Cuando un agente tiene configurado `subagent: true`, puede ser invocado por el agente principal mediante la herramienta `invoke_subagent`:

```json
{
  "AgentName": "unit-test-runner",
  "TaskName": "Ejecutar y corregir pruebas de autenticación",
  "Task": "Ejecuta los tests de auth en tests/auth.spec.ts y corrige cualquier fallo detectado.",
  "TaskSummary": "Pruebas de auth con unit-test-runner"
}
```

* **Ejecución Asíncrona**: El subagente corre en un hilo independiente sin bloquear la sesión principal.
* **Gestión de Tareas**: Se puede monitorear su estado, enviar entrada o cancelar su ejecución con `manage_task` o desde el panel `/agents` (presionando la tecla `K`).

---

## 5. Ejemplos Prácticos de Agentes Personalizados

### Ejemplo 1: Agente Auditor de Seguridad (`security-auditor`)
**Archivo:** `.agents/agents/security-auditor/agent.md`

```markdown
---
name: security-auditor
description: >-
  Auditor de seguridad especializado en detectar vulnerabilidades, inyecciones SQL,
  fugas de secretos y configuraciones inseguras en APIs y bases de datos.
subagent: true
model: pro
tools:
  - view_file
  - grep_search
  - list_dir
skills:
  - skills/supabase-postgres-best-practices
---

# Rol: Auditor Senior de Ciberseguridad

Eres un experto en seguridad de aplicaciones web y estándares OWASP.

## Protocolo de Auditoría
1. Analizar archivos de rutas y endpoints buscando parámetros sin sanitizar.
2. Verificar que las variables de entorno sensibles nunca se expongan en código cliente.
3. Emitir un informe detallado con nivel de riesgo (Crítico, Alto, Medio, Bajo) y sugerencias de mitigación.
```

---

### Ejemplo 2: Agente de Modernización de Dependencias (`dependency-modernizer`)
**Archivo:** `.agents/agents/dependency-modernizer/agent.md`

```markdown
---
name: dependency-modernizer
description: >-
  Especialista en actualizar paquetes de Node.js/Python, resolver conflictos de versiones
  y adaptar código a cambios incompatibles (breaking changes).
subagent: true
model: flash
tools:
  - view_file
  - replace_file_content
  - run_command
---

# Rol: Especialista en Migración y Dependencias

Te encargas de mantener el proyecto actualizado con las últimas versiones estables.

## Flujo de Trabajo
1. Inspeccionar `package.json` o `requirements.txt`.
2. Ejecutar comandos de verificación de compatibilidad.
3. Actualizar código deprecado consultando la documentación oficial antes de confirmar.
```

---

## 6. Buenas Prácticas y Errores Comunes

1. **Herramientas Válidas**: Asegúrate de que los nombres en el array `tools` existan en Antigravity (`view_file`, `replace_file_content`, `run_command`, `grep_search`, etc.). Un nombre mal escrito puede provocar que el subagente quede bloqueado.
2. **Descripciones Precisas**: La `description` es lo que permite al agente coordinador saber cuándo delegar. Sé específico en los verbos y tecnologías clave.
3. **Principio de Mínimo Privilegio**: No otorgues herramientas de modificación (`replace_file_content`, `run_command`) a agentes que solo necesitan inspeccionar o auditar (`view_file`, `grep_search`).
