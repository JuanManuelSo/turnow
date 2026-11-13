# Diseño: plataforma SaaS de turnos adaptable

Estado: dirección de diseño inicial. Las pantallas y los valores visuales se validarán mediante prototipos y pruebas de uso.

Documento relacionado: `PRODUCT.md`, que define las funcionalidades y sus etapas. Este documento describe cómo deben presentarse y utilizarse; no adelanta funcionalidades previstas para entregas posteriores.

## 1. Dirección visual

Una plataforma de reservas de estética editorial contemporánea: clara, cálida y precisa. La identidad de cada negocio se expresa mediante color, tipografía y contenido, sobre una estructura consistente y accesible.

El espacio, la jerarquía y las superficies suaves organizan la interfaz. La agenda y las acciones principales concentran la atención. El resultado debe transmitir calidad, confianza y profesionalismo, con personalidad suficiente para distinguirse de una plantilla genérica.

### Atributos

- **Limpia:** cada elemento tiene una función y una jerarquía.
- **Distintiva:** composición, tipografía y contenido aportan carácter.
- **Profesional:** estados, alineaciones y comportamientos son consistentes.
- **Cercana:** lenguaje directo y formularios comprensibles.
- **Eficiente:** las tareas frecuentes requieren pocos pasos.
- **Adaptable:** cada negocio conserva su identidad sin degradar la experiencia.

La percepción premium debe surgir del cuidado de los detalles y del funcionamiento cotidiano: buena lectura, tiempos de respuesta claros, edición confiable y ausencia de sorpresas.

## 2. Dos experiencias, un sistema

| Experiencia | Identidad | Prioridad |
| --- | --- | --- |
| Página pública y reserva | Marca del negocio | Confianza y facilidad para reservar |
| Panel de administración | Marca estable de la plataforma con presencia sutil del negocio | Claridad operativa y productividad |

La interfaz pública debe sentirse como una extensión del negocio. El panel debe mantener una navegación reconocible al cambiar de contexto y al crecer el producto.

### Ritmo visual

- Público: composición aireada, decisiones breves y una acción dominante.
- Panel: densidad moderada, lectura rápida y espacio suficiente para operar.
- Agenda: mayor densidad cuando aporta contexto, sin reducir excesivamente texto ni objetivos táctiles.

## 3. Identidad y personalización

### Configurable por negocio

- Logo y nombre.
- Paleta de colores.
- Tipografía de títulos y tipografía de interfaz mediante opciones compatibles.
- Imagen principal opcional.
- Fotografías de profesionales o servicios cuando la funcionalidad esté disponible.
- Textos, ubicación, contacto y redes.
- Visibilidad de información opcional y opciones admitidas por el flujo.

### Reglas compartidas

- Estructura semántica y navegación.
- Jerarquías, espaciado y tamaños mínimos.
- Validación y comportamiento de formularios.
- Estados de reserva y de disponibilidad.
- Legibilidad, accesibilidad y adaptación a dispositivos.

El dueño personaliza mediante controles guiados y vista previa. La primera entrega no incluye edición libre de CSS ni construcción de páginas mediante bloques arbitrarios.

### Negocios con identidad existente

Se toma su identidad como origen y se traduce a una paleta funcional. Si un color no tiene contraste suficiente, se utiliza una variante accesible para texto y acciones, conservando el color original en usos decorativos adecuados.

Una fuente de marca puede utilizarse en títulos aunque no sea apta para formularios. La incorporación de fuentes propias requiere compatibilidad técnica, licencia de uso y validación de lectura; el mecanismo de carga no se considera una función confirmada del MVP.

### Negocios sin identidad

Ofrecer combinaciones curadas, con una vista previa real del turnero:

| Paleta | Dirección |
| --- | --- |
| Mineral | Neutros fríos y azul |
| Botánica | Neutros cálidos y verde profundo |
| Tinta | Marfil, grafito y acento sobrio |
| Arcilla | Neutros cálidos y terracota |

Las paletas son puntos de partida editables; no se asignan rígidamente a un rubro. Sus valores finales deben validarse en estados normales, seleccionados, de foco y deshabilitados.

## 4. Fundamentos visuales

### 4.1 Color

Usar nombres semánticos para que las pantallas no dependan de colores específicos:

