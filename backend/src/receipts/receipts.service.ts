import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-CO')} COP`;
}

function formatBogota(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}

const VEHICLE_TYPE_LABEL: Record<string, string> = { car: 'Carro', moto: 'Moto' };

export interface ParkingReceiptData {
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  folio: number;
  plate: string;
  vehicleType: string;
  vehicleBrand: string | null;
  entryTime: Date;
  exitTime: Date;
  durationLabel: string;
  amountPaid: number;
  coveredByMembership: boolean;
  issuedAt: Date;
}

export interface MembershipReceiptData {
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  folio: number;
  clientName: string;
  clientDocument: string;
  clientPhone: string | null;
  plate: string;
  vehicleType: string;
  vehicleBrand: string | null;
  startDate: string;
  endDate: string;
  price: number;
  autoRenew: boolean;
  company: string | null;
  paidAt: Date;
  issuedAt: Date;
}

// Ancho estándar de rollo térmico de 80mm, para que el PDF se vea como un
// desprendible real si se imprime en una impresora de tickets.
const PAGE_WIDTH = 226;
const MARGIN = 14;

@Injectable()
export class ReceiptsService {
  private renderToBuffer(
    height: number,
    draw: (doc: PDFKit.PDFDocument) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [PAGE_WIDTH, height], margin: MARGIN });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      draw(doc);
      doc.end();
    });
  }

  private divider(doc: PDFKit.PDFDocument) {
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8).text('- '.repeat(30).trim(), { align: 'center' });
    doc.moveDown(0.3);
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    tenantName: string,
    tenantPhone: string | null,
    tenantEmail: string | null,
    title: string,
    folio: number,
  ) {
    doc.font('Helvetica-Bold').fontSize(13).text(tenantName, { align: 'center' });
    doc.font('Helvetica').fontSize(8);
    if (tenantPhone) doc.text(`Tel: ${tenantPhone}`, { align: 'center' });
    if (tenantEmail) doc.text(tenantEmail, { align: 'center' });
    this.divider(doc);
    doc.font('Helvetica-Bold').fontSize(10).text(title, { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(`Recibo No. ${String(folio).padStart(6, '0')}`, { align: 'center' });
    this.divider(doc);
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.font('Helvetica-Bold').fontSize(8).text(label);
    doc.font('Helvetica').fontSize(9).text(value);
    doc.moveDown(0.25);
  }

  private footer(doc: PDFKit.PDFDocument, issuedAt: Date, message: string) {
    this.divider(doc);
    doc.font('Helvetica').fontSize(7).text(`Emitido: ${formatBogota(issuedAt)}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').fontSize(8).text(message, { align: 'center' });
  }

  buildParkingExitReceipt(data: ParkingReceiptData): Promise<Buffer> {
    return this.renderToBuffer(350, (doc) => {
      this.drawHeader(doc, data.tenantName, data.tenantPhone, data.tenantEmail, 'COMPROBANTE DE SALIDA', data.folio);
      this.row(doc, 'PLACA', data.plate);
      this.row(
        doc,
        'TIPO DE VEHÍCULO',
        `${VEHICLE_TYPE_LABEL[data.vehicleType] ?? data.vehicleType}${data.vehicleBrand ? ' - ' + data.vehicleBrand : ''}`,
      );
      this.row(doc, 'HORA DE ENTRADA', formatBogota(data.entryTime));
      this.row(doc, 'HORA DE SALIDA', formatBogota(data.exitTime));
      this.row(doc, 'TIEMPO TOTAL', data.durationLabel);
      this.row(doc, 'TIPO DE COBRO', data.coveredByMembership ? 'Mensualidad activa' : 'Tarifa por tiempo');
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).text('TOTAL PAGADO');
      doc.font('Helvetica-Bold').fontSize(13).text(formatCOP(data.amountPaid));
      this.footer(doc, data.issuedAt, 'Gracias por su visita');
    });
  }

  buildMembershipReceipt(data: MembershipReceiptData): Promise<Buffer> {
    return this.renderToBuffer(380, (doc) => {
      this.drawHeader(
        doc,
        data.tenantName,
        data.tenantPhone,
        data.tenantEmail,
        'RECIBO DE PAGO - MENSUALIDAD',
        data.folio,
      );
      this.row(doc, 'CLIENTE', data.clientName);
      this.row(doc, 'DOCUMENTO', data.clientDocument);
      if (data.clientPhone) this.row(doc, 'TELÉFONO', data.clientPhone);
      this.row(doc, 'PLACA', data.plate);
      this.row(
        doc,
        'TIPO DE VEHÍCULO',
        `${VEHICLE_TYPE_LABEL[data.vehicleType] ?? data.vehicleType}${data.vehicleBrand ? ' - ' + data.vehicleBrand : ''}`,
      );
      if (data.company) this.row(doc, 'EMPRESA', data.company);
      this.row(doc, 'PERIODO CUBIERTO', `${data.startDate}  a  ${data.endDate}`);
      this.row(doc, 'RENOVACIÓN AUTOMÁTICA', data.autoRenew ? 'Sí' : 'No');
      this.row(doc, 'FECHA DE PAGO', formatBogota(data.paidAt));
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).text('VALOR PAGADO');
      doc.font('Helvetica-Bold').fontSize(13).text(formatCOP(data.price));
      this.footer(doc, data.issuedAt, 'Gracias por su pago');
    });
  }
}
