// Sends a mail through the Resend HTTP API. Returns false when no mailer is
// configured so the caller can fall back to the server log.
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return false;

  try {
    const response = await fetch(
      process.env.RESEND_API_URL ?? "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM ??
            "NexusFlow <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      }
    );

    if (!response.ok) {
      console.error("Email delivery failed:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email delivery failed:", error);
    return false;
  }
}
