# Azure DevOps Capacity Planning Extension 

### Development

```shell
npm install
npm run start:dev
```

### Deploying to Marketplace

```shell
tfx extension publish --manifest-globs vss-extension.json --overrides-file configs/dev.json --token [token]
```