# Azure DevOps Capacity Planning Extension 

### Development

```shell
npm install
npm run start:dev
```

### Deploying to Marketplace

#### Dev

```shell
npm run compile:dev
tfx extension publish --manifest-globs vss-extension.json --overrides-file configs/dev.json --token [token]
```

#### Release

```shell
npm run compile
tfx extension publish --manifest-globs vss-extension.json --overrides-file configs/release.json --token [token]
```