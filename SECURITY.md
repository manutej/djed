# Security Policy

**Djed Infrastructure Security Policy**

This document outlines the security policy for the Djed project, including how to report vulnerabilities, supported versions, and our commitment to security.

---

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.1.x   | :white_check_mark: | Current release (Phase 1) |
| < 0.1.0 | :x:                | Pre-release, not supported |

**Update Policy**:
- Security patches are released as patch versions (e.g., 0.1.0 → 0.1.1)
- Critical vulnerabilities receive immediate patches
- High-severity vulnerabilities are patched within 7 days
- Medium/low vulnerabilities are included in regular releases

---

## Reporting a Vulnerability

We take security vulnerabilities seriously and appreciate responsible disclosure.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities via one of these methods:

1. **Email** (Preferred): Send details to **cetiaiservices@gmail.com**
   - Subject line: `[SECURITY] Djed Vulnerability Report`
   - Include: Package name, affected version, description, reproduction steps

2. **GitHub Security Advisories**: Use GitHub's private vulnerability reporting
   - Navigate to: `https://github.com/luxor/djed/security/advisories/new`
   - Fill out the advisory form with details

### What to Include

Please provide as much information as possible:

- **Package name**: Which Djed package is affected (logger, validator, mcp-base, cli, shared-types)
- **Version**: Affected version(s)
- **Description**: Clear description of the vulnerability
- **Impact**: What can an attacker do? What's the severity?
- **Reproduction**: Step-by-step instructions to reproduce
- **Proof of Concept**: If available, minimal PoC code
- **Suggested Fix**: If you have ideas for mitigation

### What to Expect

| Timeline | Action |
|----------|--------|
| Within 24 hours | Initial acknowledgment of your report |
| Within 3 days | Assessment and severity classification |
| Within 7 days | Fix developed and tested (for high/critical) |
| Within 14 days | Security patch released and advisory published |

**Severity Classification**:
- **Critical**: Remote code execution, privilege escalation
- **High**: Authentication bypass, sensitive data exposure
- **Medium**: Denial of service, information disclosure
- **Low**: Minor security improvements

---

## Security Measures

### Automated Scanning

Djed uses multiple automated security scanning tools:

1. **npm audit**: Checks for known vulnerabilities in dependencies
   - Runs on every PR and push to main
   - Fails CI on high/critical vulnerabilities

2. **Snyk**: Supply chain security analysis
   - Scans dependencies for vulnerabilities
   - Monitors for new vulnerabilities continuously
   - Uploads results to GitHub Code Scanning

3. **Dependency Review**: License and vulnerability checks
   - Runs on all pull requests
   - Blocks PRs with high-severity vulnerabilities
   - Enforces license policy (no GPL-2.0, GPL-3.0)

4. **Weekly Scheduled Scans**: Full security scan every Sunday at midnight UTC
   - Catches newly-disclosed vulnerabilities
   - Auto-creates GitHub issues on failures

### CI/CD Security

All Djed packages pass through:
- Automated security scanning (see above)
- TypeScript strict mode compilation
- Comprehensive test suites
- Code review before merge

### Dependency Policy

- We minimize dependencies to reduce attack surface
- All dependencies are reviewed before addition
- Dependencies are kept up-to-date
- We avoid dependencies with known security issues

---

## Security Best Practices

### For Users

When using Djed packages in your projects:

1. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

2. **Use Supported Versions**: Always use the latest supported version
   - Check [Supported Versions](#supported-versions) section above

3. **Enable Dependabot**: If using GitHub, enable Dependabot alerts
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
   ```

4. **Run Security Scans**: Integrate security scanning in your CI/CD
   ```bash
   npm audit --audit-level=high
   ```

5. **Review Ejection Paths**: If security is critical, review ejection paths
   - See `packages/cli/README.md` for ejection documentation
   - Use `djed eject <package>` to replace with raw dependencies

### For Contributors

If you're contributing to Djed:

1. **Never Commit Secrets**: No API keys, tokens, or credentials
2. **Review Dependencies**: Check security before adding new dependencies
3. **Follow TypeScript Best Practices**: Use strict mode, avoid `any`
4. **Test Security**: Include security test cases
5. **Document Security Implications**: Note any security-relevant changes in PRs

---

## Vulnerability Disclosure Policy

### Responsible Disclosure

We follow responsible disclosure practices:

1. **Private Disclosure**: Reporter discloses vulnerability privately
2. **Acknowledgment**: We acknowledge within 24 hours
3. **Assessment**: We assess and develop fix
4. **Coordinated Release**: We coordinate patch release with reporter
5. **Public Disclosure**: We publish security advisory after patch is available

### Public Disclosure Timeline

- **Critical/High**: Disclosed 14 days after patch release
- **Medium**: Disclosed 30 days after patch release
- **Low**: Disclosed in regular release notes

### Credit

We believe in giving credit where credit is due:

- Security researchers who report vulnerabilities responsibly will be credited in:
  - Security advisory (with permission)
  - CHANGELOG.md
  - GitHub release notes
- We support CVE assignment for significant vulnerabilities

---

## Known Security Considerations

### @djed/logger

- **Log Injection**: Always sanitize user input before logging
  ```typescript
  // ❌ Don't do this
  logger.info(userInput);

  // ✅ Do this
  logger.info('User action', { input: userInput });
  ```

- **Sensitive Data**: Never log passwords, API keys, or PII
  ```typescript
  // ❌ Don't do this
  logger.info('User login', { password: req.body.password });

  // ✅ Do this
  logger.info('User login', { username: req.body.username });
  ```

### @djed/validator

- **ReDoS**: Be cautious with complex regex patterns in schemas
  - Ajv has built-in ReDoS protection
  - Still review custom regex patterns

- **Schema Validation**: Always validate untrusted input
  ```typescript
  // ✅ Validate before processing
  const valid = validator.validate(schema, untrustedData);
  if (valid.ok) {
    // Safe to process valid.value
  }
  ```

### @djed/mcp-base

- **Input Validation**: Always validate MCP protocol messages
- **Authentication**: Implement authentication for production use
- **Rate Limiting**: Consider rate limiting for public-facing servers

### @djed/cli

- **Template Injection**: Templates use Handlebars with safe defaults
- **Command Injection**: User input is validated before shell execution
- **File System**: File operations are restricted to project directory

---

## Security Updates

### How to Stay Informed

Subscribe to security updates:

1. **Watch Repository**: Watch the Djed repository on GitHub for security advisories
2. **GitHub Security Advisories**: Enable GitHub security alerts
3. **npm Advisories**: npm will warn about known vulnerabilities when installing

### Applying Security Updates

When a security update is released:

```bash
# Update to latest patch version
npm update @djed/logger @djed/validator @djed/mcp-base @djed/cli @djed/shared-types

# Or update specific package
npm install @djed/logger@latest

# Verify no vulnerabilities
npm audit
```

---

## Contact

**Security Team**: cetiaiservices@gmail.com

**Response Time**:
- Critical vulnerabilities: 24 hours
- High vulnerabilities: 3 days
- Medium/Low vulnerabilities: 7 days

**PGP Key**: Available upon request

---

## Additional Resources

- [NPM Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk Vulnerability Database](https://snyk.io/vuln)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-04 | Initial security policy for Djed v0.1.0 |

---

**Last Updated**: 2025-11-04
**Policy Version**: 1.0
**Djed Version**: 0.1.0
