# CONTA SMART PERÚ

> Prototipo académico incompleto. No usar para contabilidad real, comprobantes electrónicos o declaraciones tributarias.

## Estado de esta rama de mejora

El motor de consulta y validación se encuentra en `lib/accounting.mjs`. El estado de resultados utiliza el diario y calcula ventas netas, costo y gastos netos; el balance presenta patrimonio y resultado a partir de las cuentas y muestra diferencias. Las compras nuevas de mercadería generan un asiento de destino. Las operaciones nuevas se validan por partida doble. El formulario usa la fecha seleccionada y la zona horaria de Lima. Hay formularios de apertura y asientos manuales de varias líneas, Libro Mayor, consulta de caja, arqueo imprimible, bloqueo local de periodos y respaldo JSON local. Estos componentes están en `app/AccountingTools.tsx`. Los documentos al crédito admiten cobros y pagos parciales, con movimientos y asientos vinculados; la lógica reside en `lib/settlements.mjs`.

### Base de datos en desarrollo

`lib/ledger-db.mjs` contiene una base SQLite independiente para asientos, cuentas, periodos, usuarios, sesiones y auditoría. Usa transacciones, verifica el cuadre y evita operaciones y reversiones duplicadas. Los tests comprueban persistencia en disco, reversión, periodos cerrados, contraseña con scrypt y vencimiento de sesiones. Requiere Node.js 22.13 o superior; `node:sqlite` es experimental en Node 22. **Todavía no está conectada a la interfaz ni al servidor web.** `lib/ledger-service.mjs` agrega comprobaciones de sesión, rol y aislamiento de empresa para operaciones del diario y periodos; sus pruebas son locales y tampoco está conectado a la web ni a PostgreSQL. No existe migración de los datos del navegador, sistema de inicio de sesión web, validación de permisos en rutas ni respaldo automatizado de la base; no se debe desplegar ni usar esta base con datos reales hasta completar y verificar esos componentes. La web publicada continúa utilizando `localStorage`.

Pruebas: `npm test`. Incluyen la venta de S/ 1,180 con IGV incluido y costo de S/ 600, rechazo de asientos descuadrados y destino de mercadería.

**Limitaciones críticas:** La persistencia sigue en `localStorage`, sin base de datos, autenticación, permisos ni transacciones de servidor. El respaldo JSON se descarga sin cifrar y su restauración reemplaza los datos locales previa confirmación; conserve copias seguras. Las compras anteriores no se modifican automáticamente y pueden carecer de asientos de destino. El inventario inicial no genera asiento de apertura; la apertura manual aún no crea existencias ni cuentas bancarias. El arqueo solo calcula e imprime, no guarda actas ni contabiliza ajustes, y la cuenta 10 puede incluir bancos. El bloqueo de periodos es local, sin autorización ni auditoría; no realiza cierre contable. El promedio móvil y Kardex se aplican solo a operaciones nuevas y toman como punto de partida el stock y costo anteriores; no reconstruyen el historial. Solo admiten cantidades enteras y bloquean operaciones anteriores al último movimiento registrado del producto. Los cobros y pagos parciales utilizan la cuenta general 10 y no permiten identificar caja/banco, anular ni editar movimientos. La conciliación y los cheques no están implementados. Los informes son simplificados, usan cuentas generales rígidas y no contemplan una clasificación financiera completa. La exportación del balance es CSV; no están implementados PDF ni XLSX. Algunos módulos siguen pendientes y se indican como tales en la interfaz.

El catálogo `lib/pcge-2010.json` contiene 1,792 cuentas extraídas mecánicamente de las páginas impresas 16–67 del documento **VERSIÓN MODIFICADA DEL PLAN CONTABLE GENERAL EMPRESARIAL**, facilitado por el usuario (PDF de 2010). El elemento 9 se deja para estructuración por cada entidad, como indica ese documento. El catálogo se incorpora sin sobrescribir las cuentas ya guardadas en el navegador; códigos preexistentes conservan su denominación y naturaleza. Los códigos nuevos no tienen naturaleza configurada por defecto. Las denominaciones y naturalezas son editables, pero los códigos no cambian y los asientos previos conservan su denominación histórica. Las cuentas empleadas por el motor automático no se pueden desactivar. El script `scripts/extract-pcge.mjs` reproduce la extracción a partir de un texto generado con `pdftotext -layout`; las pruebas comprueban duplicados, jerarquía y ejemplos, no la revisión manual de cada denominación.