| Token conceptual | Función |
| --- | --- |
| `background` | Fondo general ligeramente tonalizado |
| `surface` | Área principal de contenido |
| `surface-muted` | Agrupación secundaria |
| `text-primary` | Contenido principal |
| `text-secondary` | Metadatos y ayudas |
| `brand` / `on-brand` | Acción principal y su texto |
| `brand-soft` / `on-brand-soft` | Selección y énfasis suave |
| `border-subtle` | Separadores discretos |
| `border-control` | Límite visible de controles cuando sea necesario |
| `focus-ring` | Foco de teclado |
| `success`, `warning`, `danger`, `info` | Estados semánticos con sus fondos y textos asociados |

- Concentrar el color de marca en acciones, selección y detalles de identidad.
- Mantener superficies tranquilas y texto de alto contraste.
- No usar únicamente color para comunicar disponibilidad o estado.
- Los colores semánticos mantienen su significado aunque cambie la marca.
- El tema claro es la base inicial; el modo oscuro requiere un diseño propio y queda pendiente de priorización.

### 4.2 Tipografía

Propuesta inicial: **Manrope** como fuente de interfaz. **DM Sans** es una alternativa curada. Una serif editorial puede incorporarse para títulos en determinadas identidades.

- Una familia por defecto; un máximo recomendado de dos familias por tema.
- Pocos pesos y roles bien definidos.
- Números tabulares en horarios, precios y métricas cuando la fuente los soporte.
- Texto base público de 16 px, con interlineado aproximado de 1.5.
- Metadatos y controles compactos del panel pueden usar 14 px si mantienen buena lectura.
- No colocar información operativa indispensable en texto diminuto.
- Títulos fluidos según pantalla y longitud; evitar escalas que desplacen la acción principal innecesariamente.
- Longitud orientativa de párrafos: 45–75 caracteres por línea.

Los tamaños se implementarán con unidades relativas y deben soportar ampliación de texto sin pérdida de contenido.

### 4.3 Espaciado y composición

Escala inicial en múltiplos de 4: 4, 8, 12, 16, 24, 32, 48 y 64 px.

- Márgenes laterales móviles de aproximadamente 16–24 px.
- Formularios con ancho de lectura contenido.
- Página pública con ancho máximo orientativo de 1120–1200 px en escritorio.
- Panel adaptable al ancho disponible, especialmente en la agenda.
- Separar grupos por espacio antes de agregar contenedores.
- Alinear títulos, texto y controles sobre ejes consistentes.

Estos valores son bases de diseño, no restricciones que obliguen a una composición incómoda.

### 4.4 Bordes, radios y elevación

- Evitar encerrar cada sección en una tarjeta con borde.
- Usar fondos suaves y espacio para agrupar información.
- Reservar líneas para tablas, listas, formularios y divisiones útiles.
- Radios iniciales: 8 px para controles, 12–16 px para superficies destacadas.
- Usar formas de pastilla en etiquetas o filtros específicos, sin convertir todos los elementos en cápsulas.
- Sombras discretas en menús, modales y paneles flotantes.
- Los controles deben seguir siendo identificables aun cuando la estética general tenga pocos bordes.

### 4.5 Imágenes e iconos

- Fotografías reales, con recortes consistentes y buena calidad.
- Imágenes opcionales: el diseño debe funcionar completamente sin ellas.
- Si falta una foto de profesional, usar iniciales o un recurso neutro consistente.
- Una sola familia de iconos, con grosor y tamaños coherentes.
- Acciones ambiguas llevan etiqueta textual; los botones solo con icono tienen nombre accesible.
- Evitar fotografías genéricas o decoración que compitan con reservar.

## 5. Página de bienvenida

### Objetivo

Presentar al negocio, generar confianza y permitir iniciar o cancelar una reserva rápidamente.

### Jerarquía

1. Logo y nombre.
2. Categoría o frase breve opcional.
3. Título con personalidad y descripción corta.
4. **Reservar turno**, acción principal.
5. **Cancelar turno**, acción secundaria visible.
6. Ubicación e información útil.
7. Fotografía opcional.
8. Información adicional y enlaces de contacto.

En escritorio se admite una composición asimétrica de texto e imagen. En móvil, la identidad y la acción principal preceden al contenido complementario. Las imágenes no deben impedir encontrar el botón de reserva rápidamente.

Redes y enlaces externos tienen menor jerarquía que la acción principal. Los campos vacíos se omiten sin dejar huecos o títulos sin contenido.

Los bloques de servicios o profesionales destacados pueden incorporarse cuando estén previstos en el alcance; no son necesarios para que la bienvenida se vea completa.

## 6. Experiencia de reserva

### Estructura general

