import { POST as postSourceActivation } from "../source-activation/route";

export async function POST(request: Request) {
  const response = await postSourceActivation(request);
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "Sun, 01 Nov 2026 00:00:00 GMT");
  response.headers.set("Link", '</api/integrations/pluggy/source-activation>; rel="successor-version"');
  return response;
}
