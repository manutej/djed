# Parallel Build Specification: TextMate + Khepri

**HEKAT Level 3**: Balanced orchestration with clear specifications
**Created**: 2025-11-03
**Strategy**: Parallel development with shared patterns, independent execution

---

## Executive Summary

**Goal**: Build TextMate and Khepri MCP servers in parallel with maximum code reuse and minimal duplication.

**Approach**:
- **Phase 1**: Shared infrastructure (TypeScript setup, MCP skeleton, Docker patterns)
- **Phase 2**: Parallel implementation (TextMate messaging, Khepri workflows)
- **Phase 3**: Independent finalization (project-specific features)

**Agents Required**: 6 total (3 shared, 2 for TextMate, 2 for Khepri, 1 orchestrator)

**Timeline**: 2 weeks for both projects

---

## Phase 1: Shared Infrastructure (Days 1-2)

### Goal
Create reusable patterns and templates that both projects can leverage.

### Deliverables

#### 1. TypeScript/Node.js Template
**Agent**: `practical-programmer`
**Output**: `shared/typescript-mcp-template/`

**Specification**:
```typescript
// Shared MCP server template structure
shared/typescript-mcp-template/
├── package.json                 # Base dependencies
├── tsconfig.json               # Strict TypeScript config
├── .eslintrc.js                # Linting rules
├── .prettierrc                 # Code formatting
├── src/
│   ├── index.ts                # Main entry point
│   ├── server.ts               # MCP server base class
│   ├── types/                  # Shared type definitions
│   │   ├── mcp.ts              # MCP protocol types
│   │   └── config.ts           # Configuration types
│   ├── utils/                  # Shared utilities
│   │   ├── logger.ts           # Winston logger
│   │   ├── validator.ts        # JSON schema validation
│   │   └── error.ts            # Error handling
│   └── mcp/
│       ├── protocol.ts         # MCP protocol implementation
│       ├── tools.ts            # Tool registration
│       └── handlers.ts         # Request handlers
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
└── scripts/
    ├── build.sh                # Build script
    └── test.sh                 # Test script
```

**Dependencies**:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "express": "^4.18.2",
    "winston": "^3.11.0",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.0.4",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

**Success Criteria**:
- ✅ TypeScript compiles with strict mode
- ✅ Basic MCP server starts on port 3000
- ✅ Health check endpoint responds
- ✅ Example tool registered and callable

---

#### 2. Docker Template
**Agent**: `deployment-orchestrator`
**Output**: `shared/docker-template/`

**Specification**:
```dockerfile
# Multi-stage Dockerfile template
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**docker-compose.yml template**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=${LOG_LEVEL:-info}
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Success Criteria**:
- ✅ Docker image builds successfully
- ✅ Container starts and passes health check
- ✅ Logs visible via `docker-compose logs`
- ✅ Environment variables work correctly

---

#### 3. GitHub Repository Template
**Agent**: `devops-github-expert`
**Output**: GitHub Actions workflows, templates

**Specification**:
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  docker:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: ${{ github.repository }}:latest
```

**Repository Files**:
```
.github/
├── workflows/
│   ├── ci.yml                  # Continuous integration
│   └── release.yml             # Release automation
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
.gitignore
LICENSE (MIT)
CONTRIBUTING.md
CODE_OF_CONDUCT.md
```

**Success Criteria**:
- ✅ CI runs on push/PR
- ✅ Tests pass in GitHub Actions
- ✅ Docker build succeeds
- ✅ Issue templates work

---

## Phase 2: Parallel Project Implementation (Days 3-10)

### Strategy
**Two independent tracks running in parallel**, each with dedicated agents.

---

### Track A: TextMate Implementation

#### Agent Team
1. **Primary**: `practical-programmer` (MCP server + n8n integration)
2. **Support**: `frontend-architect` (template engine)

#### Specification