- Mantener la identidad visual del negocio durante todo el recorrido.
- Cuando el negocio tenga varias sedes, pedir elegir sede antes de mostrar disponibilidad; mostrar nombre, dirección y una indicación útil de ubicación.
- Permitir un enlace directo a una sede con posibilidad clara de cambiarla.
- Mostrar progreso comprensible en los pasos relevantes.
- Permitir volver conservando las elecciones que sigan siendo válidas.
- Omitir pasos innecesarios, como elegir profesional cuando solo existe uno disponible para el servicio.
- Si cambiar una selección invalida otra, explicarlo y solicitar una nueva elección.

### Servicio

Presentar opciones en filas amplias o superficies ligeras con nombre, descripción breve opcional, duración y precio cuando sea público. Toda la opción puede funcionar como área de selección con semántica accesible.

La selección se indica con fondo, texto e indicador; no solo con un cambio de color.

### Profesional

- Nombre y foto opcional.
- Mostrar solo profesionales asignados y activos en la sede seleccionada.
- Información breve relevante para elegir.
- Opción **Cualquier profesional disponible** claramente identificada.
- Explicación: “Te asignaremos un profesional disponible al confirmar”.

No sugerir que el cliente ya tiene un profesional asignado antes de que se confirme la reserva.

### Día y horario

- Fecha legible con día de la semana.
- Navegación simple entre días y acceso a otras fechas.
- Horarios agrupados cuando ayude a escanear, por ejemplo mañana y tarde.
- Un horario aparece una sola vez en disponibilidad combinada.
- Estado seleccionado inequívoco y objetivos táctiles cómodos.
- No mostrar horarios ocupados como seleccionables.
- Si no hay disponibilidad, ofrecer consultar la próxima fecha disponible.
- Comunicar la zona horaria cuando pueda existir ambigüedad.

### Datos y revisión

- Solicitar únicamente los datos necesarios.
- Etiquetas persistentes; el placeholder es un ejemplo, no reemplaza la etiqueta.
- Teclados móviles adecuados para teléfono y email.
- Campos obligatorios y opcionales identificables.
- Resumen con servicio, profesional o modalidad de asignación, fecha, hora y precio visible.
- Política de cancelación accesible antes de confirmar.
- Acción final explícita: **Confirmar turno**.

En escritorio se puede mantener un resumen lateral. En móvil, un resumen compacto y una acción fija inferior son admisibles siempre que no tapen contenido, foco ni teclado.

### Confirmación

- Mensaje inequívoco: **Tu turno está confirmado**.
- Fecha y hora como información principal.
- Servicio y profesional asignado.
- Dirección e instrucciones relevantes.
- Código privado visible, con botón **Copiar código** y feedback accesible.
- Explicación breve de cómo utilizarlo para cancelar.

No mostrar éxito antes de la confirmación del servidor. Si falla una notificación externa, distinguir ese problema del estado confirmado del turno.

## 7. Cancelación

1. Acceso desde **Cancelar turno** en la bienvenida.
2. Campo para ingresar o pegar el código privado.
3. Resumen mínimo del turno encontrado, sin datos personales innecesarios.
4. Explicación de la consecuencia y acción **Cancelar este turno**.
5. Confirmación de cancelación y posibilidad de reservar nuevamente.

- Buscar el turno nunca lo cancela automáticamente.
- Mensaje útil si el código es inválido.
- Si ya se canceló, mostrar ese estado sin tratarlo como un error inesperado.
- Si venció el plazo, explicar la restricción y mostrar el contacto del negocio.
- Si el cliente perdió el código, ofrecer una indicación clara para contactar al negocio.
- El estilo destructivo se reserva para confirmar la cancelación, no para el acceso inicial desde la bienvenida.

## 8. Panel de administración

### Navegación

Propuesta inicial:

- Inicio.
- Agenda.
- Servicios.
- Profesionales.
- Página pública.
- Configuración.

Las comunicaciones tendrán una sección cuando se implemente ese módulo. Ocultar funciones no disponibles evita promesas visuales que el producto todavía no cumple.

En escritorio: navegación lateral sobria. En móvil: acceso rápido a las tareas frecuentes y menú compacto para el resto, a validar en prototipo.

### Inicio

- Priorizar agenda de hoy y próximos turnos.
- Permitir filtrar por sede y ofrecer una vista general del negocio; la sede de cada turno debe ser visible.
- Métricas pequeñas con período explícito.
- Acceso a **Nuevo turno** y **Copiar enlace de reservas**.
- Estados vacíos que orienten a completar la configuración o compartir el enlace.

