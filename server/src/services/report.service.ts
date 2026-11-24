import ExcelJS from 'exceljs';
import { prisma } from '../db/client';

const CHILE_TZ = 'America/Santiago';
const COMPANY_NAME = 'Sistema de Gestión e Inventario';
const HEADER_ROW = 8;
const DATA_START_ROW = 9;

// Paleta corporativa
const COLORS = {
  primary: 'FF1E3A8A',      // Azul corporativo
  primaryDark: 'FF0F172A',  // Texto principal
  slateMid: 'FF475569',     // Subtítulos / metadatos
  kpiBg: 'FFF8FAFC',        // Fondo tarjetas KPI
  kpiBorder: 'FFCBD5E1',    // Borde tarjetas KPI
  zebra: 'FFF8FAFC',        // Filas pares
  borderLight: 'FFE2E8F0',  // Bordes internos de tabla
  totalBg: 'FFF1F5F9',      // Fila de totales
  totalBorderTop: 'FF94A3B8',
  totalBorderBottom: 'FF1E293B',
};

interface KpiBox {
  fromCol: string;
  toCol: string;
  label: string;
  formula?: string | undefined;
  value?: number | string | undefined;
  numFmt?: string | undefined;
}

function f(formula: string): ExcelJS.CellFormulaValue {
  return { formula, date1904: false };
}

