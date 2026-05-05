import { Resend } from "resend";
import { logger } from "./logger";

const FROM_ADDRESS = "ImmoProtokoll <noreply@immoprotokoll.com>";
const APP_URL = process.env.APP_APP_URL ?? "https://app.immoprotokoll.com";
const SUPPORT_EMAIL = "support@immoprotokoll.com";

// Replit Resend connector — fetches a fresh API key each time (tokens can expire)
async function getResend(): Promise<Resend | null> {
  // Fallback: direct API key via env var (for local dev / self-hosted)
  const directKey = process.env.RESEND_API_KEY;
  if (directKey) return new Resend(directKey);

  // Replit connector path
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    logger.warn("Resend not configured — skipping email send");
    return null;
  }

  try {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
    );
    const data = await resp.json() as { items?: Array<{ settings?: { api_key?: string } }> };
    const apiKey = data.items?.[0]?.settings?.api_key;
    if (!apiKey) {
      logger.warn("Resend connector found but api_key missing — skipping email send");
      return null;
    }
    return new Resend(apiKey);
  } catch (err) {
    logger.error({ err }, "Failed to fetch Resend connector credentials");
    return null;
  }
}

// ── Base HTML shell ────────────────────────────────────────────────────────────

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ImmoProtokoll</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td style="padding:0 0 24px 0;" align="left">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#000;border-radius:8px;padding:8px 14px;">
                    <span style="color:#fff;font-size:14px;font-weight:600;letter-spacing:-0.3px;">ImmoProtokoll</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px;border:1px solid #e5e5e5;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                ImmoProtokoll · KOMUNIQUE by Philipp Roth · Blumenrainstrasse 29 · 9050 Appenzell<br />
                Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#666;text-decoration:underline;">${SUPPORT_EMAIL}</a><br />
                <a href="${APP_URL}" style="color:#666;text-decoration:underline;">immoprotokoll.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#000;letter-spacing:-0.5px;">${text}</h1>`;
}

function body(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;color:#444;line-height:1.6;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;">
    <tr>
      <td style="background:#000;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />`;
}

