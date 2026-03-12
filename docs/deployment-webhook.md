# Deployment Webhook

## Webhook Endpoint

- Production endpoint: `https://demo.busynotify.in/api/webhooks/deploy`
- Method: `POST`

If you set `DEPLOY_WEBHOOK_TOKEN` in the production `.env`, use one of these:

- Query string: `https://demo.busynotify.in/api/webhooks/deploy?token=a24da0a8-27b4-452f-bae9-ef48d35a1509`
- Header: `x-deploy-token: YOUR_TOKEN`

GitHub webhooks can use the query-string form directly in the webhook URL.

## What Happens

When the webhook receives a request:

1. It ignores the payload content.
2. It spawns `scripts/deploy.js` as a detached child process.
3. The deploy script fetches the latest code from `main`.
4. It syncs the repo to production.
5. It preserves `.env` and database files such as `.sqlite`, `.db`, `-wal`, and `-shm`.
6. It runs dependency install, build, and PM2 restart.

## Production Environment Variables

Recommended variables for CloudPanel:

```env
DEPLOY_DOMAIN=demo.busynotify.in
DEPLOY_REPO_URL=https://github.com/whats91/busynotify-order-app.git
DEPLOY_BRANCH=main
DEPLOY_PROJECT_PATH=/home/cloudpanel/htdocs/demo.busynotify.in
DEPLOY_TEMP_PATH=/home/cloudpanel/htdocs/demo.busynotify.in/.deploy-tmp
DEPLOY_LOCK_FILE=/home/cloudpanel/htdocs/demo.busynotify.in/.deploy.lock
DEPLOY_PM2_CMD=pm2 startOrRestart ecosystem.config.js --env production
DEPLOY_WEBHOOK_TOKEN=replace-with-a-long-random-string
```

If your CloudPanel site path is different, update `DEPLOY_PROJECT_PATH` and related paths accordingly.

## Example GitHub Webhook

- Payload URL: `https://demo.busynotify.in/api/webhooks/deploy?token=YOUR_TOKEN`
- Content type: `application/json`
- Trigger: `Just the push event`

## Logs

- Webhook/deploy trigger log: `logs/deploy-webhook.log`
- PM2 app logs:
  - `logs/out.log`
  - `logs/error.log`
