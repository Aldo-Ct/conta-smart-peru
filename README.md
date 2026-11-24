# CONTA SMART PERÚ

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

- Cargue **Datos de demostración** desde el menú lateral para crear productos, una compra y una venta contabilizadas.
- En registros de compras y ventas, el switch **IGV incluido / sin IGV incluido** recalcula base, IGV y total al instante.
- Cada operación confirmada crea asientos balanceados; ventas y compras al contado crean su cobranza/pago adicional. Las ventas de mercadería validan stock y crean costo de ventas.
- El Libro Diario y el Balance de comprobación se generan desde los asientos. Los datos se guardan en `localStorage` del navegador, por lo que sobreviven al reinicio del servidor en el mismo equipo/navegador.
- El botón de exportación del balance genera un CSV compatible con Excel.

## Arquitectura

La interfaz está implementada en `app/page.tsx`; el modelo de documentos, productos y asientos se mantiene en un único estado persistente. El motor `entryFromDoc` traduce compras y ventas a partidas dobles. `calc` aplica redondeo monetario a dos decimales para el IGV.

## PCGE y limitaciones

Incluye una base navegable de cuentas de dos dígitos del PCGE como referencia académica (versión modificada 2019). Para presentación universitaria, se pueden crear cuentas analíticas adicionales en una siguiente fase. Esta versión no es un sistema homologado por SUNAT ni genera PLE/SIRE; sus comprobantes y reportes son internos. La persistencia local permite una demostración sin servicios externos; una implementación empresarial debe migrar estos modelos a Prisma/SQLite, añadir autenticación, permisos, auditoría y exportaciones XLSX/PDF certificadas.
