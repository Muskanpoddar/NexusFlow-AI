// The address the frontend is served from, used to build the links we send out.
export function frontendUrl(): string {
  return (
    process.env.FRONTEND_URL ?? "http://localhost:5173"
  ).replace(/\/$/, "");
}
