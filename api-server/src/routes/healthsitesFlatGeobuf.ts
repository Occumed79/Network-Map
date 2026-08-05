import { createHash, createHmac } from "node:crypto";
import { once } from "node:events";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const DEFAULT_BUCKET = "healthsites-data";
const DEFAULT_OBJECT_KEY = "flatgeobuf/healthsites.fgb";
const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function objectRequestUrl(endpoint: string, bucket: string, objectKey: string): URL {
  const base = endpoint.replace(/\/+$/, "");
  const encodedBucket = encodePathSegment(bucket);
  const encodedKey = objectKey
    .split("/")
    .filter(Boolean)
    .map(encodePathSegment)
    .join("/");
  return new URL(`${base}/${encodedBucket}/${encodedKey}`);
}

function signedHeaders(method: "GET" | "HEAD", requestUrl: URL): Headers {
  const accessKeyId = requireEnvironment("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnvironment("R2_SECRET_ACCESS_KEY");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalHeaders = [
    `host:${requestUrl.host}`,
    `x-amz-content-sha256:${EMPTY_SHA256}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const signedHeaderNames = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    requestUrl.pathname,
    requestUrl.searchParams.toString(),
    canonicalHeaders,
    signedHeaderNames,
    EMPTY_SHA256,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return new Headers({
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
    "x-amz-content-sha256": EMPTY_SHA256,
    "x-amz-date": amzDate,
  });
}

function copyRequestHeader(req: Request, headers: Headers, name: string): void {
  const value = req.header(name);
  if (value) headers.set(name, value);
}

function copyResponseHeader(upstream: globalThis.Response, res: Response, name: string): void {
  const value = upstream.headers.get(name);
  if (value) res.setHeader(name, value);
}

async function streamBody(upstream: globalThis.Response, req: Request, res: Response): Promise<void> {
  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  let disconnected = false;
  req.once("close", () => {
    disconnected = true;
    void reader.cancel().catch(() => undefined);
  });

  try {
    while (!disconnected) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await once(res, "drain");
    }
  } finally {
    reader.releaseLock();
  }

  if (!disconnected) res.end();
}

async function proxyFlatGeobuf(req: Request, res: Response): Promise<void> {
  try {
    const endpoint = requireEnvironment("R2_ENDPOINT");
    const bucket = process.env.R2_HEALTHSITES_BUCKET?.trim() || DEFAULT_BUCKET;
    const objectKey = process.env.R2_HEALTHSITES_OBJECT_KEY?.trim() || DEFAULT_OBJECT_KEY;
    const method = req.method === "HEAD" ? "HEAD" : "GET";
    const requestUrl = objectRequestUrl(endpoint, bucket, objectKey);
    const headers = signedHeaders(method, requestUrl);

    copyRequestHeader(req, headers, "Range");
    copyRequestHeader(req, headers, "If-Range");
    copyRequestHeader(req, headers, "If-None-Match");
    copyRequestHeader(req, headers, "If-Modified-Since");

    const upstream = await fetch(requestUrl, {
      method,
      headers,
      redirect: "error",
    });

    if (!upstream.ok && upstream.status !== 304) {
      req.log?.error(
        { status: upstream.status, statusText: upstream.statusText },
        "Healthsites R2 proxy request failed",
      );
      res.status(502).json({ error: "Healthsites data is temporarily unavailable." });
      return;
    }

    res.status(upstream.status);
    for (const header of [
      "accept-ranges",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified",
    ]) {
      copyResponseHeader(upstream, res, header);
    }
    res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (method === "HEAD" || upstream.status === 304) {
      res.end();
      return;
    }

    await streamBody(upstream, req, res);
  } catch (error) {
    req.log?.error({ err: error }, "Healthsites FlatGeobuf proxy failed");
    if (!res.headersSent) {
      res.status(503).json({
        error: "Healthsites data access is not configured.",
        configured: false,
      });
    } else {
      res.end();
    }
  }
}

router.head("/healthsites/flatgeobuf", (req, res) => {
  void proxyFlatGeobuf(req, res);
});
router.get("/healthsites/flatgeobuf", (req, res) => {
  void proxyFlatGeobuf(req, res);
});

export default router;