**Versión:** el PDF facilitado es anterior al [PCGE modificado 2019 del MEF](https://www.mef.gob.pe/contenidos/conta_publ/documentac/PCGE_2019.pdf), aprobado mediante la [Resolución CNC 002-2019-EF/30](https://www.mef.gob.pe/es/contabilidad-publica-sp-6700/57-consejo-normativo-de-contabilidad/1383-resoluciones-del-consejo-normativo-de-contabilidad). No debe confundirse el catálogo de 2010 con el de 2019 ni asumirse que la versión anterior es vigente para una operación real.

El flujo de GitHub Actions publica `main` en Azure. No fusionar ni desplegar esta rama sin autorización y revisión contable y de seguridad.

Sistema contable académico local, construido con Next.js y TypeScript. Su propósito es demostrar el ciclo contable de una empresa peruana con partida doble, IGV configurable e inventarios.

## Instalación y ejecución

Requisitos: Node.js 20+ y npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para la versión de producción:

```bash
npm run build
npm run start
```

## Uso

- Configure primero los datos de la empresa y registre sus propios productos y operaciones de prueba. La opción de cargar demostraciones inconsistentes se retiró; los datos previamente guardados no se eliminan.
- En registros de compras y ventas, el switch **IGV incluido / sin IGV incluido** recalcula base, IGV y total al instante.
- Cada operación confirmada crea asientos balanceados; ventas y compras al contado crean su cobranza/pago adicional. Las ventas de mercadería validan stock y crean costo de ventas.
- El Libro Diario y el Balance de comprobación se generan desde los asientos. Los datos se guardan en `localStorage` del navegador, por lo que sobreviven al reinicio del servidor en el mismo equipo/navegador.
- El botón de exportación del balance genera un CSV compatible con Excel.

## Arquitectura

La interfaz principal está implementada en `app/page.tsx`; el modelo de documentos, productos y asientos se mantiene en un único estado persistente. El motor `entryFromDoc` traduce compras y ventas a partidas dobles. `calc` aplica redondeo monetario a dos decimales para el IGV. `lib/accounting.mjs` agrupa cálculos de saldos, validación y reportes simplificados.

## PCGE y limitaciones

Incluye el catálogo de referencia del documento de 2010 y cuentas personalizadas. Esta versión no es un sistema homologado por SUNAT ni genera PLE/SIRE; sus reportes son internos. La consulta de DNI/RUC usa un proveedor externo y requiere `APIPERU_TOKEN` en el servidor. Una implementación empresarial debe incorporar base de datos, autenticación, permisos, auditoría y exportaciones.

El directorio `lib/postgres` prepara el esquema y la configuración TLS para la base separada `conta_smart` en Azure. El esquema no se ha aplicado y la conexión aún no está integrada con el servidor o la interfaz; los datos publicados continúan en el navegador.

`lib/postgres/auth.mjs` y `lib/postgres/snapshots.mjs` preparan sesiones y guardado con control de versiones y roles; sus pruebas usan respuestas simuladas, no una conexión PostgreSQL real. Aún faltan endpoints web, interfaz de acceso y migración protegida.

La API en preparación (`lib/postgres/http-api.mjs`) aplica sesiones, roles, origen permitido y control de versiones; `validate-snapshot.mjs` rechaza asientos descuadrados y duplicados. No está integrada en `server.js`, no se ha aplicado el esquema y las pruebas de PostgreSQL usan dobles simulados. No utilizar con datos reales ni desplegar hasta implementar la interfaz, la migración, la validación completa y las pruebas contra PostgreSQL real.

La rama de desarrollo incluye una API PostgreSQL opcional y una interfaz de respaldo manual en Azure. La API permanece desactivada salvo que `CONTA_DB_ENABLED=true`; requiere `CONTA_DB_HOST`, `CONTA_DB_USER` y `CONTA_DB_PASSWORD`. El script `scripts/setup-postgres.mjs` prepara el esquema y un administrador inicial usando variables de entorno; no modifica usuarios existentes. No se ha ejecutado contra Azure. La sincronización automática no está implementada, la copia de navegador no se elimina y la migración se rechaza si contiene asientos descuadrados. Antes de activar en producción hacen falta pruebas reales contra PostgreSQL, configuración de credenciales, recuperación de cuenta, validación de seguridad y contable completa y pruebas de migración con respaldos.
