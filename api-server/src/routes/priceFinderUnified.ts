import { Router, type NextFunction, type Request, type Response } from "express";
import { runUnifiedProviderSearch, type ProviderCandidate } from "./providerSearch";

const router = Router();

function candidateToClinic(candidate: ProviderCandidate) {
  const query = [candidate.name, candidate.address].filter(Boolean).join(" ").trim();
  const fallbackSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent