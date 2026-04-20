# SecureAPI Platform — Master Context File
> Paste this entire file at the start of any new chat to restore full context.
> Last updated: Phase 1 in progress

---

## Who I Am
- **Name:** Beatrice Mwangi (Mwangi Beatrice Warukira)
- **Role:** DevSecOps / Cloud Security Engineer (mid-level, 3+ years)
- **OS:** Ubuntu 24.04 LTS in VMware on Windows 11
- **Editor:** VS Code | **Terminal:** bash | **Screenshots:** Flameshot
- **Project location:** `~/Projects/secureapi-platform/`
- **GitHub:** github.com/Secsiren | **DockerHub:** hub.docker.com/u/bugsiren

---

## Certifications (always spell out in full, never acronyms only)
| Acronym | Full Name |
|---------|-----------|
| CDP | Certified DevSecOps Professional |
| CCNSE | Certified Cloud Native Security Expert |
| CASP | Certified API Security Professional |
| CCSE | Certified Container Security Expert |
| CTMP | Certified Threat Modeling Professional |
| CSSE | Certified Software Supply Chain Security Expert |

---

## Project: SecureAPI Platform
A production-grade developer API gateway platform (think mini-Stripe API).
Built phase by phase — every phase adds a hireable DevSecOps skill and activates a certification.
Everything runs in Docker. Nothing runs loose on the VM.

**Port:** 3333 on host → 3000 inside container
**Stack:** Node.js + TypeScript + Express + PostgreSQL + Docker + Docker Compose

---

## Current Folder Structure
```
secureapi-platform/
├── docker/
│   ├── Dockerfile              ✅ Multi-stage build (builder + production)
│   ├── docker-compose.yml      ✅ App on port 3333, DB on internal network
│   └── init.sql                ✅ Creates users + refresh_tokens tables on first run
├── src/
│   ├── app.ts                  ✅ Express app, middleware, routes, error handlers
│   ├── config/
│   │   ├── env.ts              ✅ Loads .env, crashes if required vars missing
│   │   └── database.ts         ✅ PostgreSQL connection pool, query helper
│   ├── middleware/
│   │   └── authGuard.ts        ✅ JWT verification middleware
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts  ✅ register, login, getMe, refresh, logout, logoutAll
│   │   │   └── auth.routes.ts      ✅ Routes + express-validator validation rules
│   │   ├── users/
│   │   │   └── user.store.ts       ✅ All database queries for users + refresh tokens
│   │   ├── projects/           ⏳ Phase 3
│   │   ├── api-keys/           ⏳ Phase 4
│   │   ├── usage-logs/         ⏳ Phase 6
│   │   └── public-api/         ⏳ Phase 5
│   ├── types/
│   │   └── index.ts            ✅ All TypeScript interfaces (User, JwtPayload, ApiResponse etc.)
│   └── utils/
│       └── jwt.ts              ✅ generateTokens, verifyToken, hashToken, getRefreshTokenExpiry
├── tests/                      ⏳ Phase later
├── docs/                       ⏳ Phase later
├── .env                        ✅ DB credentials + JWT secret (never commit)
├── .gitignore                  ✅ Ignores .env, node_modules, dist
├── package.json                ✅ All dependencies defined
└── tsconfig.json               ✅ TypeScript compiler config
```

---

## Docker Setup
Two containers managed by Docker Compose:
- `secureapi-app` — Node.js backend, host port **3333** → container port 3000
- `secureapi-db` — PostgreSQL 16, internal network only

### Commands
```bash
# Navigate to project
cd ~/Projects/secureapi-platform

# First time build and start
cd docker && docker compose --env-file ../.env up --build

# Start without rebuilding
cd docker && docker compose --env-file ../.env up

# Stop
cd docker && docker compose down

# Stop and wipe database
cd docker && docker compose down -v

# View live logs
cd docker && docker compose logs -f

# View app logs only
cd docker && docker compose logs -f app
```

---

## Environment Variables (.env)
```
DB_NAME=secureapi
DB_USER=secureapi_user
DB_PASSWORD=SecurePass_2024!
JWT_SECRET=<randomly generated 128 char hex — already in your .env file>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
```

---