function detail(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#999;width:140px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111;font-weight:500;">${value}</td>
  </tr>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = await getResend();
  if (!resend) return;
  try {
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) {
      logger.error({ error, to, subject }, "Resend returned an error");
    } else {
      logger.info({ to, subject }, "Email sent");
    }
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

/** Sent when a new account owner registers */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  accountName: string,
): Promise<void> {
  const name = firstName || email;
  const html = emailShell(`
    ${heading("Welcome to ImmoProtokoll")}
    ${body(`Hi ${name},`)}
    ${body(`Your account <strong>${accountName}</strong> has been created. You can now create properties, manage handover protocols, and share them with tenants — all in one place.`)}
    ${button("Open ImmoProtokoll", APP_URL)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, "Welcome to ImmoProtokoll", html);
}

/** Sent when an owner/admin invites a new team member */
export async function sendTeamInviteEmail(
  email: string,
  firstName: string,
  accountName: string,
  inviterName: string,
  temporaryPassword: string,
): Promise<void> {
  const name = firstName || "there";
  const html = emailShell(`
    ${heading("You've been invited to ImmoProtokoll")}
    ${body(`Hi ${name},`)}
    ${body(`<strong>${inviterName}</strong> has invited you to join <strong>${accountName}</strong> on ImmoProtokoll. Your account is ready — use the credentials below to sign in.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      ${detail("Email", email)}
      ${detail("Temporary password", temporaryPassword)}
    </table>
    ${button("Sign In Now", APP_URL)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">We recommend changing your password after your first sign-in. Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, `You've been invited to ${accountName} on ImmoProtokoll`, html);
}

/** Sent when a user requests a password reset */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string,
): Promise<void> {
  const name = firstName || "there";
  const html = emailShell(`
    ${heading("Reset your password")}
    ${body(`Hi ${name},`)}
    ${body("We received a request to reset your ImmoProtokoll password. Click the button below to choose a new password. The link is valid for <strong>60 minutes</strong>.")}
    ${button("Reset Password", resetUrl)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">If you didn't request this, you can safely ignore this email — your password won't change.</span>`)}
  `);
  await send(email, "Reset your ImmoProtokoll password", html);
}

/** Sent when a subscription becomes active (new or reactivated) */
export async function sendSubscriptionActiveEmail(
  email: string,
  firstName: string,
  plan: string,
  interval: string,
  nextBillingDate: string,
): Promise<void> {
  const name = firstName || "there";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const intervalLabel = interval === "annual" ? "Annual" : "Monthly";
  const html = emailShell(`
    ${heading("Your subscription is active")}
    ${body(`Hi ${name},`)}
    ${body("Thank you — your subscription is now active. Here's a summary:")}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      ${detail("Plan", planLabel)}
      ${detail("Billing", intervalLabel)}
      ${detail("Next renewal", nextBillingDate)}
    </table>
    ${button("Go to ImmoProtokoll", APP_URL)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">You can manage your subscription at any time from within the app. Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, `Your ImmoProtokoll ${planLabel} plan is active`, html);
}

/** Sent when a subscription is cancelled */
export async function sendSubscriptionCanceledEmail(
  email: string,
  firstName: string,
  plan: string,
): Promise<void> {
  const name = firstName || "there";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const html = emailShell(`
    ${heading("Your subscription has ended")}
    ${body(`Hi ${name},`)}
    ${body(`Your <strong>${planLabel}</strong> subscription has been cancelled and your account has been moved to the Free plan. Your existing data is safe — you can still access ImmoProtokoll with the Free plan's features.`)}
    ${button("Open ImmoProtokoll", APP_URL)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">Changed your mind? You can reactivate your subscription at any time from within the app. Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, "Your ImmoProtokoll subscription has ended", html);
}

/** Sent when a payment fails */
export async function sendPaymentFailedEmail(
  email: string,
  firstName: string,
): Promise<void> {
  const name = firstName || "there";
  const html = emailShell(`
    ${heading("Action required: payment failed")}
    ${body(`Hi ${name},`)}
    ${body("We were unable to process your most recent ImmoProtokoll payment. Please update your payment method to avoid any interruption to your service.")}
    ${button("Update Payment Method", `${APP_URL}#billing`)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">If you believe this is a mistake or need help, please contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, "Action required: your ImmoProtokoll payment failed", html);
}

// ── Multilingual protocol email helpers ────────────────────────────────────────

type Lang = "de-CH" | "de-DE" | "en" | string;

function isDE(lang: Lang): boolean {
  return lang === "de-CH" || lang === "de-DE";
}

/** Sent to account users when ALL parties have signed a protocol */
export async function sendProtocolSignedEmail(opts: {
  to: string;
  propertyName: string;
  protocolName: string;
  signatoryNames: string[];
  lang: Lang;
}): Promise<void> {
  const { to, propertyName, protocolName, signatoryNames, lang } = opts;
  const de = isDE(lang);

  const subject = de
    ? `Protokoll vollständig unterzeichnet – ${protocolName}`
    : `Handover protocol fully signed – ${protocolName}`;

  const headingText = de ? "Alle Unterschriften liegen vor" : "All signatures collected";

  const introText = de
    ? `Das Übergabeprotokoll <strong>${protocolName}</strong>${propertyName ? ` für <strong>${propertyName}</strong>` : ""} wurde von allen Beteiligten unterzeichnet.`
    : `The handover protocol <strong>${protocolName}</strong>${propertyName ? ` for <strong>${propertyName}</strong>` : ""} has been signed by all parties.`;

  const sigLabel = de ? "Unterzeichnet von" : "Signed by";
  const btnLabel = de ? "ImmoProtokoll öffnen" : "Open ImmoProtokoll";

  const sigList = signatoryNames.length > 0
    ? `<div style="margin:16px 0;padding:16px;background:#f9f9f9;border-radius:8px;">
        <p style="margin:0 0 8px 0;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${sigLabel}</p>
        <ul style="margin:0;padding-left:18px;">
          ${signatoryNames.map(n => `<li style="font-size:14px;color:#111;line-height:1.8;">${n}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const html = emailShell(`
    ${heading(headingText)}
    ${body(introText)}
    ${sigList}
    ${button(btnLabel, APP_URL)}
  `);

  await send(to, subject, html);
}

/** Sent to tenants inviting them to review and sign a protocol */
export async function sendTenantInviteEmail(opts: {
  to: string;
  protocolName: string;
  propertyName: string;
  shareUrl: string;
  senderAccountName: string;
  lang: Lang;
}): Promise<void> {
  const { to, protocolName, propertyName, shareUrl, senderAccountName, lang } = opts;
  const de = isDE(lang);

  const subject = de
    ? `Bitte Übergabeprotokoll prüfen und unterschreiben`
    : `Please review and sign the handover protocol`;

  const headingText = de ? "Einladung zur Unterzeichnung" : "You're invited to sign";

  const senderLine = de
    ? `<strong>${senderAccountName}</strong> lädt Sie ein, das Übergabeprotokoll${propertyName ? ` für <strong>${propertyName}</strong>` : ""}${protocolName ? ` (<em>${protocolName}</em>)` : ""} zu prüfen und digital zu unterzeichnen.`
    : `<strong>${senderAccountName}</strong> has invited you to review and sign the handover protocol${propertyName ? ` for <strong>${propertyName}</strong>` : ""}${protocolName ? ` (<em>${protocolName}</em>)` : ""}.`;

  const noteText = de
    ? "Sie können das Protokoll einsehen und Ihre Unterschrift direkt im Browser leisten – ohne Konto oder App."
    : "You can review the protocol and sign it directly in your browser — no account or app required.";

  const btnLabel = de ? "Protokoll öffnen und unterschreiben" : "Open & sign protocol";

  const html = emailShell(`
    ${heading(headingText)}
    ${body(senderLine)}
    ${body(noteText)}
    ${button(btnLabel, shareUrl)}
    ${divider()}
    ${body(`<span style="font-size:12px;color:#aaa;">Wenn dieser Link nicht funktioniert, kopieren Sie ihn in Ihren Browser:<br/><span style="color:#666;">${shareUrl}</span></span>`)}
  `);

  await send(to, subject, html);
}

/** Sent to support@immoprotokoll.com when a new ticket is submitted */
export async function sendSupportTicketEmail(opts: {
  ticketId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  accountId?: string;
}): Promise<void> {
  const { ticketId, name, email, subject, message, accountId } = opts;
  const html = emailShell(`
    ${heading("New Support Request")}
    ${body(`A new support ticket has been submitted.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      ${detail("Ticket ID", ticketId.slice(0, 8).toUpperCase())}
      ${detail("Name", name)}
      ${detail("Email", `<a href="mailto:${email}" style="color:#444;">${email}</a>`)}
      ${detail("Subject", subject)}
      ${accountId ? detail("Account ID", accountId) : ""}
    </table>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
      <p style="margin:0;font-size:14px;color:#111;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </div>
    ${button("Reply to sender", `mailto:${email}?subject=Re: ${encodeURIComponent(subject)} [#${ticketId.slice(0, 8).toUpperCase()}]`)}
  `);
  await send(SUPPORT_EMAIL, `[Support] ${subject} — ${name}`, html);
}

/** Sent to a support agent when a ticket is assigned to them */
export async function sendSupportTicketAssignedEmail(opts: {
  agentName: string;
  agentEmail: string;
  ticketId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { agentName, agentEmail, ticketId, senderName, senderEmail, subject, message } = opts;
  const html = emailShell(`
    ${heading("Support ticket assigned to you")}
    ${body(`Hi ${agentName},`)}
    ${body(`A support ticket has been assigned to you. Please follow up with the customer as soon as possible.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      ${detail("Ticket ID", ticketId.slice(0, 8).toUpperCase())}
      ${detail("From", `${senderName} &lt;<a href="mailto:${senderEmail}" style="color:#444;">${senderEmail}</a>&gt;`)}
      ${detail("Subject", subject)}
    </table>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
      <p style="margin:0;font-size:14px;color:#111;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </div>
    ${button("Reply to customer", `mailto:${senderEmail}?subject=Re: ${encodeURIComponent(subject)} [#${ticketId.slice(0, 8).toUpperCase()}]`)}
  `);
  await send(agentEmail, `[Support assigned] ${subject}`, html);
}

/** Sent during login when MFA is enabled — contains the 6-digit verification code */
export async function sendMfaCodeEmail(
  email: string,
  firstName: string,
  code: string,
): Promise<void> {
  const name = firstName || "there";
  const html = emailShell(`
    ${heading("Ihr Anmeldecode")}
    ${body(`Guten Tag ${name},`)}
    ${body("Geben Sie den folgenden Code ein, um sich bei ImmoProtokoll anzumelden:")}
    <div style="margin:28px 0;text-align:center;">
      <div style="display:inline-block;background:#f5f5f5;border-radius:12px;padding:20px 40px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:16px;color:#000;font-variant-numeric:tabular-nums;">${code}</span>
      </div>
    </div>
    ${body("Der Code ist <strong>10 Minuten</strong> gültig und kann nur einmal verwendet werden.")}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">Falls Sie sich nicht einloggen wollten, können Sie diese E-Mail ignorieren — Ihr Konto bleibt sicher.</span>`)}
  `);
  await send(email, "Ihr ImmoProtokoll Anmeldecode", html);
}

/** Sent when an invoice payment succeeds — contains amount, invoice number and PDF link */
export async function sendInvoiceEmail(
  email: string,
  firstName: string,
  amountCents: number,
  currency: string,
  invoiceNumber: string,
  invoiceUrl: string,
  periodLabel: string,
  planLabel: string,
): Promise<void> {
  const name = firstName || "there";
  const cur = currency.toUpperCase();
  const amountFormatted = new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);

  const html = emailShell(`
    ${heading("Ihre Rechnung von ImmoProtokoll")}
    ${body(`Guten Tag ${name},`)}
    ${body("Vielen Dank für Ihr Vertrauen. Anbei finden Sie die Rechnung für Ihr Abonnement:")}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      ${detail("Rechnungsnummer", invoiceNumber)}
      ${detail("Plan", planLabel)}
      ${detail("Periode", periodLabel)}
      ${detail("Betrag (inkl. MwSt.)", `<strong style="color:#000;">${amountFormatted}</strong>`)}
    </table>
    ${button("Rechnung öffnen / herunterladen", invoiceUrl)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">
      Diese E-Mail dient als Zahlungsbestätigung. Die detaillierte Rechnung können Sie über den obenstehenden Link öffnen oder als PDF herunterladen.<br/><br/>
      Fragen zur Rechnung? <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>
    </span>`)}
  `);
  await send(email, `Ihre Rechnung ${invoiceNumber} – ${amountFormatted}`, html);
}

/** Sent when a plan is changed (upgrade or downgrade) */
export async function sendPlanChangedEmail(
  email: string,
  firstName: string,
  oldPlan: string,
  newPlan: string,
): Promise<void> {
  const name = firstName || "there";
  const oldLabel = oldPlan.charAt(0).toUpperCase() + oldPlan.slice(1);
  const newLabel = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);
  const html = emailShell(`
    ${heading("Your plan has been updated")}
    ${body(`Hi ${name},`)}
    ${body(`Your ImmoProtokoll plan has been changed from <strong>${oldLabel}</strong> to <strong>${newLabel}</strong>.`)}
    ${button("Go to ImmoProtokoll", APP_URL)}
    ${divider()}
    ${body(`<span style="font-size:13px;color:#888;">Questions about your plan? <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;">${SUPPORT_EMAIL}</a>.</span>`)}
  `);
  await send(email, `Your ImmoProtokoll plan has changed to ${newLabel}`, html);
}
