# Replit App → GCP Zürich (europe-west6) – Deployment-Anleitung

> **Für den Replit Agent**: Diese Anleitung beschreibt Schritt für Schritt, wie eine Replit pnpm-Monorepo-App (Node.js/TypeScript/Express) vollständig auf Google Cloud Platform in der Region `europe-west6` (Zürich) deployed wird — mit Cloud Run, Cloud SQL, Cloud Storage, Cloud Build (CI/CD) und Static IP.

---

## Voraussetzungen

### Lokal / Replit-seitig
- pnpm-Monorepo-Projekt mit `Dockerfile` oder Build-Script
- Replit Git Panel (Push-Button) als Auslöser für Cloud Build
- GitHub-Repository verbunden mit dem Replit-Projekt

### GCP-seitig
- GCP-Projekt erstellt (z.B. `mein-projekt`)
- Billing aktiviert
- Folgende APIs aktiviert:
  ```
  Cloud Run API
  Cloud Build API
  Cloud SQL Admin API
  Artifact Registry API
  Secret Manager API
  Cloud Storage API
  Compute Engine API (für Static IP)
  ```
  Aktivieren via:
  ```bash
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    sqladmin.googleapis.com artifactregistry.googleapis.com \
    secretmanager.googleapis.com storage.googleapis.com \
    compute.googleapis.com
  ```

---

## Schritt 1: GCP-Projekt & Region konfigurieren

```bash
gcloud config set project PROJEKT_ID
gcloud config set run/region europe-west6
```

**Replit Secrets setzen:**
| Secret | Beispielwert |
|--------|-------------|
| `GCP_PROJECT_ID` | `mein-projekt` |
| `GCP_REGION` | `europe-west6` |

---

## Schritt 2: Artifact Registry (Container-Repository)

```bash
gcloud artifacts repositories create mein-repo \
  --repository-format=docker \
  --location=europe-west6 \
  --description="Container images"
```

Image-URL-Format:
```
europe-west6-docker.pkg.dev/PROJEKT_ID/mein-repo/app:latest
```

---

## Schritt 3: Cloud SQL (PostgreSQL) einrichten

```bash
# Instanz erstellen (Zürich, kleinste Stufe für Dev/Staging)
gcloud sql instances create mein-db \
  --database-version=POSTGRES_15 \
  --region=europe-west6 \
  --tier=db-f1-micro \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00

# Datenbank anlegen
gcloud sql databases create app_db --instance=mein-db

# Passwort für postgres-User setzen
gcloud sql users set-password postgres \
  --instance=mein-db \
  --password=SICHERES_PASSWORT
```

**Connection String** (für Cloud Run via Unix-Socket):
```
postgresql://postgres:PASSWORT@localhost/app_db?host=/cloudsql/PROJEKT_ID:europe-west6:mein-db
```

**Replit Secrets setzen:**
| Secret | Wert |
|--------|------|
| `DATABASE_URL_GCP` | Obiger Connection String |
| `GCP_SQL_INSTANCE` | `PROJEKT_ID:europe-west6:mein-db` |

---

## Schritt 4: Cloud Storage Bucket

```bash
gcloud storage buckets create gs://mein-bucket \
  --location=europe-west6 \
  --uniform-bucket-level-access

# Öffentlichen Lesezugriff erlauben (für User-Uploads/Assets)
gcloud storage buckets add-iam-policy-binding gs://mein-bucket \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

**Replit Secret setzen:**
| Secret | Wert |
|--------|------|
| `GCP_STORAGE_BUCKET` | `mein-bucket` |

---

## Schritt 5: Service Account erstellen

```bash
# Service Account anlegen
gcloud iam service-accounts create app-deployer \
  --display-name="App Deployer"

# Rollen zuweisen
gcloud projects add-iam-policy-binding PROJEKT_ID \
  --member="serviceAccount:app-deployer@PROJEKT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJEKT_ID \
  --member="serviceAccount:app-deployer@PROJEKT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding PROJEKT_ID \
  --member="serviceAccount:app-deployer@PROJEKT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding PROJEKT_ID \
  --member="serviceAccount:app-deployer@PROJEKT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# JSON-Key exportieren
gcloud iam service-accounts keys create key.json \
  --iam-account=app-deployer@PROJEKT_ID.iam.gserviceaccount.com