##### 1. Project Setup (Day 3)
**Task**: Initialize TextMate from shared template

```bash
# Initialize from template
cp -r shared/typescript-mcp-template textmate/
cd textmate

# Update package.json
{
  "name": "textmate-mcp",
  "version": "0.1.0",
  "description": "Homegrown messaging automation powered by n8n",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}

# Install TextMate-specific dependencies
npm install handlebars better-sqlite3 @types/better-sqlite3
```

**Success Criteria**:
- ✅ TextMate project compiles
- ✅ Dev server runs with hot reload
- ✅ Tests pass (empty test suite initially)

---

##### 2. Contact Management (Day 4)
**Agent**: `practical-programmer`
**Output**: `src/contacts/`

**Specification**:
```typescript
// src/contacts/db.ts
import Database from 'better-sqlite3';

export interface Contact {
  id: string;
  phone: string;        // E.164 format
  nickname?: string;    // Key differentiator!
  firstName?: string;
  lastName?: string;
  tags: string[];
  customFields: Record<string, any>;
  optedIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT,
        first_name TEXT,
        last_name TEXT,
        tags TEXT, -- JSON array
        custom_fields TEXT, -- JSON object
        opted_in INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_phone ON contacts(phone);
      CREATE INDEX IF NOT EXISTS idx_nickname ON contacts(nickname);
    `);
  }

  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO contacts (id, phone, nickname, first_name, last_name, tags, custom_fields, opted_in, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      contact.phone,
      contact.nickname,
      contact.firstName,
      contact.lastName,
      JSON.stringify(contact.tags),
      JSON.stringify(contact.customFields),
      contact.optedIn ? 1 : 0,
      now,
      now
    );

    return this.getContact(id)!;
  }

  getContact(id: string): Contact | null {
    const row = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    return row ? this.rowToContact(row) : null;
  }

  getContactByPhone(phone: string): Contact | null {
    const row = this.db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
    return row ? this.rowToContact(row) : null;
  }

  private rowToContact(row: any): Contact {
    return {
      id: row.id,
      phone: row.phone,
      nickname: row.nickname,
      firstName: row.first_name,
      lastName: row.last_name,
      tags: JSON.parse(row.tags),
      customFields: JSON.parse(row.custom_fields),
      optedIn: row.opted_in === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
```

**Tests**:
```typescript
// tests/contacts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ContactDB } from '../src/contacts/db';

describe('ContactDB', () => {
  let db: ContactDB;

  beforeEach(() => {
    db = new ContactDB(':memory:');
  });

  it('should add contact with nickname', () => {
    const contact = db.addContact({
      phone: '+1234567890',
      nickname: 'Alex',
      firstName: 'Alexander',
      lastName: 'Smith',
      tags: ['customer'],
      customFields: {},
      optedIn: true
    });

    expect(contact.nickname).toBe('Alex');
    expect(contact.phone).toBe('+1234567890');
  });

  it('should retrieve contact by phone', () => {
    db.addContact({
      phone: '+1234567890',
      nickname: 'Alex',
      tags: [],
      customFields: {},
      optedIn: true
    });

    const contact = db.getContactByPhone('+1234567890');
    expect(contact?.nickname).toBe('Alex');
  });
});
```

**Success Criteria**:
- ✅ SQLite database created with schema
- ✅ CRUD operations work
- ✅ Nickname field properly indexed
- ✅ All tests pass

---

##### 3. Template Engine (Day 5)
**Agent**: `frontend-architect`
**Output**: `src/templates/`

**Specification**:
```typescript
// src/templates/engine.ts
import Handlebars from 'handlebars';

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Custom helper: truncate
    this.handlebars.registerHelper('truncate', (str: string, len: number) => {
      if (str.length <= len) return str;
      return str.substring(0, len) + '...';
    });

    // Custom helper: formatPhone
    this.handlebars.registerHelper('formatPhone', (phone: string) => {
      // +1234567890 → (123) 456-7890
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11 && cleaned[0] === '1') {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
      }
      return phone;
    });
  }

  render(template: string, variables: TemplateVariables): string {
    const compiled = this.handlebars.compile(template);
    return compiled(variables);
  }

  validate(template: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}
