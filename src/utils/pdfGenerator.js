import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateInvoicePDF({ paymentId, userName, serviceName, amount, date, status }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  page.drawText('Comprobante de Pago', {
    x: 50,
    y: 350,
    size: 24,
    font: helveticaBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText(`ID Pago: ${paymentId}`, { x: 50, y: 310, size: 12, font: helveticaFont, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`Fecha: ${new Date(date).toLocaleDateString()}`, { x: 50, y: 290, size: 12, font: helveticaFont });
  
  page.drawText(`Cliente: ${userName}`, { x: 50, y: 240, size: 14, font: helveticaBold });
  page.drawText(`Servicio: ${serviceName}`, { x: 50, y: 220, size: 12, font: helveticaFont });
  
  page.drawText(`Monto Pagado: $${amount}`, { x: 50, y: 170, size: 16, font: helveticaBold, color: rgb(0.1, 0.6, 0.3) });
  page.drawText(`Estado: ${status.toUpperCase()}`, { x: 50, y: 150, size: 12, font: helveticaFont });
  
  page.drawText('SaaS Platform - Gracias por tu suscripción', { x: 50, y: 50, size: 10, font: helveticaFont, color: rgb(0.6, 0.6, 0.6) });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
