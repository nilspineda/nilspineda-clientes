import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "../lib/supabaseClient";
import { formatDate } from "./dateUtils";
import { formatCurrency } from "./formatUtils";

export async function generateInvoicePDF(payment, user, service) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  page.drawText("FACTURA", {
    x: 50,
    y: height - 60,
    size: 24,
    font: fontBold,
    color: rgb(0, 0.53, 0.71),
  });

  page.drawText(`ID: ${payment.id.slice(0, 8)}`, {
    x: 50,
    y: height - 85,
    size: 10,
    font: font,
  });

  page.drawText("Datos del Cliente:", {
    x: 50,
    y: height - 120,
    size: 12,
    font: fontBold,
  });

  page.drawText(`Nombre: ${user?.name || "N/A"}`, {
    x: 50,
    y: height - 140,
    size: 11,
    font: font,
  });

  page.drawText(`Email: ${user?.email || "N/A"}`, {
    x: 50,
    y: height - 155,
    size: 11,
    font: font,
  });

  page.drawText("Detalles del Servicio:", {
    x: 50,
    y: height - 190,
    size: 12,
    font: fontBold,
  });

  page.drawText(`Servicio: ${service?.name || "N/A"}`, {
    x: 50,
    y: height - 210,
    size: 11,
    font: font,
  });

  page.drawText(`Monto: ${formatCurrency(payment.amount)}`, {
    x: 50,
    y: height - 225,
    size: 11,
    font: font,
  });

  page.drawText(`Fecha de pago: ${formatDate(payment.payment_date)}`, {
    x: 50,
    y: height - 240,
    size: 11,
    font: font,
  });

  page.drawText(`Estado: ${payment.status}`, {
    x: 50,
    y: height - 255,
    size: 11,
    font: font,
  });

  page.drawText(`Metodo: ${payment.payment_method || "No especificado"}`, {
    x: 50,
    y: height - 270,
    size: 11,
    font: font,
  });

  page.drawText("------------------------------------------------", {
    x: 50,
    y: height - 300,
    size: 10,
    font: font,
  });

  page.drawText("Gracias por su preferencia!", {
    x: 50,
    y: height - 320,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  return blob;
}

export async function uploadInvoicePDF(paymentId, blob) {
  const fileName = `invoice_${paymentId}.pdf`;
  const arrayBuffer = await blob.arrayBuffer();

  const { data, error } = await supabase.storage
    .from("invoices")
    .upload(fileName, arrayBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("invoices")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
