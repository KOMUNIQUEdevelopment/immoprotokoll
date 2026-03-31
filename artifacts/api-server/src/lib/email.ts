import { Resend } from "resend";
import { logger } from "./logger";

const FROM_ADDRESS = "ImmoProtokoll <noreply@immoprotokoll.com>";
const APP_URL = "https://immoprotokoll.com/app/";
const SUPPORT_EMAIL = "support@immoprotokoll.com";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn("RESEND_API_KEY not set — skipping email send");
    return null;
  }
  return new Resend(key);
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
  const resend = getResend();
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
