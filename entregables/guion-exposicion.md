# Conta Smart Perú: exposición entre tres personas

Duración sugerida: 15 minutos, cinco minutos por persona. El sistema es una aplicación en desarrollo: las demostraciones deben usar datos de prueba y los resultados contables requieren revisión profesional.

## Persona 1: presentación y configuración

**Objetivo:** explicar el problema, los usuarios y cómo se prepara la empresa.

1. Presentar Conta Smart Perú como herramienta para registrar operaciones y consultar información contable.
2. Mostrar el acceso de administrador y el guardado en Azure. No decir la contraseña durante la exposición.
3. Abrir Datos de la empresa, período contable y plan de cuentas; explicar que el catálogo cargado proviene del PCGE modificado de 2010 y que las cuentas pueden consultarse y editarse.
4. Explicar el balance inicial con un ejemplo: si los socios aportan S/ 5,000 en efectivo, Debe 101 Caja y Haber 50 Capital, S/ 5,000 en cada lado. Distinguir caja y banco y aclarar que se trata de un ejemplo.
5. Dar paso: «Una vez preparado el sistema, registramos las operaciones comerciales».

## Persona 2: compras, ventas y existencias

**Objetivo:** mostrar cómo una operación llega al inventario y al Libro Diario.

1. Mostrar Productos y servicios: una mercadería tiene stock y un servicio no.
2. Explicar una compra de ejemplo de diez unidades por S/ 118 en total, IGV incluido: base S/ 100 e IGV S/ 18, siempre que corresponda crédito fiscal. Elegir proveedor y datos de un comprobante de prueba, no usar números reales inventados.
3. Mostrar las opciones de pago contado por efectivo o transferencia, y crédito con saldo pendiente. No contabilizar datos ficticios en la empresa de otra persona.
4. Mostrar que Kardex refleja la entrada; en una venta de dos unidades, explica que deberían quedar ocho. Describir la generación de asiento de venta y costo.
5. Mostrar servicios como luz o alquiler. Para energía, elegir recibo de servicios públicos y definir crédito fiscal según el documento. Aclarar que 1683 de alquiler y devoluciones siguen pendientes.
6. Dar paso: «Los movimientos registrados se reflejan en tesorería y reportes».

## Persona 3: tesorería, libros y cierre

**Objetivo:** mostrar cómo se verifica el resultado de las operaciones y comunicar los límites.

1. Presentar Libro de bancos, caja y cuentas por pagar/cobrar. Una transferencia contabilizada se vincula con la cuenta bancaria; un pago a crédito se registra después en cuentas por pagar.
2. Explicar un préstamo: ingreso a la cuenta bancaria 104 contra obligaciones financieras 45 o una subcuenta apropiada. El sistema no genera cronogramas ni separa automáticamente intereses y capital.
3. Mostrar Libro Diario y Libro Mayor: el Diario muestra asientos; el Mayor agrupa movimientos por cuenta. Cada cuenta y subcuenta se presenta por separado.
4. Explicar que el balance de comprobación compara el Debe y el Haber, pero cuadrar no garantiza que un comprobante o cuenta sean correctos.
5. Mostrar estados financieros y resumen de IGV como reportes de apoyo. Indicar que necesitan revisión contable, que el historial detallado no está implementado y que la información de prueba no es una declaración ante SUNAT.

## Preguntas probables

- **¿Dónde se guardan los datos?** La aplicación sincroniza una copia con Azure cuando hay sesión y conexión; también mantiene una copia en el navegador. Si hay conflicto, debe revisarse antes de reemplazar datos.
- **¿La venta emite una factura válida ante SUNAT?** Registrar un documento internamente no demuestra que se haya emitido o aceptado electrónicamente por SUNAT.
- **¿Qué ocurre con el crédito?** La operación queda pendiente; los pagos parciales reducen el saldo y generan sus asientos vinculados.
- **¿El sistema está listo para contabilidad real?** Tiene funciones operativas, pero aún requiere completar controles, pruebas, seguridad y revisión contable.
