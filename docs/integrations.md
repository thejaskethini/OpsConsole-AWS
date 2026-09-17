# Jira and Asana setup

OpsConsole defaults to simulated integrations. Real mode requires `INTEGRATION_MODE=real` and the server-only variables in `.env.example`.

For Jira Cloud, create an Atlassian OAuth 2.0 (3LO) app, register `JIRA_REDIRECT_URI`, and grant `read:jira-work`, `write:jira-work`, and `offline_access`. Start OpsConsole, open Project Integrations, connect Jira, authorize, select a discovered site/project/issue type, then review, approve, and create the issue.

For Asana, create an OAuth app, register `ASANA_REDIRECT_URI`, configure its distribution/access and task-write scope, then set the Asana variables. Connect Asana, authorize, select a discovered workspace/project, then review, approve, and create the task.

OAuth tokens are held only in a server-side development memory credential store. It is intentionally non-durable and is not production secret storage; production deployment must provide an encrypted durable `IntegrationCredentialStore` implementation.