```

**Default Templates**:
```handlebars
<!-- templates/welcome.hbs -->
Hey {{nickname}}! 👋

Welcome to our service. We're excited to have you here!

{{#if referralCode}}
Your referral code: {{referralCode}}
{{/if}}

Questions? Just reply to this message.

Thanks,
The Team
```

```handlebars
<!-- templates/order-ready.hbs -->
Hey {{nickname}}! 🎉

Your order #{{order_id}} is ready for pickup.

{{#if pickup_location}}
Location: {{pickup_location}}
{{/if}}

Thanks for your business!
```

**Tests**:
```typescript
// tests/templates.test.ts
import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../src/templates/engine';

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  it('should render simple template with variables', () => {
    const result = engine.render('Hey {{nickname}}!', { nickname: 'Alex' });
    expect(result).toBe('Hey Alex!');
  });

  it('should use truncate helper', () => {
    const result = engine.render('{{truncate text 10}}', {
      text: 'This is a very long message'
    });
    expect(result).toBe('This is a ...');
  });

  it('should validate template syntax', () => {
    const valid = engine.validate('Hey {{nickname}}!');
    expect(valid.valid).toBe(true);

    const invalid = engine.validate('Hey {{#if}}!'); // Missing condition
    expect(invalid.valid).toBe(false);
  });
});
```

**Success Criteria**:
- ✅ Handlebars templates render correctly
- ✅ Custom helpers work
- ✅ Template validation catches errors
- ✅ Default templates load

---

##### 4. n8n Integration (Day 6-7)
**Agent**: `practical-programmer`
**Output**: `src/n8n/`

**Specification**:
```typescript
// src/n8n/client.ts
import axios, { AxiosInstance } from 'axios';

export interface N8NConfig {
  url: string;
  username?: string;
  password?: string;
}

export interface WorkflowTrigger {
  workflowId: string;
  data: Record<string, any>;
}

export class N8NClient {
  private client: AxiosInstance;

  constructor(config: N8NConfig) {
    this.client = axios.create({
      baseURL: config.url,
      auth: config.username && config.password ? {
        username: config.username,
        password: config.password
      } : undefined
    });
  }

  async triggerWorkflow(trigger: WorkflowTrigger): Promise<{ executionId: string }> {
    const response = await this.client.post(
      `/webhook/${trigger.workflowId}`,
      trigger.data
    );

    return {
      executionId: response.data.executionId || 'webhook-triggered'
    };
  }

  async getWorkflows(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get('/workflows');
    return response.data.data.map((w: any) => ({
      id: w.id,
      name: w.name
    }));
  }

  async getExecutionStatus(executionId: string): Promise<{
    status: 'running' | 'success' | 'error';
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/executions/${executionId}`);
      return {
        status: response.data.finished ? 'success' : 'running'
      };
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message
      };
    }
  }
}
```

**Success Criteria**:
- ✅ Can connect to n8n instance
- ✅ Webhook trigger works
- ✅ Execution status retrieval works
- ✅ Error handling for network issues

---

##### 5. MCP Tools Implementation (Day 8-9)
**Agent**: `practical-programmer`
**Output**: `src/mcp/tools.ts`

**Specification**:
```typescript
// src/mcp/tools.ts
import { Tool } from '@modelcontextprotocol/sdk';

export const textmateTools: Tool[] = [
  {
    name: 'textmate__send_sms',
    description: 'Send SMS message with template rendering',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Phone number in E.164 format (e.g., +1234567890)'
        },
        template: {
          type: 'string',
          description: 'Template name or inline template string'
        },
        variables: {
          type: 'object',
          description: 'Variables for template rendering',
          additionalProperties: true
        }
      },
      required: ['to', 'template']
    }
  },
  {
    name: 'textmate__send_batch',
    description: 'Send batch messages with rate limiting',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          enum: ['sms', 'whatsapp'],
          description: 'Messaging channel'
        },
        template: {
          type: 'string',
          description: 'Template name or inline string'
        },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              variables: { type: 'object', additionalProperties: true }
            },
            required: ['phone']
          }
        },
        rateLimitPerSecond: {
          type: 'number',
          description: 'Messages per second (default: 10)',
          default: 10
        }
      },
      required: ['channel', 'template', 'contacts']
    }
  },
  {
    name: 'textmate__add_contact',
    description: 'Add or update contact with nickname',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        nickname: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        customFields: { type: 'object', additionalProperties: true }
      },
      required: ['phone']
    }
  }
  // ... more tools
];
```

**Tool Handlers**:
```typescript
// src/mcp/handlers.ts
import { ContactDB } from '../contacts/db';
import { TemplateEngine } from '../templates/engine';
import { N8NClient } from '../n8n/client';

export class TextMateHandlers {
  constructor(
    private contactDB: ContactDB,
    private templateEngine: TemplateEngine,
    private n8nClient: N8NClient
  ) {}

  async handleSendSMS(params: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 1. Get or enrich contact
      let contact = this.contactDB.getContactByPhone(params.to);

      // 2. Merge variables with contact data
      const variables = {
        ...params.variables,
        nickname: contact?.nickname || 'there'
      };

      // 3. Render template
      const message = this.templateEngine.render(params.template, variables);

      // 4. Trigger n8n workflow
      const result = await this.n8nClient.triggerWorkflow({
        workflowId: 'sms-send',
        data: {
          to: params.to,
          message
        }
      });

      return {
        success: true,
        messageId: result.executionId
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async handleSendBatch(params: any): Promise<{ success: boolean; batchId?: string; error?: string }> {
    // Rate-limited batch sending
    const rateLimitMs = 1000 / (params.rateLimitPerSecond || 10);
    const results = [];

    for (const contact of params.contacts) {
      await this.handleSendSMS({
        to: contact.phone,
        template: params.template,
        variables: contact.variables
      });

      await new Promise(resolve => setTimeout(resolve, rateLimitMs));
    }

    return {
      success: true,
      batchId: crypto.randomUUID()
    };
  }

  async handleAddContact(params: any): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
      const contact = this.contactDB.addContact({
        phone: params.phone,
        nickname: params.nickname,
        firstName: params.firstName,
        lastName: params.lastName,
        tags: params.tags || [],
        customFields: params.customFields || {},
        optedIn: true
      });

      return {
        success: true,
        contactId: contact.id
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}
```

**Success Criteria**:
- ✅ All 6 MCP tools registered
- ✅ Tool handlers work correctly
- ✅ Contact enrichment happens automatically
- ✅ Template rendering integrates seamlessly
- ✅ n8n workflows triggered successfully

---

##### 6. Docker & GitHub Setup (Day 10)
**Agent**: `deployment-orchestrator` + `devops-github-expert`

**Tasks**:
1. Copy Docker template to TextMate
2. Customize docker-compose.yml for TextMate + n8n + Redis
3. Create .env.example with TextMate-specific variables
4. Initialize Git repository
5. Push to GitHub with CI workflow

**Success Criteria**:
- ✅ Docker Compose starts all services
- ✅ TextMate connects to n8n
- ✅ GitHub CI passes
- ✅ README has quick start instructions

---

### Track B: Khepri Implementation

#### Agent Team
1. **Primary**: `api-architect` (MCP server + workflow adapters)
2. **Support**: `practical-programmer` (transformation engine)

#### Specification

##### 1. Project Setup (Day 3)
**Task**: Initialize Khepri from shared template

```bash
# Initialize from template
cp -r shared/typescript-mcp-template khepri/
cd khepri

# Update package.json
{
  "name": "khepri-mcp",
  "version": "0.1.0",
  "description": "Universal MCP-to-Workflow Bridge",
  "main": "dist/index.js"
}

# Install Khepri-specific dependencies
npm install ajv axios pg redis zod
npm install @types/pg --save-dev
```

**Success Criteria**:
- ✅ Khepri project compiles
- ✅ Dev server runs
- ✅ Basic health check works

---

##### 2. Schema Transformation Engine (Day 4-5)
**Agent**: `practical-programmer`
**Output**: `src/transformers/`

**Specification**:
```typescript
// src/transformers/schema.ts
import Ajv, { JSONSchemaType } from 'ajv';

export interface SchemaMapping {
  source: JSONSchemaType<any>;
  target: JSONSchemaType<any>;
  transformations: Array<{
    from: string;
    to: string;
    transform?: (value: any) => any;
  }>;
}

export class SchemaTransformer {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv();
  }

  validate(data: any, schema: JSONSchemaType<any>): { valid: boolean; errors?: string[] } {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`) || []
      };
    }

    return { valid: true };
  }

  transform(data: any, mapping: SchemaMapping): any {
    const result: any = {};

    for (const { from, to, transform } of mapping.transformations) {
      const value = this.getNestedValue(data, from);
      const transformed = transform ? transform(value) : value;
      this.setNestedValue(result, to, transformed);
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((curr, key) => {
      if (!curr[key]) curr[key] = {};
      return curr[key];
    }, obj);
    target[lastKey] = value;
  }
}
```

**Tests**:
```typescript
// tests/transformer.test.ts
import { describe, it, expect } from 'vitest';
import { SchemaTransformer } from '../src/transformers/schema';