Los gráficos se incorporan cuando responden una pregunta concreta del dueño.

### Agenda

- Escritorio: vistas diaria y semanal, con filtro por profesional.
- Móvil: vista diaria o lista cronológica como opciones principales.
- Mostrar hora, cliente, servicio y profesional según el contexto.
- Filtrar por sede; en la vista general, identificar claramente la sede de cada turno.
- Estados con texto y señales visuales coherentes.
- Reservar el color para facilitar lectura, sin crear una agenda saturada.
- Al usar colores por profesional, diferenciar los estados mediante etiquetas o iconos.
- Abrir detalles en un panel lateral en escritorio y una vista adecuada al ancho en móvil.
- Conservar fecha, filtros y posición al cerrar el detalle.

Crear, reprogramar, cancelar y bloquear deben tener entradas visibles. La interacción básica no debe depender de arrastrar elementos; si se incorpora arrastre, debe existir una alternativa con formularios.

### Formularios operativos

- Agrupar campos por tarea, con valores iniciales razonables.
- Mostrar claramente profesional, fecha, duración y efecto sobre disponibilidad.
- Explicar conflictos antes de guardar cuando sea posible.
- Ante un fallo de guardado, conservar los cambios ingresados.
- Pedir confirmación explícita para acciones destructivas o cambios con impacto importante.
- Evitar confirmaciones redundantes en acciones rutinarias reversibles.

## 9. Editor de identidad y página pública

### Organización

| Sección | Contenido |
| --- | --- |
| Identidad | Logo, paleta y tipografía |
| Bienvenida | Textos, imagen, ubicación, redes e información visible |
| Experiencia de reserva | Opciones de presentación disponibles |
| Mensajes | Instrucciones y comunicaciones, según etapa |

Horarios, servicios y reglas operativas se administran en sus secciones específicas, con acceso contextual desde el editor cuando sea útil.

### Comportamiento

- Escritorio: controles y vista previa juntos cuando haya espacio suficiente.
- Móvil: alternancia clara entre edición y vista previa.
- Vista previa actualizada al cambiar opciones visuales.
- Estado **Cambios sin guardar** y acción explícita para guardar/publicar los cambios.
- Diferenciar la previsualización de una publicación real.
- Advertir antes de salir con cambios sin guardar.
- Permitir descartar cambios de la sesión de edición.
- Señalar configuraciones con problemas de contraste y proponer una variante accesible.
- La vista previa utiliza datos de ejemplo claramente identificados cuando faltan datos reales.

## 10. Avisos y recordatorios

Al implementarse el módulo, los mensajes deben conservar la identidad del negocio y priorizar la información operativa.

### Estructura de mensaje

1. Negocio y motivo del mensaje.
2. Fecha y hora.
3. Servicio y profesional o recurso asignado.
4. Ubicación o instrucciones pertinentes.
5. Acción de gestión cuando corresponda.

En el panel:

- Configurar tipos de aviso, canales y anticipación.
- Ofrecer una vista previa por canal.
- Distinguir estados solicitado, enviado/aceptado, entregado y fallido según la información disponible.
- No presentar una entrega como garantizada.
- Informar errores con una acción útil cuando exista.
- Mantener los datos obligatorios del turno aunque se personalice el texto.

Los avisos de la interfaz deben distinguir éxito operativo y fallos de comunicación: una reserva confirmada sigue siendo válida aunque no se haya enviado el mensaje.

## 11. Componentes y estados

El sistema compartirá componentes con variantes limitadas y roles claros:

- Botones: principal, secundario, textual y destructivo.
- Campos: texto, teléfono, email, selección y fecha/hora.
- Opciones seleccionables para servicios, profesionales y horarios.
- Etiquetas de estado.
- Listas, tablas y agenda.
- Avisos contextuales, mensajes breves y errores de campo.
- Modales y paneles de detalle.
- Navegación y pasos de reserva.
- Estados vacíos y esqueletos de carga cuando aporten estabilidad.

### Estados obligatorios

| Estado | Respuesta de diseño |
| --- | --- |
| Carga | Indicar progreso y conservar contexto |
| Vacío inicial | Explicar qué falta y ofrecer el siguiente paso |
| Sin resultados | Permitir modificar filtros o fecha |
| Error de campo | Mensaje específico junto al control |
| Error general | Explicación accionable y posibilidad de reintento |
| Conflicto de horario | Informar pérdida de disponibilidad y conservar datos |
| Guardado exitoso | Feedback breve y estado actualizado |
| Acción deshabilitada | Explicar la causa cuando no sea evidente |
| Conexión interrumpida | No afirmar que se guardó; permitir verificar o reintentar sin duplicar |

