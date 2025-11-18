# GitHub Actions Template

CI/CD workflows for MCP servers.

## Workflows

### CI (`ci.yml`)

Runs on every push and pull request:

1. **Lint**: ESLint validation
2. **Build**: TypeScript compilation
3. **Test**: Run test suite
4. **Type Check**: TypeScript type checking

### Release (`release.yml`)

Triggered on version tags (`v*.*.*`):

1. **Create Release**: GitHub release with notes
2. **Publish Docker**: Push to Docker Hub
3. **Publish npm** (optional): Publish to npm registry

### Docker (`docker.yml`)

Builds and scans Docker images:

1. **Build**: Multi-stage Docker build
2. **Scan**: Security scan with Trivy
3. **Push**: Push to Docker Hub (on main branch)

## Setup

### 1. Copy Workflows

Copy `.github/workflows/` to your project root.

### 2. Configure Secrets

Add these secrets to your GitHub repository:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or token
- `NPM_TOKEN` (optional): npm authentication token

Go to: Repository Settings → Secrets and variables → Actions → New repository secret

### 3. Customize

Replace placeholders in workflow files:

- `{{DOCKER_USERNAME}}`: Your Docker Hub username
- `{{PROJECT_NAME}}`: Your project name

## Usage

### Continuous Integration

CI runs automatically on:

- Push to `main` or `develop`
- Pull requests to `main` or `develop`

### Creating a Release

```bash
# Tag a version
git tag v1.0.0
git push origin v1.0.0

# This triggers:
# - GitHub release creation
# - Docker image build and push
# - (Optional) npm package publish
```

### Version Format

Use semantic versioning: `v{major}.{minor}.{patch}`

Examples:
- `v1.0.0` - Initial release
- `v1.1.0` - New features
- `v1.1.1` - Bug fixes

### Docker Tags

Docker images are tagged with:

- `latest` - Latest release
- `v1.0.0` - Specific version
- `v1.0` - Minor version
- `v1` - Major version
- `main-abc1234` - Commit SHA on main branch

## Customization

### Add Code Coverage

Uncomment in `ci.yml`:

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

Add `CODECOV_TOKEN` secret.

### Publish to npm

Uncomment the `publish-npm` job in `release.yml` and add `NPM_TOKEN` secret.

### Matrix Testing

Test on multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]
```

### Deploy to Cloud

Add deployment jobs:

```yaml
deploy:
  name: Deploy to Production
  needs: release
  runs-on: ubuntu-latest
  steps:
    - name: Deploy
      run: |
        # Your deployment commands
```

## Best Practices

1. **Cache dependencies**: Uses `actions/cache` for npm
2. **Artifacts**: Shares build artifacts between jobs
3. **Security scanning**: Trivy scans Docker images
4. **Automated releases**: Triggered by git tags
5. **Matrix testing** (optional): Test on multiple versions

## Debugging

View workflow runs:
- Go to Actions tab in GitHub repository
- Click on a workflow run to see logs
- Re-run failed jobs if needed

## Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy-action)