```

**Replit Secret setzen:**
| Secret | Wert |
|--------|------|
| `GCP_SERVICE_ACCOUNT_KEY` | Inhalt der `key.json` (vollständiges JSON) |

> Die `key.json` danach lokal löschen — sie darf nie ins Repository committed werden.

---

## Schritt 6: Cloud Build CI/CD (`cloudbuild.yaml`)

Diese Datei ins Root des Repositories legen:

```yaml
# cloudbuild.yaml
steps:
  # 1. Docker-Image bauen
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - build
      - -t
      - europe-west6-docker.pkg.dev/$PROJECT_ID/mein-repo/app:$COMMIT_SHA
      - -t
      - europe-west6-docker.pkg.dev/$PROJECT_ID/mein-repo/app:latest
      - -f
      - artifacts/api-server/Dockerfile
      - .

  # 2. Image pushen
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - push
      - --all-tags
      - europe-west6-docker.pkg.dev/$PROJECT_ID/mein-repo/app

  # 3. Cloud Run deployen
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - mein-app
      - --image=europe-west6-docker.pkg.dev/$PROJECT_ID/mein-repo/app:$COMMIT_SHA
      - --region=europe-west6
      - --platform=managed
      - --allow-unauthenticated
      - --add-cloudsql-instances=PROJEKT_ID:europe-west6:mein-db
      - --set-env-vars=NODE_ENV=production
      - --min-instances=1
      - --max-instances=10
      - --memory=512Mi
      - --cpu=1

options:
  logging: CLOUD_LOGGING_ONLY
```

**Cloud Build Trigger einrichten** (GitHub → Cloud Build):
```bash
# Via GCP Console: Cloud Build → Triggers → Create Trigger
# - Ereignis: Push to branch (main)
# - Repository: GitHub verbinden
# - Build-Konfiguration: cloudbuild.yaml
```

---

## Schritt 7: Dockerfile

Minimales Dockerfile für Node.js/pnpm-Monorepo:

```dockerfile
# artifacts/api-server/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm installieren
RUN npm install -g pnpm

# Workspace-Dateien kopieren
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY packages/ packages/

# Dependencies installieren
RUN pnpm install --frozen-lockfile

# Source kopieren & bauen
COPY artifacts/api-server/ artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

# Production-Stage
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY artifacts/api-server/public ./artifacts/api-server/public
COPY artifacts/api-server/src/views ./artifacts/api-server/src/views

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.cjs"]
```

---

## Schritt 8: Secrets in Cloud Run hinterlegen

Alle Umgebungsvariablen werden als Cloud Run Secrets (via Secret Manager) oder direkt als Env-Vars gesetzt:

```bash
# Secret Manager: Secret anlegen
echo -n "WERT" | gcloud secrets create SECRET_NAME \
  --data-file=- \
  --replication-policy=user-managed \
  --locations=europe-west6

# Cloud Run Service updaten mit Secrets
gcloud run services update mein-app \
  --region=europe-west6 \
  --update-secrets=DATABASE_URL=DATABASE_URL_GCP:latest \
  --update-secrets=JWT_SECRET=JWT_SECRET:latest \
  --update-secrets=RESEND_API_KEY=RESEND_API_KEY:latest
```

Oder direkt als Env-Vars (für nicht-sensitive Werte):
```bash
gcloud run services update mein-app \
  --region=europe-west6 \
  --update-env-vars=APP_DOMAIN=app.meinedomain.com,NODE_ENV=production
```

---

## Schritt 9: Static IP & Custom Domain

```bash
# Globale Static IP reservieren
gcloud compute addresses create mein-app-ip \
  --network-tier=PREMIUM \
  --ip-version=IPV4 \
  --global

# IP-Adresse anzeigen
gcloud compute addresses describe mein-app-ip --global
# → z.B. 34.120.118.2
```

**DNS beim Domain-Registrar konfigurieren:**
| Record | Typ | Ziel |
|--------|-----|------|
| `@` / `meinedomain.com` | A | `34.120.118.2` |
| `www` | A | `34.120.118.2` |
| `app` | A | `34.120.118.2` |

**Custom Domain in Cloud Run verknüpfen:**
```bash
gcloud run domain-mappings create \
  --service=mein-app \
  --domain=meinedomain.com \
  --region=europe-west6

gcloud run domain-mappings create \
  --service=mein-app \
  --domain=app.meinedomain.com \
  --region=europe-west6
