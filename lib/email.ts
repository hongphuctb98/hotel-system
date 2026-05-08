import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@hotel.com",
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[Email Error]", err);
    return { sent: false, error: String(err) };
  }
}
