import { Router, type Request, type Response } from "express";
import { getSourceStatusReport, getSourceSummary } from "../lib/apiSourceRegistry";

const router = Router();

router.get("/source-status", async (req: Request, res: Response) => {
  try {
    const report = getSourceStatusReport();
    const summary = getSourceSummary();
    
    res.json({
      summary,
      sources: report,
    });
  } catch (e: any) {
    console.error("[SourceStatus Route] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;
