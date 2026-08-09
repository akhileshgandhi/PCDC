"""Outbound email via SMTP (Gmail app password).

Configured through environment variables so credentials never live in code:

    SMTP_HOST       default smtp.gmail.com
    SMTP_PORT       default 587 (STARTTLS)
    SMTP_USER       the Gmail address that authenticates
    SMTP_PASSWORD   the Gmail *app password* (not the account password)
    SMTP_FROM       envelope/from address (defaults to SMTP_USER)
    SMTP_FROM_NAME  friendly display name (default "PCDC Case Studio")

send_email() never raises on transport failure — it returns False and logs a
warning so an invite request still succeeds even if mail delivery hiccups.
"""

import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

logger = logging.getLogger(__name__)


def email_configured() -> bool:
    return bool(
        os.getenv("RESEND_API_KEY")
        or (os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))
    )


def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Send a single email via the configured provider.

    Order: if RESEND_API_KEY is set, use Resend's HTTP API (works on Vercel /
    datacenter IPs where Gmail SMTP is often blocked). Otherwise fall back to
    Gmail SMTP. Returns True on success, False otherwise.
    """
    if os.getenv("RESEND_API_KEY"):
        return _send_via_resend(to, subject, text_body, html_body)
    return _send_via_smtp(to, subject, text_body, html_body)


def _send_via_resend(to: str, subject: str, text_body: str, html_body: str | None) -> bool:
    import requests

    api_key = os.getenv("RESEND_API_KEY")
    from_name = os.getenv("SMTP_FROM_NAME", "PCDC Case Studio")
    # Resend requires a verified domain; onboarding@resend.dev works out of the box for testing.
    from_addr = os.getenv("RESEND_FROM", os.getenv("SMTP_FROM", "onboarding@resend.dev"))
    payload = {
        "from": f"{from_name} <{from_addr}>",
        "to": [to],
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=int(os.getenv("SMTP_TIMEOUT_SECONDS", "20")),
        )
        if resp.status_code < 300:
            logger.info("Sent email to %s via Resend (subject=%s)", to, subject)
            return True
        logger.warning("Resend rejected email to %s: %s %s", to, resp.status_code, resp.text)
        return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to send email to %s via Resend: %s", to, exc)
        return False


def _send_via_smtp(to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("SMTP_FROM", user or "")
    from_name = os.getenv("SMTP_FROM_NAME", "PCDC Case Studio")

    if not user or not password:
        logger.warning("SMTP not configured (SMTP_USER/SMTP_PASSWORD missing); skipping email to %s", to)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((from_name, from_addr))
    message["To"] = to
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=int(os.getenv("SMTP_TIMEOUT_SECONDS", "20"))) as server:
            server.starttls(context=context)
            server.login(user, password)
            server.send_message(message)
        logger.info("Sent email to %s (subject=%s)", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001 - never let mail failure break the request
        logger.warning("Failed to send email to %s: %s", to, exc)
        return False


def app_base_url() -> str:
    return os.getenv("APP_BASE_URL", "https://pcdc-xi.vercel.app").rstrip("/")


def faculty_invite_email(name: str, email: str, setup_url: str) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for a PCDC faculty invite.

    setup_url is a one-time link that lets the invitee choose their own password.
    """
    subject = "Set your password — PCDC Case Studio faculty access"

    text_body = (
        f"Dear {name},\n\n"
        "Welcome to the Prestige Capability Development Centre (PCDC).\n\n"
        "You have been added as faculty on the PCDC Case Studio — the platform where "
        "you build AI-evaluated business case studies, onboard your sections, and track "
        "how your students think through them.\n\n"
        "To activate your account, set your password using the link below:\n"
        f"  {setup_url}\n\n"
        f"This link is for {email} and will expire in 72 hours.\n\n"
        "Once your password is set you can sign in with your email, or use "
        "\"Continue with Google\" with this same email address.\n\n"
        "Getting started as faculty:\n"
        "  1. Tell us what you teach (Institution -> Department -> Course -> Section).\n"
        "  2. Add your students and hand out their login slips.\n"
        "  3. Build or assign a case study and review the AI evaluations.\n\n"
        "If you did not expect this invitation, you can ignore this email.\n\n"
        "Prestige Capability Development Centre\n"
        "PCDC Case Studio"
    )

    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef1f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b2735;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,32,51,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#0b1d3a;padding:26px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="font-size:20px;font-weight:700;letter-spacing:2px;color:#ffffff;">PCDC</div>
                      <div style="font-size:12px;color:#c9a227;letter-spacing:0.5px;margin-top:2px;">PRESTIGE CAPABILITY DEVELOPMENT CENTRE</div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;background:rgba(201,162,39,0.15);color:#e8c766;font-size:11px;font-weight:600;letter-spacing:0.5px;padding:6px 12px;border-radius:999px;">CASE&nbsp;STUDIO</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Gold rule -->
            <tr><td style="height:3px;background:#c9a227;line-height:3px;font-size:0;">&nbsp;</td></tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:0.5px;color:#c9a227;text-transform:uppercase;">Faculty invitation</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b1d3a;">Welcome aboard, {name}.</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#42526b;">
                  You've been added as faculty on the <strong style="color:#0b1d3a;">PCDC Case Studio</strong> — where you
                  build AI-evaluated business case studies, onboard your sections, and see how your students reason through them.
                  Set your password to activate your account.
                </p>
              </td>
            </tr>
            <!-- CTA -->
            <tr>
              <td style="padding:0 32px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#0b1d3a;border-radius:8px;">
                      <a href="{setup_url}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Set your password &rarr;</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#8a97a8;">
                  This link is for <strong style="color:#42526b;">{email}</strong> and expires in 72 hours.
                  Once set, you can sign in with your email or use <strong style="color:#42526b;">Continue with Google</strong> with this address.
                </p>
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#98a2b3;word-break:break-all;">
                  Button not working? Copy this link into your browser:<br />{setup_url}
                </p>
              </td>
            </tr>
            <!-- Steps -->
            <tr>
              <td style="padding:24px 32px 8px;">
                <div style="border-top:1px solid #eef1f5;padding-top:20px;">
                  <div style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#8a97a8;text-transform:uppercase;margin-bottom:14px;">Get started in 3 steps</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#42526b;line-height:1.5;">
                    <tr>
                      <td style="width:28px;vertical-align:top;padding:0 0 12px;"><span style="display:inline-block;width:22px;height:22px;background:#0b1d3a;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;">1</span></td>
                      <td style="padding:0 0 12px;">Tell us what you teach — Institution &rarr; Department &rarr; Course &rarr; Section.</td>
                    </tr>
                    <tr>
                      <td style="width:28px;vertical-align:top;padding:0 0 12px;"><span style="display:inline-block;width:22px;height:22px;background:#0b1d3a;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;">2</span></td>
                      <td style="padding:0 0 12px;">Add your students and hand out their login slips.</td>
                    </tr>
                    <tr>
                      <td style="width:28px;vertical-align:top;"><span style="display:inline-block;width:22px;height:22px;background:#0b1d3a;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;">3</span></td>
                      <td>Build or assign a case study, then review the AI evaluations.</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:26px 32px;">
                <div style="border-top:1px solid #eef1f5;padding-top:18px;">
                  <p style="margin:0 0 4px;font-size:13px;color:#0b1d3a;font-weight:600;">Prestige Capability Development Centre</p>
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#98a2b3;">
                    You're receiving this because an administrator added you to PCDC Case Studio.
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""
    return subject, text_body, html_body


def make_temp_password() -> str:
    """Human-typable temporary password, e.g. 'Pcdc-7f3k9q2x'."""
    import secrets

    alphabet = "abcdefghijkmnpqrstuvwxyz23456789"  # no ambiguous chars
    return "Pcdc-" + "".join(secrets.choice(alphabet) for _ in range(8))
