# Phase 2 — Rate Limiting & Security Headers

## What Was Built

Added two security layers to the SecureAPI Platform: HTTP security headers via Helmet and request rate limiting via express-rate-limit.

## New Files

| File | Purpose |
|------|---------|
| `src/middleware/rateLimiter.ts` | Three rate limiters: global, auth, refresh |

## Modified Files

| File | Change |
|------|--------|
| `src/app.ts` | Added helmet() and globalLimiter |
| `src/modules/auth/auth.routes.ts` | Added authLimiter and refreshLimiter to routes |

## Security Headers Added (Helmet)

| Header | Value | Protection |
|--------|-------|-----------|
| Content-Security-Policy | default-src 'self' + safe overrides | Blocks XSS and injection attacks |
| X-Frame-Options | SAMEORIGIN | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Stops MIME type sniffing |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Forces HTTPS |
| X-DNS-Prefetch-Control | off | Prevents DNS leakage |
| Referrer-Policy | no-referrer | Stops referrer header leakage |
| Cross-Origin-Opener-Policy | same-origin | Isolates browsing context |
| X-Permitted-Cross-Domain-Policies | none | Blocks Flash/PDF cross-domain requests |
| X-XSS-Protection | 0 | Disables buggy browser XSS filter (CSP handles this now) |

## Rate Limiters

| Limiter | Routes | Window | Max Requests | Purpose |
|---------|--------|--------|-------------|---------|
| globalLimiter | All routes | 15 min | 100 | General abuse prevention |
| authLimiter | POST /auth/register, POST /auth/login | 15 min | 10 | Brute force + credential stuffing defence |
| refreshLimiter | POST /auth/refresh | 15 min | 30 | Token farming prevention |

## Security Decisions

| Decision | Reason |
|----------|--------|
| Helmet applied before all routes | Every response gets headers — no route can slip through unprotected |
| authLimiter set to 10/15min | Credential stuffing attacks typically run thousands of attempts — 10 stops them cold |
| refreshLimiter set to 30/15min | Legitimate apps refresh tokens often; 30 allows normal use while blocking abuse |
| standardHeaders: true | Clients receive RateLimit-* headers so they can back off gracefully |
| legacyHeaders: false | Removes old X-RateLimit-* headers — cleaner, standards-compliant responses |
| Custom rateLimitHandler | Returns our ApiResponse shape — consistent error format across the entire API |

## Verified Output

All Helmet headers confirmed present in response:
- Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
- Strict-Transport-Security, X-DNS-Prefetch-Control, Referrer-Policy
- Cross-Origin-Opener-Policy, X-Permitted-Cross-Domain-Policies

Rate limit headers confirmed:
- RateLimit-Policy, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset

## Certifications This Phase Supports

- **Certified DevSecOps Professional (CDP)** — security hardening embedded at the infrastructure layer
- **Certified API Security Professional (CASP)** — rate limiting directly mitigates OWASP API4:2023 Unrestricted Resource Consumption