describe('SchemaTransformer', () => {
  const transformer = new SchemaTransformer();

  it('should transform nested data', () => {
    const data = {
      user: { email: 'test@example.com', name: 'Alex' }
    };

    const mapping = {
      source: {},
      target: {},
      transformations: [
        { from: 'user.email', to: 'email' },
        { from: 'user.name', to: 'full_name', transform: (v: string) => v.toUpperCase() }
      ]
    };

    const result = transformer.transform(data, mapping);

    expect(result.email).toBe('test@example.com');
    expect(result.full_name).toBe('ALEX');
  });
});
```

**Success Criteria**:
- ✅ JSON schema validation works
- ✅ Nested transformations work
- ✅ Custom transform functions apply
- ✅ All tests pass

---

##### 3. Platform Adapters (Day 6-7)
**Agent**: `api-architect`
**Output**: `src/adapters/`

**Specification**:
```typescript
// src/adapters/base.ts
export interface WorkflowExecution {
  executionId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export abstract class WorkflowAdapter {
  abstract triggerWorkflow(params: {
    workflowId: string;
    data: Record<string, any>;
  }): Promise<WorkflowExecution>;

  abstract getExecutionStatus(executionId: string): Promise<WorkflowExecution>;

  abstract listWorkflows(): Promise<Array<{ id: string; name: string }>>;
}
```

```typescript
// src/adapters/n8n.ts
import axios, { AxiosInstance } from 'axios';
import { WorkflowAdapter, WorkflowExecution } from './base';

export class N8NAdapter extends WorkflowAdapter {
  private client: AxiosInstance;

