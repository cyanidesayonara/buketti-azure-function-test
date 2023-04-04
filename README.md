# Azure function™ prototype

## Read about scheduled Azure functions and create a new project

https://learn.microsoft.com/en-us/azure/azure-functions/functions-create-scheduled-function

## Clone repo from Azure DevOps

Go to: https://dev.azure.com/SanttuNykanen/_git/buketti-azure-function-test

Clone git repository: `git clone git@ssh.dev.azure.com:v3/SanttuNykanen/buketti-azure-function-test/buketti-azure-function-test`

## Install dependencies locally

`npm i`

## Set local environment variables

Create a file called local.settings and fill in your Azure storage connection string

Go to: https://portal.azure.com/#home -> Storage account -> Access keys - Connection string

```
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": {CONNECTION_STRING_HERE},
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "BLOB_CONNECTION_STRING": {CONNECTION_STRING_HERE},
    "BLOB_CONTAINER_NAME": "buketti-blob-storage",
    "POSTGRES_HOST": "buketti-azure-function-test-db.postgres.database.azure.com",
    "POSTGRES_USER": "testuser",
    "POSTGRES_PASSWORD": "buketti#2",
    "POSTGRES_DB": "postgres",
    "CRON_SCHEDULE": "* * * * *"
  }
}
```

## Start app

`npm start`

## Manual deployment

* The function app can be deployed as a zip file from command line. Follow these instructions: https://learn.microsoft.com/en-us/azure/azure-functions/deployment-zip-push
* The app can also easily be deployed with a Visual Studio Code extension: https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs-code

## Continuous deployment

* The most natural way to host a repository and create pipelines is with Azure 
DevOps: https://learn.microsoft.com/en-us/azure/app-service/deploy-azure-pipelines
* GitHub has been tested and works.
* Using GitLab pipelines should also be possible, but remains untested: 
https://dev.to/alandecastros/gitlab-ci-script-to-deploy-a-azure-function-3gc4
