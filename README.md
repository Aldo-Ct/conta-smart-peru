# CONTA SMART PERÚ

> Prototipo académico incompleto. No usar para contabilidad real, comprobantes electrónicos o declaraciones tributarias. Esta rama no ha sido desplegada a producción.

## Estado de esta rama de mejora

El motor de consulta y validación se encuentra en `lib/accounting.mjs`. El estado de resultados utiliza el diario y calcula ventas netas, costo y gastos netos; el balance presenta patrimonio y resultado a partir de las cuentas y muestra diferencias. Las compras nuevas de mercadería generan un asiento de destino. Las operaciones nuevas se validan por partida doble. El formulario usa la fecha seleccionada y la zona horaria de Lima. Hay formularios de apertura y asientos manuales de varias líneas, Libro Mayor, consulta de caja, arqueo imprimible, bloqueo local de periodos y respaldo JSON local. Estos componentes están en `app/AccountingTools.tsx`.

Pruebas: `npm test`. Incluyen la venta de S/ 1,180 con IGV incluido y costo de S/ 600, rechazo de asientos descuadrados y destino de mercadería.

**Limitaciones críticas:** La persistencia sigue en `localStorage`, sin base de datos, autenticación, permisos ni transacciones de servidor. El respaldo JSON se descarga sin cifrar y su restauración reemplaza los datos locales previa confirmación; conserve copias seguras. Las compras anteriores no se modifican automáticamente y pueden carecer de asientos de destino. El inventario inicial no genera asiento de apertura; la apertura manual aún no crea existencias ni cuentas bancarias. El arqueo solo calcula e imprime, no guarda actas ni contabiliza ajustes, y la cuenta 10 puede incluir bancos. El bloqueo de periodos es local, sin autorización ni auditoría; no realiza cierre contable. El promedio móvil y Kardex se aplican solo a operaciones nuevas y toman como punto de partida el stock y costo anteriores; no reconstruyen el historial. Solo admiten cantidades enteras y bloquean operaciones anteriores al último movimiento registrado del producto. La conciliación, cheques y pagos parciales no están implementados. Los informes son simplificados, usan cuentas generales rígidas y no contemplan una clasificación financiera completa. La exportación del balance es CSV; no están implementados PDF ni XLSX. Algunos módulos siguen pendientes y se indican como tales en la interfaz.

La referencia oficial para la siguiente fase es el [PCGE modificado 2019 del MEF](https://www.mef.gob.pe/contenidos/conta_publ/documentac/PCGE_2019.pdf), aprobado mediante la [Resolución CNC 002-2019-EF/30](https://www.mef.gob.pe/es/contabilidad-publica-sp-6700/57-consejo-normativo-de-contabilidad/1383-resoluciones-del-consejo-normativo-de-contabilidad). El catálogo incluido es solo una selección de cuentas generales y no es el PCGE completo.

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

Incluye una selección navegable de cuentas de dos dígitos como referencia académica. Esta versión no es un sistema homologado por SUNAT ni genera PLE/SIRE; sus reportes son internos. La consulta de DNI/RUC usa un proveedor externo y requiere `APIPERU_TOKEN` en el servidor. Una implementación empresarial debe incorporar base de datos, autenticación, permisos, auditoría y exportaciones.
