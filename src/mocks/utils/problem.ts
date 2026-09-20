import { HttpResponse } from "msw";

export function problem(status: number, title: string, detail?: string): Response {
  return HttpResponse.json(
    {
      type: "about:blank",
      title,
      status,
      detail,
    },
    { status },
  );
}
