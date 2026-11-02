// This public source export deliberately excludes the optional compiled emulator.
// See docs/hosted-artifacts.json and the project's separate runtime notices.
export function GET() {
  return new Response('/* Optional demonstration runtime is not included in this source export. See docs/hosted-artifacts.json. */', {
    status: 503,
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
  });
}
