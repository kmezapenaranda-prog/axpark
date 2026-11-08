import type { CajaReport } from "@/lib/api";

export function isoToDisplay(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (dateStr.includes("/")) {
    const timePart = dateStr.split(" ")[1];
    if (!timePart) return "—";
    const [h, m] = timePart.split(":");
    return `${h}:${m}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export async function exportCajaPDF(report: CajaReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 18;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Cierre de Caja Diario", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const [yr, mo, dy] = report.fecha.split("-");
  doc.text(`Fecha: ${dy}/${mo}/${yr}`, margin, y);
  y += 10;

  // Summary box
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, 182, 28, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total recaudado:", margin + 4, y + 9);
  doc.setFontSize(16);
  doc.text(
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(report.totalCOP),
    margin + 4, y + 19
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Vehículos: ${report.totalVehiculos}   Visitantes: ${report.visitantes}   Mensualidades: ${report.mensualidades}`, margin + 90, y + 9);
  doc.setTextColor(0, 0, 0);
  y += 36;

  // Table header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 182, 7, "F");
  const cols = [2, 10, 34, 64, 92, 118, 150];
  const headers = ["#", "Placa", "Tipo", "Entrada", "Salida", "Duración", "Monto COP"];
  headers.forEach((h, i) => doc.text(h, margin + cols[i], y + 5));
  y += 9;

  doc.setFont("helvetica", "normal");
  report.cobros.forEach((c, idx) => {
    if (y > 270) { doc.addPage(); y = 18; }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 182, 6.5, "F");
    }
    const monto = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0 }).format(c.monto);
    const row = [
      String(idx + 1),
      c.placa,
      c.tipo,
      formatTime(c.horaEntrada),
      formatTime(c.horaSalida),
      c.duracion,
      `$${monto}`,
    ];
    row.forEach((cell, i) => doc.text(cell, margin + cols[i], y + 4.5));
    y += 6.5;
  });

  y += 10;
  // Signature line
  if (y > 250) { doc.addPage(); y = 18; }
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + 70, y);
  doc.setFontSize(8);
  doc.text("Firma operario", margin, y + 5);
  doc.line(120, y, 196, y);
  doc.text("Firma supervisor", 120, y + 5);

  doc.save(`cierre_caja_${report.fecha}.pdf`);
}