  constructor(config: { url: string; apiKey?: string }) {
    super();
    this.client = axios.create({
      baseURL: config.url,
      headers: config.apiKey ? {
        'X-N8N-API-KEY': config.apiKey
      } : {}
    });
  }

  async triggerWorkflow(params: {
    workflowId: string;
    data: Record<string, any>;
  }): Promise<WorkflowExecution> {
    const response = await this.client.post(
      `/webhook/${params.workflowId}`,
      params.data
    );

    return {
      executionId: response.data.executionId || crypto.randomUUID(),
      status: 'running'
    };
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    try {
      const response = await this.client.get(`/executions/${executionId}`);
      return {
        executionId,
        status: response.data.finished ? 'success' : 'running'
      };
    } catch (error) {
      return {
        executionId,
        status: 'error',
        error: (error as Error).message
      };
    }
  }

  async listWorkflows(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get('/workflows');
    return response.data.data.map((w: any) => ({
      id: w.id,
      name: w.name
    }));
  }
}
```

```typescript
// src/adapters/zapier.ts
import { WorkflowAdapter, WorkflowExecution } from './base';

export class ZapierAdapter extends WorkflowAdapter {
  constructor(private webhookUrls: Map<string, string>) {
    super();
  }

  async triggerWorkflow(params: {
    workflowId: string;
    data: Record<string, any>;
  }): Promise<WorkflowExecution> {
    const webhookUrl = this.webhookUrls.get(params.workflowId);
    if (!webhookUrl) {
      throw new Error(`Workflow ${params.workflowId} not configured`);
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.data)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.statusText}`);
    }

    return {
      executionId: crypto.randomUUID(),
      status: 'success' // Zapier webhooks don't return execution tracking
    };
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    // Zapier doesn't provide execution status via webhook
    return {
      executionId,
      status: 'success'
    };
  }

  async listWorkflows(): Promise<Array<{ id: string; name: string }>> {
    // Return configured webhooks
    return Array.from(this.webhookUrls.entries()).map(([id, url]) => ({
      id,
      name: id
    }));
  }
}
```

**Success Criteria**:
- ✅ n8n adapter triggers workflows
- ✅ Zapier adapter sends webhooks
- ✅ Make adapter works (similar to Zapier)
- ✅ All adapters implement same interface

---

##### 4. MCP Tools Implementation (Day 8-9)
**Agent**: `api-architect`
**Output**: `src/mcp/tools.ts`

**Specification**:
```typescript
// src/mcp/tools.ts
export const khepriTools: Tool[] = [
  {
    name: 'khepri__trigger_workflow',
    description: 'Trigger a workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['n8n', 'zapier', 'make'],
          description: 'Workflow platform'
        },
        workflowId: {
          type: 'string',
          description: 'Workflow identifier'
        },
        data: {
          type: 'object',
          description: 'Data to pass to workflow',
          additionalProperties: true
        }
      },
      required: ['platform', 'workflowId', 'data']
    }
  },
  {
    name: 'khepri__list_workflows',
    description: 'List available workflows',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['n8n', 'zapier', 'make'],
          description: 'Platform to list workflows from (optional)'
        }
      }
    }
  },
  {
    name: 'khepri__get_execution_status',
    description: 'Check workflow execution status',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'Execution ID to check'
        }
      },
      required: ['executionId']
    }
  }
];
```

**Tool Handlers**:
```typescript
// src/mcp/handlers.ts
import { N8NAdapter } from '../adapters/n8n';
import { ZapierAdapter } from '../adapters/zapier';
import { SchemaTransformer } from '../transformers/schema';

export class KhepriHandlers {
  private adapters: Map<string, WorkflowAdapter>;
  private transformer: SchemaTransformer;

  constructor() {
    this.adapters = new Map();
    this.transformer = new SchemaTransformer();

    // Initialize adapters from config
    this.setupAdapters();
  }

  private setupAdapters(): void {
    const n8nUrl = process.env.N8N_URL;
    if (n8nUrl) {
      this.adapters.set('n8n', new N8NAdapter({
        url: n8nUrl,
        apiKey: process.env.N8N_API_KEY
      }));
    }

    // Setup Zapier webhooks from config
    const zapierWebhooks = new Map<string, string>();
    // Load from config file or env vars
    this.adapters.set('zapier', new ZapierAdapter(zapierWebhooks));
  }

  async handleTriggerWorkflow(params: any): Promise<{
    success: boolean;
    executionId?: string;
    error?: string;
  }> {
    try {
      const adapter = this.adapters.get(params.platform);
      if (!adapter) {
        throw new Error(`Platform ${params.platform} not configured`);
      }

      const result = await adapter.triggerWorkflow({
        workflowId: params.workflowId,
        data: params.data
      });

      return {
        success: true,
        executionId: result.executionId
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async handleListWorkflows(params: any): Promise<{
    workflows: Array<{ platform: string; id: string; name: string }>;
  }> {
    const allWorkflows: Array<{ platform: string; id: string; name: string }> = [];

    if (params.platform) {
      const adapter = this.adapters.get(params.platform);
      if (adapter) {
        const workflows = await adapter.listWorkflows();
        allWorkflows.push(...workflows.map(w => ({
          platform: params.platform,
          ...w
        })));
      }
    } else {
      // List from all platforms
      for (const [platform, adapter] of this.adapters.entries()) {
        const workflows = await adapter.listWorkflows();
        allWorkflows.push(...workflows.map(w => ({
          platform,
          ...w
        })));
      }
    }

    return { workflows: allWorkflows };
  }

  async handleGetExecutionStatus(params: any): Promise<{
    executionId: string;
    status: string;
    error?: string;
  }> {
    // Try all adapters to find execution
    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.getExecutionStatus(params.executionId);
        return result;
      } catch (error) {
        continue;
      }
    }

    return {
      executionId: params.executionId,
      status: 'unknown',
      error: 'Execution not found in any platform'
    };
  }
}
```

**Success Criteria**:
- ✅ All 3 MCP tools registered
- ✅ Can trigger workflows on multiple platforms
- ✅ List workflows works
- ✅ Execution status tracking works

---

##### 5. Docker & GitHub Setup (Day 10)
**Agent**: `deployment-orchestrator` + `devops-github-expert`

**Tasks**:
1. Copy Docker template to Khepri
2. Customize docker-compose.yml for Khepri + PostgreSQL + Redis
3. Create .env.example with Khepri-specific variables
4. Initialize Git repository
5. Push to GitHub with CI workflow

**Success Criteria**:
- ✅ Docker Compose starts all services
- ✅ Khepri connects to database
- ✅ GitHub CI passes
- ✅ README has quick start instructions

---

## Phase 3: Integration & Testing (Days 11-14)

### Both Projects

#### Testing Strategy
**Agent**: `test-engineer`

**Specification**:
```typescript
// Shared test patterns

// Unit tests
tests/unit/
  ├── contacts.test.ts         (TextMate)
  ├── templates.test.ts        (TextMate)
  ├── transformers.test.ts     (Khepri)
  └── adapters.test.ts         (Khepri)

// Integration tests
tests/integration/
  ├── mcp-server.test.ts       (Both)
  ├── n8n-integration.test.ts  (TextMate)
  └── workflow-trigger.test.ts (Khepri)

// E2E tests
tests/e2e/
  ├── send-message.test.ts     (TextMate)
  └── trigger-workflow.test.ts (Khepri)
```

**Coverage Goals**:
- Unit tests: >80% coverage
- Integration tests: Critical paths covered
- E2E tests: Happy path + error scenarios

---

#### Documentation
**Agent**: `docs-generator`

**Deliverables**:
1. API documentation (JSDoc → generated docs)
2. User guides (Quick Start, Configuration, API Reference)
3. Contributing guidelines
4. Code of conduct
5. Examples directory with sample code

---

#### GitHub Setup
**Agent**: `devops-github-expert`

**Tasks**:
1. Create GitHub organizations (optional) or personal repos
2. Set up branch protection rules
3. Configure GitHub Actions secrets
4. Add issue/PR templates
5. Set up project boards
6. Create initial releases (v0.1.0)

---

## Success Criteria

### TextMate
- ✅ Can send SMS via n8n + Twilio
- ✅ Templates render with nicknames
- ✅ Contacts stored in SQLite
- ✅ Batch sending works with rate limiting
- ✅ Docker Compose starts all services
- ✅ GitHub CI passes
- ✅ README has clear quick start

### Khepri
- ✅ Can trigger n8n workflows
- ✅ Can trigger Zapier workflows
- ✅ Schema transformation works
- ✅ Execution status tracking works
- ✅ Docker Compose starts all services
- ✅ GitHub CI passes
- ✅ Documentation site live

---

## Agent Orchestration Summary

### Parallel Execution Matrix

| Day | TextMate Track | Khepri Track | Shared |
|-----|----------------|--------------|--------|
| 1-2 | - | - | **Infrastructure setup** (3 agents) |
| 3 | **Project init** (1 agent) | **Project init** (1 agent) | - |
| 4 | **Contact DB** (1 agent) | **Schema transformer** (1 agent) | - |
| 5 | **Template engine** (1 agent) | **Schema transformer** (1 agent) | - |
| 6-7 | **n8n integration** (1 agent) | **Platform adapters** (1 agent) | - |
| 8-9 | **MCP tools** (1 agent) | **MCP tools** (1 agent) | - |
| 10 | **Docker/GitHub** (2 agents) | **Docker/GitHub** (2 agents) | - |
| 11-14 | **Testing/docs** (2 agents) | **Testing/docs** (2 agents) | - |

**Total Agents**: 6 unique
**Peak Parallelization**: Days 4-9 (2 tracks running simultaneously)

---

## Token Budget Estimate

### Phase 1 (Infrastructure)
- TypeScript template: 1,500 tokens
- Docker template: 800 tokens
- GitHub template: 600 tokens
**Subtotal**: ~3,000 tokens

### Phase 2 (Implementation)

**TextMate Track**:
- Contact DB: 1,200 tokens
- Template engine: 1,000 tokens
- n8n integration: 1,500 tokens
- MCP tools: 1,800 tokens
**Subtotal**: ~5,500 tokens

**Khepri Track**:
- Schema transformer: 1,500 tokens
- Platform adapters: 2,000 tokens
- MCP tools: 1,800 tokens
**Subtotal**: ~5,300 tokens

### Phase 3 (Testing/Docs)
- Testing: 2,000 tokens
- Documentation: 1,500 tokens
- GitHub setup: 800 tokens
**Subtotal**: ~4,300 tokens

**TOTAL ESTIMATED**: ~18,000 tokens (well within budget)

---

## Risk Mitigation

### Risks

1. **n8n webhook complexity**
   - Mitigation: Start with simple webhook, iterate
   - Fallback: Use n8n REST API

2. **MCP protocol changes**
   - Mitigation: Lock to specific SDK version
   - Monitor: Watch MCP SDK releases

3. **Parallel development conflicts**
   - Mitigation: Clear separation of concerns
   - Solution: Shared infrastructure first

4. **Time underestimation**
   - Mitigation: Buffer days built in (14 days vs 10)
   - Fallback: Reduce scope, launch with core features

---

## Next Steps

### Immediate (Next 5 minutes)
1. Confirm this specification
2. Choose which project to start first (or both in parallel)
3. Allocate first agents

### Today (Next 2 hours)
1. Create shared TypeScript template
2. Set up Docker template
3. Initialize both Git repositories

### This Week
1. Complete Phase 1 (infrastructure)
2. Begin Phase 2 (parallel implementation)
3. Daily standups to sync progress

---

**Status**: Specification ready for approval ✅
**Agent Orchestration**: Optimized for parallel execution
**Token Budget**: Conservative estimate (18K / 200K available)
**Timeline**: 14 days to production-ready v0.1.0

**Awaiting approval to proceed with agent orchestration...**
