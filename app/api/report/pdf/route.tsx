import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { reportRequestSchema } from "@/lib/validation";
import { periodFromString } from "@/lib/domain/periods";
import { getBoardReport, getFunderReport } from "@/lib/data/report";
import BoardReport from "@/components/reports/BoardReport";
import FunderReport from "@/components/reports/FunderReport";
import { logSecurityEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/report/pdf — validate, query, render and stream a PDF (ADD §5.2/§6.1).
// 200 PDF · 400 validation · 401 unauth · 403 wrong role · 422 no linked programs.
export async function POST(req: Request) {
  const auth = await requireApiRole(["ed", "fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, reportRequestSchema);
  if (body instanceof NextResponse) return body;

  const period = periodFromString(body.period);
  const edNotes = body.edNotes?.trim() ? body.edNotes.trim() : null;

  try {
    let buffer: Buffer;
    let filename: string;

    if (body.reportType === "board") {
      const data = await getBoardReport(period, edNotes);
      buffer = await renderToBuffer(<BoardReport data={data} />);
      filename = `board-report-${body.period}.pdf`;
    } else {
      const result = await getFunderReport(period, body.funderId!, edNotes);
      if ("error" in result) {
        if (result.error === "not_found") return businessError("Funder not found", 422);
        // no linked programs → block export and prompt to link (PRD Flow B).
        return businessError(
          "This funder has no linked programs, so a funder report cannot be generated.",
          422,
          "Link at least one program to this funder first.",
        );
      }
      buffer = await renderToBuffer(<FunderReport data={result} />);
      filename = `funder-report-${body.period}.pdf`;
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logSecurityEvent({
      event: "pdf_export_error",
      route: "/api/report/pdf",
      userId: auth.user.id,
      detail: err instanceof Error ? err.message : "render_failed",
    });
    return NextResponse.json(
      { error: "Failed to generate the report. Please try again." },
      { status: 500 },
    );
  }
}
