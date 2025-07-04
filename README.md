# HappiHub

🩸 **Interactive learning platform for arterial blood gas interpretation**

HappiHub helps healthcare professionals learn ABG analysis through learning modules, interactive quizzes and guided interpretation tools.

## Quick Start

```bash
mix setup
mix phx.server
```

Visit [localhost:4000](http://localhost:4000) to start learning!

## Deployment (Dokku)

This app is deployed using [Dokku](https://dokku.com/). Common deployment commands:

### Deploy

```bash
git push dokku main
```

### Database Console

```bash
# Connect to PostgreSQL console
ssh -t user@server "dokku postgres:connect happihub_db"
```

### Remote IEx Console

```bash
# Connect to running application remote console
ssh -t user@server "dokku enter happihub web -- /app/bin/astrup remote"
```

### Common Tasks

```bash
# Run migrations
ssh -t user@server "dokku enter happihub web -- /app/bin/migrate"

# Seed database
ssh -t user@server "dokku run happihub web -- /app/bin/seed"

# Check logs
ssh -t user@server "dokku logs happihub --tail"

# View app info
ssh -t user@server "dokku apps:info happihub"
```
