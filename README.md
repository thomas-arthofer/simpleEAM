# NextGen EAM (Enterprise Architecture Management)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.4.3-blue.svg)](./VERSION)

> **🤖 AI-Generated Project**: This code was fully created with GitHub Copilot in Agent mode. The entire project, including architecture, implementation and documentation, was realized through AI-assisted development.

A modern Enterprise Architecture Management system that helps organizations manage, visualize and optimize their IT landscape across operational architecture, analytics, and AI-assisted workflows.

## 🚀 Features

- **Visual Representation**: IT architecture visualization with Excalidraw
- **Component Management**: Manage applications, services, databases and infrastructure
- **Relationship Mapping**: Display dependencies between components
- **Analytics Workspace**: Explore architecture projections through ClickHouse and Cube-backed analytics
- **Multi-Language Support**: German and English
- **Modern Tech Stack**: Next.js 15, Material-UI 7, Neo4j, GraphQL
- **Runtime Configuration**: Change settings without rebuilding
- **Secure Authentication**: Keycloak integration with role-based access control
- **Workflow Automation**: Temporal-backed background processing for analytics refresh and AI runs

## 🛠️ Technology Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **Material-UI 7**: UI component library
- **TypeScript**: Type-safe development
- **Tanstack Table V8**: Advanced table functionality
- **Tanstack Form**: Powerful form creation
- **Apollo Client**: GraphQL client
- **Excalidraw**: Diagram editor

### Backend

- **GraphQL**: API layer
- **Neo4j**: Graph database for architecture models
- **Node.js**: Server runtime
- **ClickHouse**: Projection database for analytics workloads
- **Cube**: Semantic layer for analytics queries
- **Temporal**: Durable workflow orchestration for analytics and AI jobs

### Infrastructure

- **Docker**: Containerization
- **Keycloak**: Authentication and authorization
- **Yarn Berry**: Package manager

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Yarn Berry (automatically configured)

## 🚀 Installation

1. **Clone repository**

```bash
git clone https://github.com/marcus-friedrich/nextgen-eam.git
cd nextgen-eam
```

2. **Install dependencies**

```bash
yarn install
```

3. **Supported Path (official default, localhost-first)**

This path is the supported baseline for development and operations checks.
It does not require Traefik, DNS, or TLS setup.

```bash
cp env.template .env
docker compose up -d
```

Optional AI profile services can be started in the same stack:

```bash
docker compose --profile ai up -d
```

4. **Supported Path gate checks (single overall gate)**

The minimum success gate is one collective check: every service started by your
selected compose command must be running. This includes optional profile services
when they were started, without separate optional per-service checks.

```bash
TOTAL=$(docker compose --profile ai config --services | wc -l)
RUNNING=$(docker compose --profile ai ps --status running --services | wc -l)
test "$RUNNING" -eq "$TOTAL"
curl -fsS http://localhost:4000/health
curl -fsS http://localhost:3000 > /dev/null
```

GraphQL Health and Client reachability are part of this gate.

5. **Optional Path: Traefik/HTTPS parity (not required)**

Use this only when you need ingress-like parity in local setups.
Nicht erforderlich fuer Supported Path.

> **Login caveat:** SSO login via the Supported (localhost) Path above does not currently work — Keycloak's `redirectUris`/`webOrigins` in `auth/src/realm-export.json` only reference `https://eam.<BASE_DOMAIN>/*`. The Optional Path below is the one that supports an end-to-end login today.

Expected hostnames in this optional path:

- `https://eam.<BASE_DOMAIN>` (Client)
- `https://api.<BASE_DOMAIN>/graphql` (GraphQL)
- `https://auth.<BASE_DOMAIN>` (Keycloak)
- `https://neo4j.<BASE_DOMAIN>` (Neo4j Browser)
- `https://room.<BASE_DOMAIN>` (Excalidraw room server)
- `https://temporal.<BASE_DOMAIN>` (Temporal UI)

