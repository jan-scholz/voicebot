# Azure

The docker container with the FastAPI server and web app can be delpoyed to Azure App Service.

## Build and Deploy the Docker Image

The docker image can be built and deployed with the following two commands if all the [Prerequisites](#prerequisites) are in place.

Build the image in the registry.

```bash
RESOURCE_GROUP_NAME=resource-group-name
CONTAINER_REGISTRY_NAME=registry-name

# build image in registry
IMAGE_NAME=image-name
az acr build \
  --resource-group $RESOURCE_GROUP_NAME \
  --registry $CONTAINER_REGISTRY_NAME \
  --image ${IMAGE_NAME}:latest .
```

Whenever you change the source code or Dockerfile, build a new image and restart the app.

```bash
WEBAPP_NAME=webapp-name
az webapp restart --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP_NAME
```

## Prerequisites

Create a resource group and registry if necessary.

```bash
RESOURCE_GROUP_NAME=resource-group-name
CONTAINER_REGISTRY_NAME=registry-name
LOCATION=canada-central

# create resource group if it doesn't exist
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# create registry if it doesn't exist
az acr create --resource-group $RESOURCE_GROUP_NAME \
--name $CONTAINER_REGISTRY_NAME --sku Basic
```


## Service Plan

Select the machine/resources to deploy to.

```bash

# deploy
az appservice plan create \
--name webplan \
--resource-group $RESOURCE_GROUP_NAME \
--sku B1 \
--is-linux
```

| SKU          | Tier     | Primary Focus / Use Cases                               | vCPU (approx.) | RAM (GB) (approx.) | Disk Space (GB) | Scaling (Instance Count) | Always On | Autoscaling | Hourly (Approx.) | Monthly (Approx.) |
| :----------- | :------- | :------------------------------------------------------ | :------------- | :----------------- | :-------------- | :----------------------- | :-------- | :---------- | :--------------- | :---------------- |
| **F1**       | Free     | Small dev/test, very low traffic apps.                  | Shared         | 0.5 - 1            | 1               | 1 (fixed)                | No        | No          | Free             | Free              |
| **B1**       | Basic    | Entry-level production, dev/test, low traffic apps.     | 1              | 1.75               | 10              | 1 to 3                   | No        | No          | \$0.07             | \$50              |
| **S1**       | Standard | Production apps, higher traffic, medium-scale.          | 1              | 3.5                | 50              | 1 to 10                  | Yes       | Yes         | \$0.10             | \$73              |
| **P1V2**     | Premium  | High-performance production, mission-critical, dedicated. | 1              | 3.5                | 250             | 1 to 20                  | Yes       | Yes         | \$0.16             | \$117             |
| **P1V3**     | Premium  | Latest generation Premium, better performance/cost.     | 2              | 8                  | 250             | 1 to 30                  | Yes       | Yes         | \$0.26             | \$190             |
| **I1**       | Isolated | Enterprise, dedicated VNet, max security/isolation.     | 2              | 8                  | 1000            | 1 to 100                 | Yes       | Yes         | \$0.77             | \$560             |


## Deploy to Azure App Service

```bash
RESOURCE_GROUP_NAME=resource-group-name
CONTAINER_REGISTRY_NAME=registry-name
WEBAPP_NAME=webapp-name
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# 1. Create the Web App without --role or --scope
az webapp create \
  --resource-group $RESOURCE_GROUP_NAME \
  --plan webplan \
  --name $WEBAPP_NAME \
  --assign-identity '[system]' \
  --container-image-name $CONTAINER_REGISTRY_NAME.azurecr.io/${IMAGE_NAME}:latest \
  --acr-use-identity \
  --acr-identity '[system]'
```


Ask someone with admin rights to allow the web app to pull from the registry.

```bash
RESOURCE_GROUP_NAME=resource-group-name
CONTAINER_REGISTRY_NAME=registry-name
WEBAPP_NAME=webapp-name
ACR_SCOPE=$(az acr show --name $CONTAINER_REGISTRY_NAME --query id -o tsv)
WEBAPP_IDENTITY=$(az webapp identity show \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --query principalId -o tsv)


az role assignment create \
  --assignee $WEBAPP_IDENTITY \
  --role AcrPull \
  --scope $ACR_SCOPE
```


### Debug

Check the status and logs of the web app once deployed.

```bash
RESOURCE_GROUP_NAME=resource-group-name
WEBAPP_NAME=webapp-name

# check this URL
echo "https://${WEBAPP_NAME}.azurewebsites.net"


# view logs
az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP_NAME


# restart your Web App:
az webapp restart --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP_NAME


# clean up resources
az group delete --name $RESOURCE_GROUP_NAME --yes --no-wait
```
