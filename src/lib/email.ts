import nodemailer, { type Transporter } from "nodemailer";

const NAVY = "#1F3260";
const NAVY_DARK = "#142048";
const TEAL = "#5DB9BC";
const TEAL_LIGHT = "#7DCED1";
const TEAL_FAINT = "#E2F4F5";
const BG = "#f5f5f5";
const CARD = "#ffffff";
const TEXT = "#333333";
const MUTED = "#666666";
const BORDER = "#e0e0e0";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email transport not configured: GMAIL_USER and GMAIL_APP_PASSWORD must be set.",
    );
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

function fromAddress(): string {
  return `JPC Space <${process.env.GMAIL_USER}>`;
}

function renderShell(title: string, subtitle: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${BG}; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: ${CARD}; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background-color: ${NAVY}; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 5px 0;">${title}</h1>
        <p style="color: ${TEAL_LIGHT}; font-size: 14px; margin: 0;">${subtitle}</p>
      </div>
      <div style="padding: 40px 30px;">
        ${bodyHtml}
      </div>
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid ${BORDER};">
        <p style="font-size: 12px; color: #999999; margin: 0;">
          &copy; ${new Date().getFullYear()} Jesus Project Community &mdash; JPC Space
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${href}" style="display: inline-block; background-color: ${TEAL}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; letter-spacing: 0.3px;">${label}</a>
    </div>
    <p style="font-size: 13px; color: ${MUTED}; line-height: 1.6; margin: 0 0 20px 0; text-align: center; word-break: break-all;">
      Or paste this link into your browser:<br>
      <a href="${href}" style="color: ${NAVY};">${href}</a>
    </p>`;
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
): Promise<void> {
  const body = `
    <p style="font-size: 16px; color: ${TEXT}; line-height: 1.6; margin: 0 0 20px 0;">
      We received a request to reset the password for your JPC Space account. Click the button below to choose a new password.
    </p>
    ${buttonHtml(resetLink, "Reset Password")}
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="font-size: 14px; color: #856404; margin: 0;">
        <strong>&#9201; Important:</strong> This link will expire in 1 hour.
      </p>
    </div>
    <div style="background-color: ${TEAL_FAINT}; border-left: 4px solid ${TEAL}; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="font-size: 14px; color: ${NAVY_DARK}; margin: 0 0 8px 0; font-weight: bold;">Security Tip</p>
      <p style="font-size: 13px; color: ${NAVY}; margin: 0; line-height: 1.5;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "JPC Space — Password Reset",
    html: renderShell("Password Reset Request", "Jesus Project Community", body),
  });
}

export async function sendInviteEmail(
  email: string,
  inviteLink: string,
  invitedByName?: string,
): Promise<void> {
  const inviter = invitedByName ? `<strong>${invitedByName}</strong> has invited you` : "You've been invited";
  const body = `
    <p style="font-size: 16px; color: ${TEXT}; line-height: 1.6; margin: 0 0 20px 0;">
      ${inviter} to join <strong>JPC Space</strong>, the Jesus Project Community portal. Click the button below to set your password and activate your account.
    </p>
    ${buttonHtml(inviteLink, "Accept Invitation")}
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="font-size: 14px; color: #856404; margin: 0;">
        <strong>&#9201; Note:</strong> This invitation will expire soon &mdash; activate your account as soon as you can.
      </p>
    </div>
    <p style="font-size: 14px; color: ${MUTED}; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
      If you weren't expecting this invitation, you can ignore this email.
    </p>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "JPC Space — You're Invited",
    html: renderShell("Welcome to JPC Space", "Jesus Project Community", body),
  });
}

export async function sendNotificationEmail(
  email: string,
  title: string,
  body: string | null,
  link: string | null,
): Promise<void> {
  const appUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  const viewLink = appUrl ? `${appUrl}${link ?? ""}` : null;

  const bodyHtml = `
    <p style="font-size: 16px; color: ${TEXT}; line-height: 1.6; margin: 0 0 24px 0;">
      ${body ?? "You have a new notification in JPC Space."}
    </p>
    ${viewLink ? buttonHtml(viewLink, "View in JPC Space") : ""}
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: `JPC Space — ${title}`,
    html: renderShell(title, "Jesus Project Community", bodyHtml),
  });
}