Restoration steps (verified working setup, ported from a proven local Traefik + local-CA testbed):

1. **Generate a local root CA + wildcard certificate once** (idempotent):
   ```bash
   ./local/make-local-ca.sh
   ```
   Then trust `local/certs/rootCA.pem` on your host and in each browser used for testing:
   ```bash
   sudo cp local/certs/rootCA.pem /usr/local/share/ca-certificates/simpleeam-local.crt
   sudo update-ca-certificates
   ```
   Firefox uses its own certificate store and needs a separate manual import. Chrome/Chromium trust the CA per-origin rather than per-domain-suffix — see [docs/lokale-https-domains.md](docs/lokale-https-domains.md) for the exact gotcha and workaround.

2. **Resolve all 6 `*.<BASE_DOMAIN>` hostnames** — pick one:
   - **Option A — `/etc/hosts`** (single machine):
     ```
     127.0.0.1 eam.example.com api.example.com auth.example.com neo4j.example.com room.example.com temporal.example.com
     ```
     Add this as a new line; do not edit any existing, unrelated `/etc/hosts` entries.
   - **Option B — firewall/router DNS**: point all 6 `*.<BASE_DOMAIN>` A-records at this host's LAN IP. Works automatically for both browser and container-side resolution, as long as your host's own DNS resolver is routable (not a loopback stub).

3. **Ensure `.env` has empty cert-resolver values** for local use (already the default in `env.template`):
   ```
   TRAEFIK_CERTRESOLVER=
   TEMPORAL_UI_CERTRESOLVER=
   ```

4. **Start the stack** — `docker-compose.override.yml` is automatically merged by Compose, no `-f` flag needed:
   ```bash
   docker compose up -d
   ```
   If you already run a shared Traefik instance for other local projects, don't start a second one on port 443 — instead attach the network aliases to your existing instance:
   ```bash
   docker network connect --alias eam.example.com --alias api.example.com --alias auth.example.com \
     --alias neo4j.example.com --alias room.example.com --alias temporal.example.com \
     eam-network <existing-traefik-container>
   ```

5. **Set the Keycloak realm admin password once** — `realm-export.json` creates the `admin` user without credentials:
   ```bash
   ./local/set-admin-password.sh
   ```

6. **Verify container-side DNS resolution** (the actual root-cause check — must not return a public IP):
   ```bash
   docker exec nextgen-eam-server-1 getent hosts auth.example.com
   ```

7. **Log in** at `https://eam.<BASE_DOMAIN>` with the admin password from step 5 (or another realm user) and confirm an authenticated GraphQL call succeeds.

Deferred, explicitly out of scope for this Optional Path: adding a `localhost:3000` redirect URI to the dev realm, and automated `/etc/hosts` scripting.

6. **Start development server**

```bash
cd client
yarn dev
```

The application is then available at: http://localhost:3000

AI model access is configured per company in the application data model (`Company.llmUrl`, `Company.llmModel`, `Company.llmKey`).

## ☸️ Kubernetes Installation

For cluster deployments, NextGen EAM ships with a Helm chart in `k8s/`.

### Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- An ingress controller
- A storage class for persistent volumes

### Quick Start

```bash
cd k8s

export NAMESPACE=nextgen-eam

../scripts/sync-k8s-asset-configmaps.sh \
	--namespace "$NAMESPACE" \
	--release nextgen-eam \
	--values values.yaml

cat > my-values.yaml <<EOF
global:
	baseDomain: eam.example.com
	imageRepository: de-fue-cto-community

neo4j:
	auth:
		password: "change-me-neo4j"

keycloak:
	admin:
		password: "change-me-keycloak-admin"
	db:
		password: "change-me-keycloak-db"
EOF

helm install nextgen-eam . -f my-values.yaml -n "$NAMESPACE" --create-namespace
```

To enable the scheduled analytics refresh in Temporal, add the analytics runtime schedule settings to your Helm values:

```yaml
analytics:
	runtime:
		enabled: true
		scheduleEnabled: 'true'
		scheduleId: analytics-projection-refresh
		scheduleInterval: 1 hour
		auth:
			bootstrapClientId: eam-server
			bootstrapClientSecret: change-me
```

`analytics-scheduler` registers or reconciles the Temporal schedule, and `analytics-worker` executes the scheduled refresh workflow on the analytics task queue.

For updates, run:

```bash
yarn sync:cube-schema
./scripts/sync-k8s-asset-configmaps.sh \
	--namespace "$NAMESPACE" \
	--release nextgen-eam \
	--values k8s/my-values.yaml
cd k8s
helm upgrade nextgen-eam . -f my-values.yaml -n "$NAMESPACE"
```

The Helm chart supports analytics services, scheduled analytics refresh via Temporal, optional AI workloads, ingress/TLS configuration, and branding overrides. Theme and branding archives are applied as standalone ConfigMaps before Helm install and upgrade so they do not bloat the Helm release secret. See [k8s/README.md](./k8s/README.md) for the full values reference and production deployment details.

## 📁 Project Structure

```
nextgen-eam/
├── auth/                   # Keycloak configuration
├── analytics/              # ClickHouse, Cube, and CubeStore analytics stack
│   └── runtime/            # Temporal workers and scheduler for analytics refresh
├── ai-server/              # AI orchestration service and worker runtime
├── client/                 # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   └── graphql/       # GraphQL queries
├── db/                     # Neo4j database
├── k8s/                    # Kubernetes Helm chart and deployment assets
├── server/                 # GraphQL and analytics API server
├── templates/              # Entity templates
├── scripts/               # Automation scripts
├── tools/temporal/         # Temporal persistence assets
└── docs/                  # Documentation
```

## 🎯 Entity Generation

The project uses a template system for automatic generation of new entities:

```bash
./scripts/create-entity.sh [entity-name]
```

Example:

```bash
./scripts/create-entity.sh companies
```

## 🔧 Development

### Available Scripts

```bash
# Frontend Development
yarn dev              # Start development server
yarn build            # Create production build
yarn lint             # Run ESLint

# Version Management
yarn version          # Show current version
yarn version:patch    # Increment patch version (1.4.3 -> 1.4.4)
yarn version:minor    # Increment minor version (1.4.3 -> 1.5.0)
yarn version:major    # Increment major version (1.4.3 -> 2.0.0)

# Entity Management
./scripts/create-entity.sh [name]  # Create new entity

# Docker
docker compose up -d                    # Start core services
COMPOSE_PROFILES=ai docker compose up -d # Start AI profile services too
docker compose down                     # Stop all services
```

### Code Standards

- **TypeScript**: Strict typing
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages

## 📚 Documentation

Detailed documentation can be found in the [`docs/`](./docs/) directory:

- [Architecture Overview](./docs/README.md)
- [Analytics Change Checklist](./docs/ANALYTICS_CHANGE_CHECKLIST.md)
- [Entity Pattern](./docs/ENTITY-IMPLEMENTATION-PATTERN.md)
- [Development Guidelines](./docs/CONTRIBUTING.md)
- [Runtime Configuration](./docs/RUNTIME_CONFIG.md)
- [Branding and Theming](./docs/BRANDING.md)
- [Kubernetes Helm Deployment](./k8s/README.md)

## 🌐 Services

- **Frontend**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql
- **Analytics API**: http://localhost:4000/analytics
- **AI Server** (AI profile): http://localhost:4001/health
- **Cube API**: http://localhost:4003/cubejs-api/v1
- **ClickHouse HTTP**: http://localhost:8123
- **Excalidraw Room**: http://localhost:3001
- **Temporal UI**: http://localhost:8088
- **CubeStore**: http://localhost:3030
- **Neo4j Browser**: http://localhost:7474
- **Keycloak Admin**: http://localhost:8080

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Created with GitHub Copilot Agent mode
- Material-UI for UI components
- Neo4j for graph database
- Excalidraw for diagram functionality