No depender de mensajes temporales para comunicar información indispensable. Los detalles de una reserva y su código permanecen visibles en la confirmación.

## 12. Accesibilidad y principios UX

Objetivo: WCAG 2.2 nivel AA, verificado durante la implementación.

- Contraste de texto normal de al menos 4.5:1 y de texto grande de al menos 3:1.
- Contraste de componentes y señales visuales necesarias conforme al criterio aplicable, generalmente 3:1.
- Foco visible, orden de tabulación lógico y operación por teclado.
- Áreas táctiles principales de aproximadamente 44 × 44 px; verificar también los requisitos mínimos de tamaño y separación de WCAG.
- Estructura semántica de títulos, formularios y navegación.
- Etiquetas asociadas y errores anunciados para tecnologías de asistencia.
- Gestionar foco al abrir y cerrar diálogos y al cambiar de paso.
- No comunicar significado exclusivamente por color, posición o animación.
- Permitir zoom y reflujo; ofrecer una alternativa legible a vistas densas de agenda.
- Respetar preferencias de movimiento reducido.

Principios de interacción:

1. Una acción principal por contexto.
2. Mostrar información para reconocer, no exigir memorizar.
3. Presentar opciones avanzadas progresivamente.
4. Prevenir errores antes de pedir al usuario que los resuelva.
5. Conservar trabajo y contexto al corregir un problema.
6. Mantener consistencia entre componentes y lenguaje.
7. Explicar restricciones con un siguiente paso útil.

## 13. Movimiento y rendimiento percibido

- Transiciones cortas, orientativamente de 120–200 ms para cambios simples.
- Animar cambios que ayuden a comprender selección, apertura o progreso.
- Evitar desplazamientos decorativos que retrasen la reserva.
- Reservar espacio para imágenes y contenido asincrónico para reducir saltos visuales.
- Optimizar imágenes y cargar solo las variantes tipográficas necesarias.
- Mostrar progreso durante operaciones; no simular confirmaciones anticipadas.

## 14. Lenguaje y microcopy

Español claro, cercano y profesional. Para el lanzamiento local puede utilizarse voseo de manera consistente. Evitar tecnicismos en la experiencia pública.

Ejemplos:

- “Elegí un horario”.
- “Cualquier profesional disponible”.
- “Ese horario acaba de ocuparse. Elegí otro para continuar”.
- “Tu turno está confirmado”.
- “Guardá este código para cancelar tu turno”.
- “No hay horarios disponibles para esta fecha”.
- “Tus cambios se guardaron”.

La terminología por rubro podrá adaptarse mediante plantillas conforme al alcance del producto. La interfaz debe mantener coherencia entre página, reserva y mensajes.

## 15. Validación y próximos entregables visuales

### Tres pantallas de referencia

1. Bienvenida/selección de sede: identidad, confianza y ubicación clara.
2. Selección de horario: claridad, sede, selección y resumen de reserva.
3. Agenda del dueño: densidad, filtro por sede, navegación y operación cotidiana.

Diseñar cada una en móvil y escritorio, y probar al menos dos identidades visuales diferentes sobre la misma estructura.

### Criterios de revisión

- El usuario identifica cómo reservar y cómo cancelar sin explicación externa.
- La página funciona con y sin imagen principal.
- La marca se reconoce sin comprometer contraste ni lectura.
- Se comprende qué se reserva, cuándo y con quién antes de confirmar.
- El código de cancelación es fácil de encontrar y copiar.
- El dueño puede localizar y modificar un turno sin perder el contexto de agenda.
- La interfaz móvil no es una reducción de la agenda de escritorio.
- Las configuraciones visuales se reflejan en la vista previa antes de publicarse.
- Los estados de carga, error, vacío, selección y éxito están diseñados.
- El flujo completo es operable por teclado y legible con ampliación.

### Decisiones visuales pendientes de prototipo

- Identidad y nombre definitivos de la plataforma.
- Paleta propia del panel.
- Valores finales de las paletas curadas.
- Familias tipográficas disponibles y mecanismo de incorporación de identidad existente.
- Composición final de bienvenida y navegación móvil del panel.
- Necesidad futura de variantes adicionales o modo oscuro.