```

> SSL-Zertifikate werden von Cloud Run automatisch via Let's Encrypt ausgestellt. Provisioning dauert 15–30 Minuten nach DNS-Propagation.

---

## Schritt 10: Push-Workflow (Replit → Cloud Run)

**Das ist der einzige Deployment-Trigger:**

1. Änderungen in Replit vornehmen
2. **Git Panel** (links in Replit) öffnen
3. Commit-Message eingeben
4. **„Push"**-Button klicken
5. GitHub empfängt den Push → löst Cloud Build Trigger aus
6. Cloud Build baut das Image und deployed auf Cloud Run
7. In der GCP Console unter **Cloud Build → History** den Status prüfen

> **Wichtig für den Replit Agent**: Kein Terminal-Push möglich. Deployments laufen ausschliesslich über den Git Panel Push-Button.

---

## Schritt 11: Logs & Debugging in Production

```bash
# Live-Logs streamen
gcloud run services logs tail mein-app --region=europe-west6

# Letzte 100 Logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mein-app" \
  --limit=100 \
  --format="table(timestamp,textPayload)"
```

**Via GCP Console**: Cloud Run → mein-app → Logs-Tab

Alternativ in Replit: `fetch_deployment_logs`-Tool zum Abrufen der Production-Logs.

---

## Checkliste: Neues Projekt transferieren

- [ ] GCP-Projekt erstellen, Billing aktivieren, APIs enablen
- [ ] Artifact Registry Repository erstellen
- [ ] Cloud SQL Instanz + Datenbank in `europe-west6`
- [ ] Cloud Storage Bucket in `europe-west6`
- [ ] Service Account + Key erstellen, alle nötigen Rollen zuweisen
- [ ] `GCP_SERVICE_ACCOUNT_KEY` und alle anderen Secrets in Replit hinterlegen
- [ ] `Dockerfile` im Monorepo-Root oder Artifact-Verzeichnis erstellen
- [ ] `cloudbuild.yaml` im Repo-Root erstellen
- [ ] Cloud Build Trigger mit GitHub verbinden (Branch: `main`)
- [ ] Ersten Push via Replit Git Panel ausführen, Build prüfen
- [ ] Static IP reservieren, DNS-Records setzen
- [ ] Custom Domains in Cloud Run verknüpfen, SSL abwarten
- [ ] Production-Logs prüfen, DB-Verbindung verifizieren

---

## Häufige Fehler & Lösungen

| Problem | Ursache | Lösung |
|---------|---------|--------|
| `Cloud SQL connection refused` | Cloud SQL Proxy nicht aktiv | `--add-cloudsql-instances` im `gcloud run deploy`-Befehl setzen |
| `Container failed to start` | Port falsch | App muss `process.env.PORT` lesen (Cloud Run setzt `PORT=8080`) |
| `Permission denied on Artifact Registry` | Fehlende IAM-Rolle | `artifactregistry.writer` dem Service Account zuweisen |
| `SSL cert pending` | DNS noch nicht propagiert | 15–60 Minuten warten, dann `domain-mappings describe` prüfen |
| `Build succeeds but old code runs` | Cloud Run cached altes Image | `--image` mit `$COMMIT_SHA` statt `:latest` taggen |
| `DB migrations schlagen fehl` | Migrate-Skript läuft nicht | In `index.ts` sicherstellen, dass `migrate()` vor `app.listen()` aufgerufen wird |

---

## Umgebungsvariablen-Referenz

| Variable | Beschreibung | Pflicht |
|----------|-------------|---------|
| `DATABASE_URL` / `DATABASE_URL_GCP` | PostgreSQL Connection String | Ja |
| `PORT` | Wird von Cloud Run automatisch gesetzt (8080) | Auto |
| `NODE_ENV` | Auf `production` setzen | Ja |
| `GCP_PROJECT_ID` | GCP Projekt-ID | Für Storage/Cloud-APIs |
| `GCP_REGION` | `europe-west6` | Für Storage/Cloud-APIs |
| `GCP_STORAGE_BUCKET` | Bucket-Name für Uploads | Für File-Uploads |
| `GCP_SQL_INSTANCE` | `PROJEKT:REGION:INSTANZ` | Für Cloud SQL Proxy |
| `GCP_SERVICE_ACCOUNT_KEY` | JSON-Key (Base64 oder raw) | Für GCP SDK-Calls aus der App |
| `APP_DOMAIN` | App-Subdomain (z.B. `app.domain.com`) | Für Domain-Routing |
| `JWT_SECRET` | JWT-Signing-Secret | Ja |
| `RESEND_API_KEY` | Resend E-Mail-API | Für E-Mails |

---

*Erstellt auf Basis des Flowtifyy-GCP-Deployments (europe-west6, Cloud Run, Cloud SQL PostgreSQL 15, Cloud Storage, Cloud Build CI/CD). Stand: April 2026.*