## API Endpoints (Phase 1)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /health | None | Health check |
| POST | /auth/register | None | Create account, returns tokens |
| POST | /auth/login | None | Login, returns tokens |
| GET | /auth/me | Bearer token | Returns current user profile |
| POST | /auth/refresh | None | Get new access token using refresh token |
| POST | /auth/logout | None | Revoke a refresh token |
| POST | /auth/logout-all | Bearer token | Revoke all tokens for this user |

### Test commands (use after docker compose up)
```bash
# Health check
curl -s http://localhost:3333/health | python3 -m json.tool

# Register
curl -s -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"beatrice@test.com","password":"SecurePass123","first_name":"Beatrice"}' \
  | python3 -m json.tool

# Login
curl -s -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"beatrice@test.com","password":"SecurePass123"}' \
  | python3 -m json.tool

# Get current user (replace TOKEN with accessToken from login response)
curl -s http://localhost:3333/auth/me \
  -H "Authorization: Bearer TOKEN" \
  | python3 -m json.tool

# Refresh token (replace REFRESH_TOKEN with refreshToken from login response)
curl -s -X POST http://localhost:3333/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}' \
  | python3 -m json.tool

# Logout (replace REFRESH_TOKEN)
curl -s -X POST http://localhost:3333/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}' \
  | python3 -m json.tool
```

---

## Security Decisions Made in Phase 1
| Decision | Reason |
|----------|--------|
| bcrypt cost 12 | ~300ms hash time — brute force impractical |
| Access token = 15min | Small damage window if stolen |
| Refresh token = 7 days | Long lived but only used at one endpoint |
| Refresh tokens hashed in DB | DB breach cannot yield usable tokens |
| Refresh token rotation | Stolen token detected on next legitimate use |
| Same error for bad email/password | Prevents user enumeration |
| Non-root user in Docker | Limits blast radius if app is compromised |
| Multi-stage Dockerfile | No dev tools or source in production image |
| express.json limit 10kb | Prevents payload flooding |
| x-powered-by disabled | Don't advertise the stack |
| Parameterized SQL queries | Prevents SQL injection |
| SELECT explicit columns | password_hash never accidentally returned |

---

## Build Phases
| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Auth system (register, login, JWT, refresh tokens, PostgreSQL) | 🔧 In progress — ready to build |
| 2 | Rate limiting + security headers (Helmet, express-rate-limit) | ⏳ Pending |
| 3 | Project system (multi-project per user) | ⏳ Pending |
| 4 | API key system (generate, hash, scope, revoke) | ⏳ Pending — proves CASP |
| 5 | Public API layer (API key protected endpoints) | ⏳ Pending |
| 6 | Usage logging + database migrations | ⏳ Pending |
| 7 | Secure CI/CD pipeline (Trivy, Semgrep, Gitleaks, OWASP ZAP) | ⏳ Pending — proves CDP |
| 8 | Kubernetes hardening (RBAC, NetworkPolicy, OPA, Falco) | ⏳ Pending — proves CCSE/CCNSE |
| 9 | IaC security (Terraform + tfsec + Checkov) | ⏳ Pending |
| 10 | Observability (Prometheus + Grafana + Alertmanager) | ⏳ Pending |
| 11 | Supply chain security (SBOM, Cosign, SLSA) | ⏳ Pending — proves CSSE |
| 12 | Threat modeling as code (pytm, STRIDE) | ⏳ Pending — proves CTMP |
| 13 | Cloud deployment (AWS ECS/EKS, RDS, WAF) | ⏳ Pending |

---

## Rules for This Project (non-negotiable)
1. Explain every command before running it
2. Use `python3 << 'PYEOF'` heredoc OR GEDIT OR THE CORRECT WAY TO AVOID SYNTAX ERRORS for writing config/JS files
3. Always position Beatrice as mid-level, never junior
4. Everything runs in Docker — nothing loose on the VM
5. Build incrementally — finish each phase before starting the next
6. Every feature must include security thinking
7. App runs on host port 3333 (3000 and 3001 are taken)
8. Give ALL code in full — never hide or truncate any part of a file
9. Beatrice says "done" to confirm a step succeeded — no need to paste output unless debugging
10. Flameshot for screenshots — never suggest scrot

---

## Where Phase 1 Was Left Off
## Phase 1 Status — COMPLETE
All endpoints tested and working. 

## Where to Start Next Chat — Phase 2
Phase 2 adds rate limiting and security headers.
Libraries needed: helmet, express-rate-limit
Start by saying: "Let's build Phase 2 of SecureAPI Platform — 
rate limiting and security headers"
