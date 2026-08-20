import { GET as getSourceActivationReadiness } from "../source-activation-readiness/route";

export async function GET(request: Request) {
  const response = await getSourceActivationReadiness(request);
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "Sun, 01 Nov 2026 00:00:00 GMT");
  response.headers.set("Link", '</api/integrations/pluggy/source-activation-readiness>; rel="successor-version"');
  return response;
}