function parseDateRange(from?: string, to?: string) {
  const now = new Date();
  const startDate = from
    ? new Date(`${from}T00:00:00.000-03:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = to
    ? new Date(`${to}T23:59:59.999-03:00`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

function formatDateChile(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTimeChile(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createWorkbook(generatedBy: string): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

function setupExecutiveHeader(
  sheet: ExcelJS.Worksheet,
  lastCol: string,
  title: string,
  periodLabel: string,
  generatedBy: string
) {
  // Fila 1: Título
  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  // Fila 2: Subtítulo / Empresa
  sheet.mergeCells(`A2:${lastCol}2`);
  const subCell = sheet.getCell('A2');
  subCell.value = COMPANY_NAME;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.slateMid } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 18;

  // Fila 3: Metadatos de trazabilidad
  sheet.mergeCells(`A3:${lastCol}3`);
  const metaCell = sheet.getCell('A3');
  metaCell.value = `Período: ${periodLabel}   |   Emitido el: ${formatDateTimeChile(new Date())} (CLT)   |   Emitido por: ${generatedBy}`;
  metaCell.font = { name: 'Calibri', size: 9.5, color: { argb: COLORS.primaryDark } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiBg } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  metaCell.border = {
    bottom: { style: 'thin', color: { argb: COLORS.kpiBorder } },
  };
  sheet.getRow(3).height = 20;

  // Filas espaciadoras
  sheet.getRow(4).height = 10;
  sheet.getRow(7).height = 10;
}

function setupKpiRow(sheet: ExcelJS.Worksheet, kpis: KpiBox[]) {
  sheet.getRow(5).height = 18;
  sheet.getRow(6).height = 26;

  for (const kpi of kpis) {
    if (kpi.fromCol !== kpi.toCol) {
      sheet.mergeCells(`${kpi.fromCol}5:${kpi.toCol}5`);
      sheet.mergeCells(`${kpi.fromCol}6:${kpi.toCol}6`);
    }

    const labelCell = sheet.getCell(`${kpi.fromCol}5`);
    labelCell.value = kpi.label;
    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.slateMid } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiBg } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    labelCell.border = {
      top: { style: 'thin', color: { argb: COLORS.kpiBorder } },
      left: { style: 'thin', color: { argb: COLORS.kpiBorder } },
      right: { style: 'thin', color: { argb: COLORS.kpiBorder } },
    };

    const valueCell = sheet.getCell(`${kpi.fromCol}6`);
    valueCell.value = kpi.formula ? f(kpi.formula) : (kpi.value ?? 0);
    valueCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLORS.primary } };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiBg } };
    valueCell.alignment = { vertical: 'middle', horizontal: 'center' };
    if (kpi.numFmt) valueCell.numFmt = kpi.numFmt;
    valueCell.border = {
      bottom: { style: 'medium', color: { argb: COLORS.primary } },
      left: { style: 'thin', color: { argb: COLORS.kpiBorder } },
      right: { style: 'thin', color: { argb: COLORS.kpiBorder } },
    };
  }
}

function writeTableHeaders(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.getRow(HEADER_ROW);
  row.values = headers;
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: COLORS.primaryDark } },
    };
  });
}

function styleDataRow(
  row: ExcelJS.Row,
  index: number,
  alignments: Array<'left' | 'center' | 'right'>
) {
  row.height = 20;
  const isEven = index % 2 === 1;

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.primaryDark } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: alignments[colNumber - 1] ?? 'left',
    };
    if (isEven) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
    }
    cell.border = {
      top: { style: 'hair', color: { argb: COLORS.borderLight } },
      bottom: { style: 'hair', color: { argb: COLORS.borderLight } },
      left: { style: 'hair', color: { argb: COLORS.borderLight } },
      right: { style: 'hair', color: { argb: COLORS.borderLight } },
    };
  });
}

function styleTotalRow(
  row: ExcelJS.Row,
  colCount: number,
  alignments: Array<'left' | 'center' | 'right'>
) {
  row.height = 23;
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: COLORS.primaryDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: alignments[col - 1] ?? 'left',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.totalBorderTop } },
      bottom: { style: 'double', color: { argb: COLORS.totalBorderBottom } },
    };
  }
}

async function finalizeSheet(
  sheet: ExcelJS.Worksheet,
  lastCol: string,
  lastDataRow: number
) {
  // AutoFiltro sobre encabezados y datos (excluye fila de totales inferior)
  const filterEndRow = Math.max(lastDataRow, HEADER_ROW);
  sheet.autoFilter = `A${HEADER_ROW}:${lastCol}${filterEndRow}`;

  // Paneles inmovilizados + ocultar líneas de cuadrícula
  sheet.views = [
    {
      state: 'frozen',
      ySplit: HEADER_ROW,
      showGridLines: false,
    },
  ];

  // Configuración de impresión / PDF
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  // Hoja protegida contra edición, manteniendo análisis (filtrar, ordenar, copiar)
  await sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: true,
    formatColumns: true,
    formatRows: false,
    insertRows: false,
    deleteRows: false,
  });
}

export class ReportService {
  // 1. Estado Diario de Stock
  static async generateDailyStockWorkbook(
    generatedBy = 'Administrador'
  ): Promise<ExcelJS.Workbook> {
    const stocks = await prisma.stock.findMany({
      where: {
        warehouse: { isActive: true },
        product: { status: { not: 'INACTIVO' } },
      },
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });

    const title = 'Estado Diario de Stock';
    const workbook = createWorkbook(generatedBy);
    const sheet = workbook.addWorksheet(title);

    sheet.columns = [
      { key: 'sku', width: 16 },
      { key: 'product', width: 32 },
      { key: 'brand', width: 18 },
      { key: 'warehouse', width: 22 },
      { key: 'unit', width: 12 },
      { key: 'quantity', width: 15 },
      { key: 'critical', width: 15 },
      { key: 'status', width: 14 },
      { key: 'price', width: 16 },
      { key: 'value', width: 18 },
    ];

    const alignments: Array<'left' | 'center' | 'right'> = [
      'center', 'left', 'left', 'left', 'center',
      'right', 'right', 'center', 'right', 'right',
    ];

    setupExecutiveHeader(
      sheet,
      'J',
      title,
      `Al ${formatDateChile(new Date())}`,
      generatedBy
    );

    const lastDataRow = stocks.length > 0 ? DATA_START_ROW + stocks.length - 1 : DATA_START_ROW;

    setupKpiRow(sheet, [
      {
        fromCol: 'A',
        toCol: 'B',
        label: 'ÍTEMS VISIBLES',
        formula: stocks.length > 0 ? `SUBTOTAL(3, A${DATA_START_ROW}:A${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0',
      },
      {
        fromCol: 'C',
        toCol: 'D',
        label: 'UNIDADES EN STOCK',
        formula: stocks.length > 0 ? `SUBTOTAL(9, F${DATA_START_ROW}:F${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0.##',
      },
      {
        fromCol: 'E',
        toCol: 'G',
        label: 'EN STOCK CRÍTICO',
        formula: stocks.length > 0 ? `COUNTIF(H${DATA_START_ROW}:H${lastDataRow}, "CRÍTICO")` : undefined,
        value: 0,
        numFmt: '#,##0',
      },
      {
        fromCol: 'H',
        toCol: 'J',
        label: 'VALORIZACIÓN TOTAL',
        formula: stocks.length > 0 ? `SUBTOTAL(9, J${DATA_START_ROW}:J${lastDataRow})` : undefined,
        value: 0,
        numFmt: '$#,##0',
      },
    ]);

    writeTableHeaders(sheet, [
      'SKU',
      'Producto',
      'Marca',
      'Bodega',
      'Unidad',
      'Stock Actual',
      'Stock Crítico',
      'Estado',
      'Precio Base',
      'Valorizado',
    ]);

    stocks.forEach((s, idx) => {
        const rowNum = DATA_START_ROW + idx;
        const qty = Number(s.quantity);
        const critical = Number(s.product.criticalStock);
        const price = Number(s.product.basePrice);
        const isCritical = qty <= critical;
  
        const row = sheet.getRow(rowNum);
        row.values = [
          s.product.sku,
          s.product.name,
          s.product.brand,
          s.warehouse.name,
          s.product.unitOfMeasure,
          qty,
          critical,
          isCritical ? 'CRÍTICO' : 'OK',
          price,
          f(`F${rowNum}*I${rowNum}`),
        ];
  
        styleDataRow(row, idx, alignments);
        row.getCell(6).numFmt = '#,##0.##';
        row.getCell(7).numFmt = '#,##0.##';
        row.getCell(9).numFmt = '$#,##0';
        row.getCell(10).numFmt = '$#,##0';
  
        // Estilo directo en columna Estado (H) en lugar de addConditionalFormatting
        const statusCell = row.getCell(8);
        statusCell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: isCritical ? 'FF991B1B' : 'FF166534' },
        };
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isCritical ? 'FFFEE2E2' : 'FFDCFCE7' },
        };
      });

      if (stocks.length > 0) {
        const totalRow = sheet.getRow(lastDataRow + 1);
        totalRow.values = [
          'TOTALES',
          '',
          '',
          '',
          '',
          f(`SUBTOTAL(9, F${DATA_START_ROW}:F${lastDataRow})`),
          '',
          '',
          f(`SUBTOTAL(1, I${DATA_START_ROW}:I${lastDataRow})`),
          f(`SUBTOTAL(9, J${DATA_START_ROW}:J${lastDataRow})`),
        ];
        styleTotalRow(totalRow, 10, alignments);
        totalRow.getCell(6).numFmt = '#,##0.##';
        totalRow.getCell(9).numFmt = '$#,##0';
        totalRow.getCell(10).numFmt = '$#,##0';
      }

    await finalizeSheet(sheet, 'J', lastDataRow);
    return workbook;
  }

  // 2. Consolidado de Ventas
  static async generateSalesConsolidatedWorkbook(
    from?: string,
    to?: string,
    generatedBy = 'Administrador'
  ): Promise<ExcelJS.Workbook> {
    const { startDate, endDate } = parseDateRange(from, to);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        taxStatus: { not: 'ANULADO' },
      },
      include: {
        seller: { select: { name: true, rut: true } },
        warehouse: { select: { name: true } },
        details: { select: { quantity: true, returnedQuantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const title = 'Consolidado de Ventas';
    const workbook = createWorkbook(generatedBy);
    const sheet = workbook.addWorksheet(title);

    sheet.columns = [
      { key: 'date', width: 22 },
      { key: 'warehouse', width: 24 },
      { key: 'seller', width: 28 },
      { key: 'units', width: 16 },
      { key: 'total', width: 20 },
    ];

    const alignments: Array<'left' | 'center' | 'right'> = [
      'center', 'left', 'left', 'right', 'right',
    ];

    setupExecutiveHeader(
      sheet,
      'E',
      title,
      `${formatDateChile(startDate)} al ${formatDateChile(endDate)}`,
      generatedBy
    );

    const lastDataRow = sales.length > 0 ? DATA_START_ROW + sales.length - 1 : DATA_START_ROW;

    setupKpiRow(sheet, [
      {
        fromCol: 'A',
        toCol: 'A',
        label: 'N° DE VENTAS',
        formula: sales.length > 0 ? `SUBTOTAL(3, A${DATA_START_ROW}:A${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0',
      },
      {
        fromCol: 'B',
        toCol: 'B',
        label: 'UNIDADES VENDIDAS',
        formula: sales.length > 0 ? `SUBTOTAL(9, D${DATA_START_ROW}:D${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0.###',
      },
      {
        fromCol: 'C',
        toCol: 'D',
        label: 'PROMEDIO POR VENTA',
        formula: sales.length > 0 ? `SUBTOTAL(1, E${DATA_START_ROW}:E${lastDataRow})` : undefined,
        value: 0,
        numFmt: '$#,##0',
      },
      {
        fromCol: 'E',
        toCol: 'E',
        label: 'TOTAL VENDIDO',
        formula: sales.length > 0 ? `SUBTOTAL(9, E${DATA_START_ROW}:E${lastDataRow})` : undefined,
        value: 0,
        numFmt: '$#,##0',
      },
    ]);

    writeTableHeaders(sheet, [
      'Fecha',
      'Bodega',
      'Vendedor',
      'Unidades',
      'Total',
    ]);

    sales.forEach((sale, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const total = Number(sale.total);
      const units = sale.details.reduce(
        (acc, d) => acc + (Number(d.quantity) - Number(d.returnedQuantity)),
        0
      );

      const row = sheet.getRow(rowNum);
      row.values = [
        formatDateTimeChile(sale.createdAt),
        sale.warehouse.name,
        sale.seller.name,
        Number(units.toFixed(3)),
        total,
      ];

      styleDataRow(row, idx, alignments);
      row.getCell(4).numFmt = '#,##0.###';
      row.getCell(5).numFmt = '$#,##0';
    });

    if (sales.length > 0) {
      const totalRow = sheet.getRow(lastDataRow + 1);
      totalRow.values = [
        'TOTALES',
        '',
        '',
        f(`SUBTOTAL(9, D${DATA_START_ROW}:D${lastDataRow})`),
        f(`SUBTOTAL(9, E${DATA_START_ROW}:E${lastDataRow})`),
      ];
      styleTotalRow(totalRow, 5, alignments);
      totalRow.getCell(4).numFmt = '#,##0.###';
      totalRow.getCell(5).numFmt = '$#,##0';
    }

    await finalizeSheet(sheet, 'E', lastDataRow);
    return workbook;
  }

  // 3. Desempeño por Vendedor (excluye ADMIN)
  static async generateSellerPerformanceWorkbook(
    from?: string,
    to?: string,
    generatedBy = 'Administrador'
  ): Promise<ExcelJS.Workbook> {
    const { startDate, endDate } = parseDateRange(from, to);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        taxStatus: { not: 'ANULADO' },
        seller: { role: { not: 'ADMIN' } },
      },
      include: {
        seller: { select: { id: true, rut: true, name: true, email: true } },
        details: { select: { quantity: true, returnedQuantity: true } },
      },
    });

    const sellerMap = new Map<
      string,
      {
        rut: string;
        name: string;
        email: string;
        transactions: number;
        units: number;
        totalSold: number;
      }
    >();

    for (const sale of sales) {
      const units = sale.details.reduce(
        (acc, d) => acc + (Number(d.quantity) - Number(d.returnedQuantity)),
        0
      );
      const prev = sellerMap.get(sale.sellerId) ?? {
        rut: sale.seller.rut,
        name: sale.seller.name,
        email: sale.seller.email,
        transactions: 0,
        units: 0,
        totalSold: 0,
      };
      prev.transactions += 1;
      prev.units += units;
      prev.totalSold += Number(sale.total);
      sellerMap.set(sale.sellerId, prev);
    }

    const sellers = Array.from(sellerMap.values()).sort(
      (a, b) => b.totalSold - a.totalSold
    );

    const title = 'Desempeño por Vendedor';
    const workbook = createWorkbook(generatedBy);
    const sheet = workbook.addWorksheet(title);

    sheet.columns = [
      { key: 'rut', width: 16 },
      { key: 'name', width: 26 },
      { key: 'email', width: 28 },
      { key: 'transactions', width: 16 },
      { key: 'units', width: 18 },
      { key: 'totalSold', width: 18 },
      { key: 'avgTicket', width: 18 },
    ];

    const alignments: Array<'left' | 'center' | 'right'> = [
      'center', 'left', 'left', 'right', 'right', 'right', 'right',
    ];

    setupExecutiveHeader(
      sheet,
      'G',
      title,
      `${formatDateChile(startDate)} al ${formatDateChile(endDate)}`,
      generatedBy
    );

    const lastDataRow = sellers.length > 0 ? DATA_START_ROW + sellers.length - 1 : DATA_START_ROW;

    setupKpiRow(sheet, [
      {
        fromCol: 'A',
        toCol: 'B',
        label: 'VENDEDORES ACTIVOS',
        formula: sellers.length > 0 ? `SUBTOTAL(3, A${DATA_START_ROW}:A${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0',
      },
      {
        fromCol: 'C',
        toCol: 'D',
        label: 'TOTAL TRANSACCIONES',
        formula: sellers.length > 0 ? `SUBTOTAL(9, D${DATA_START_ROW}:D${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0',
      },
      {
        fromCol: 'E',
        toCol: 'E',
        label: 'UNIDADES VENDIDAS',
        formula: sellers.length > 0 ? `SUBTOTAL(9, E${DATA_START_ROW}:E${lastDataRow})` : undefined,
        value: 0,
        numFmt: '#,##0.###',
      },
      {
        fromCol: 'F',
        toCol: 'G',
        label: 'TOTAL VENDIDO',
        formula: sellers.length > 0 ? `SUBTOTAL(9, F${DATA_START_ROW}:F${lastDataRow})` : undefined,
        value: 0,
        numFmt: '$#,##0',
      },
    ]);

    writeTableHeaders(sheet, [
      'RUT',
      'Vendedor',
      'Email',
      'Transacciones',
      'Unidades Vendidas',
      'Total Vendido',
      'Ticket Promedio',
    ]);

    sellers.forEach((s, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const row = sheet.getRow(rowNum);
      row.values = [
        s.rut,
        s.name,
        s.email,
        s.transactions,
        Number(s.units.toFixed(3)),
        Math.round(s.totalSold),
        f(`IF(D${rowNum}>0, F${rowNum}/D${rowNum}, 0)`),
      ];

      styleDataRow(row, idx, alignments);
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.###';
      row.getCell(6).numFmt = '$#,##0';
      row.getCell(7).numFmt = '$#,##0';
    });

    if (sellers.length > 0) {
      const totalRow = sheet.getRow(lastDataRow + 1);
      totalRow.values = [
        'TOTAL / PROM.',
        '',
        '',
        f(`SUBTOTAL(9, D${DATA_START_ROW}:D${lastDataRow})`),
        f(`SUBTOTAL(9, E${DATA_START_ROW}:E${lastDataRow})`),
        f(`SUBTOTAL(9, F${DATA_START_ROW}:F${lastDataRow})`),
        f(`SUBTOTAL(1, G${DATA_START_ROW}:G${lastDataRow})`),
      ];
      styleTotalRow(totalRow, 7, alignments);
      totalRow.getCell(4).numFmt = '#,##0';
      totalRow.getCell(5).numFmt = '#,##0.###';
      totalRow.getCell(6).numFmt = '$#,##0';
      totalRow.getCell(7).numFmt = '$#,##0';
    }

    await finalizeSheet(sheet, 'G', lastDataRow);
    return workbook;
  }
}