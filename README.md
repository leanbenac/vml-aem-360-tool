# VML AEM 360 Tool

**VML AEM 360 Tool** es una extensión de Chrome de uso interno desarrollada por el equipo de Ingeniería de VML. Su objetivo principal es solucionar las limitaciones nativas de Adobe Experience Manager (AEM) Cloud Service a la hora de realizar cargas masivas de assets (archivos y carpetas) manteniendo intacta su estructura de directorios.

## 🚀 Características Principales

- **Inyección de Estructuras Complejas:** Permite arrastrar y soltar (`Drag & Drop`) múltiples carpetas anidadas directamente desde tu computadora hacia AEM. La herramienta recreará automáticamente todo el árbol de carpetas en el servidor antes de subir los archivos.
- **Direct Binary Upload:** Utiliza el motor moderno de subida de AEM Cloud Service. Esto garantiza que los microservicios de Adobe (*Asset Compute*) se activen correctamente, generando todas las *renditions* (miniaturas) necesarias y evitando los errores de "missing renditions".
- **Carga Concurrente Controlada:** Sube múltiples archivos y crea múltiples carpetas al mismo tiempo (procesando de forma segura con una concurrencia máxima de 10 peticiones simultáneas y un micro-delay de 30ms) para no saturar la memoria del navegador ni los servidores de AEM, reduciendo drásticamente los tiempos de espera.
- **Auto-Aprobación (Auto-Approve):** Inyecta automáticamente el estado `dam:status=approved` en la metadata de cada archivo apenas termina de subirse, eliminando por completo la necesidad de aprobación manual posterior.
- **Resiliencia Automática (Exponential Backoff):** Si AEM se satura, arroja errores 403 o expira la sesión, la herramienta pausa inteligentemente, refresca los tokens CSRF y reintenta la subida hasta 5 veces por su cuenta sin abortar el proceso general.
- **Escudo Anti-Siesta (Keep-Alive):** Al iniciar una carga masiva (ej. miles de imágenes), la extensión utiliza la API `WakeLock` del navegador para evitar que la pantalla de la computadora se apague o entre en suspensión, garantizando que el proceso de red no se interrumpa.
- **Seguridad Integrada:** Extrae y utiliza automáticamente el Token CSRF de tu sesión activa de AEM, asegurando que todas las peticiones estén autenticadas y autorizadas. Además, cuenta con validaciones anti-escape de rutas para evitar subidas accidentales fuera de la carpeta destino.
- **Interfaz Bilingüe / UI en Inglés:** Si bien el soporte técnico es en español, toda la interfaz de usuario de la extensión está completamente en inglés para facilitar su uso global por cualquier equipo de VML.
- **Renombrado y Normalización Inteligente:** La herramienta normaliza automáticamente las rutas y archivos, adaptando variaciones regionales de texto (US/CA como `gray`/`grey`), simplificando nombres compuestos de colores y forzando la extensión de las imágenes a `.jpeg` de forma automatizada para unificar el formato.

## ⏱️ Impacto y Tiempo Ahorrado

Automatizar el proceso de inyección de assets genera un ahorro masivo de horas de trabajo manual.

**Caso de Estudio (Estimación de un proyecto real):**
Para recrear una estructura de **256 carpetas** y subir **4200 imágenes** (aprox. 16-36 imágenes por carpeta) con sus respectivas aprobaciones:
- **Carga Manual (Humano):**
  - Crear cada carpeta manualmente y navegar hacia ella: ~45 seg por carpeta = 192 min.
  - Subir las imágenes en lote (drag & drop por carpeta) y esperar: ~1 min por carpeta = 256 min.
  - Seleccionar los assets del lote, editar metadata y aprobar: ~1 min por lote = 256 min.
  - **Total:** ~704 minutos (**cerca de 12 horas o 1.5 días laborales completos** de trabajo repetitivo).
- **VML AEM 360 Tool:**
  - El proceso de análisis y subida concurrente de todo el árbol se resuelve en **apenas unos minutos** (aprox. 10 a 15 min dependiendo de la red) y de forma 100% automatizada.

**Resultado:** Una eficiencia del **~99% de tiempo ahorrado** y cero errores humanos durante la operación.

## 🛠️ Instalación (Modo Desarrollador)

Para instalar la extensión en tu navegador Chrome (o Edge/Brave basados en Chromium):

1. Descargá y extraé el código fuente (carpeta `vml-aem-360-tool`) en tu computadora.
2. Abrí Google Chrome y navegá a la URL: `chrome://extensions/`
3. En la esquina superior derecha, activá el **Modo desarrollador** (Developer mode).
4. Hacé clic en el botón **Cargar descomprimida** (Load unpacked) que aparecerá en la parte superior izquierda.
5. Seleccioná la carpeta `vml-aem-360-tool` que extrajiste en el paso 1.
6. ¡Listo! Verás el ícono ciberpunk de VML en tu barra de extensiones.

## 💻 Guía de Uso

1. **Iniciá Sesión en AEM:** Asegurate de tener una pestaña abierta de tu entorno de AEM Cloud Service y de haber iniciado sesión correctamente.
2. **Abrí la Extensión:** Hacé clic en el ícono de la extensión en la barra de tu navegador.
3. **Ingresá la Ruta Destino:** En el campo `AEM BASE PATH`, ingresá la ruta exacta dentro de AEM donde querés inyectar las carpetas (ejemplo: `/content/dam/mi-proyecto/autos/ford`).
4. **Activá la Dropzone:** Presioná el botón `ACTIVATE DROPZONE IN AEM`. Esto inyectará una ventana negra sobre la pestaña de AEM.
5. **Arrastrá y Soltá:** Minimizá tu navegador si es necesario, seleccioná las carpetas desde tu computadora (puedes seleccionar múltiples carpetas al mismo tiempo) y arrastralas sobre el recuadro que dice `Drop your folders here`.
6. **Esperá y Finalizá:** La herramienta procesará la estructura y comenzará a subir. Gracias a la barra de progreso y la consola integrada, podrás ver en vivo cada archivo que se sube. Cuando termine, aparecerá el botón `Finish Upload and Close` para cerrar la herramienta.

## ⚠️ Notas Importantes
- **Cuidado con la Ruta Destino:** Asegurate de escribir correctamente la ruta base en el popup. La herramienta no cuenta con "Memoria de Ruta" por motivos de seguridad; esto fuerza a cada operador a confirmar conscientemente el destino de los archivos antes de cada carga para evitar inyecciones en proyectos ajenos.
- **Red:** Si vas a subir miles de archivos pesados, asegurate de tener una conexión a internet estable. Si ocurre un microcorte, la consola integrada te mostrará qué archivos específicos fallaron para que puedas reintentarlos.

## 🛡️ Seguridad y Privacidad (AppSec)

La extensión cumple estrictamente con los estándares corporativos recomendados para **Manifest V3**:
1. **Zero Data Tracking**: No recopila, transmite ni almacena datos fuera del entorno local del navegador ni de la instancia de AEM del usuario. Todo el procesamiento se realiza en memoria.
2. **Protección XSS**: La herramienta evita la inyección dinámica de HTML no sanitizado proveniente de fuentes externas para prevenir vulnerabilidades de Cross-Site Scripting (XSS).
3. **Mismo Origen (Same-Origin)**: Opera de forma segura bajo las políticas de origen cruzado nativas del navegador, inyectándose únicamente en los dominios permitidos de Adobe Cloud (`*.adobeaemcloud.com`).
4. **Permisos Mínimos**: Utiliza exclusivamente los permisos estrictamente necesarios (`scripting` y permisos de *host* limitados) para comunicarse con la pestaña activa, minimizando la superficie de ataque.

---
**Desarrollado con ❤️ por el Automation Squad de VML Argentina.**
