# VS Code Setup Guide for TexQtic Platform

## 🎯 Tech Stack

- **Frontend**: React 19 + TypeScript 5.2
- **Build Tool**: Vite 5.3
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **AI**: Google Gemini API

---

## ✅ Installed Extensions

### Core Development

✅ **ES7+ React/Redux/React-Native snippets** (`dsznajder.es7-react-js-snippets`)

- React component snippets (rfce, rafce, etc.)

✅ **TypeScript** (`ms-vscode.vscode-typescript-next`)

- Enhanced TypeScript & JavaScript support

✅ **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)

- Autocomplete, syntax highlighting, linting for Tailwind

### Code Quality

✅ **ESLint** (`dbaeumer.vscode-eslint`)

- JavaScript/TypeScript linting

✅ **Prettier** (`esbenp.prettier-vscode`)

- Code formatting

✅ **Error Lens** (`usernamehw.errorlens`)

- Inline error/warning display

✅ **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`)

- Better error messages

### Productivity

✅ **Auto Rename Tag** (`formulahendry.auto-rename-tag`)

- Auto rename paired HTML/JSX tags

✅ **Auto Close Tag** (`formulahendry.auto-close-tag`)

- Auto close HTML/JSX tags

✅ **Path Intellisense** (`christian-kohler.path-intellisense`)

- Autocomplete filenames

✅ **npm Intellisense** (`christian-kohler.npm-intellisense`)

- Autocomplete npm modules

✅ **Import Cost** (`wix.vscode-import-cost`)

- Display import package size

### Tools

✅ **Vite** (`antfu.vite`)

- Vite integration & commands

✅ **Console Ninja** (`wallabyjs.console-ninja`)

- Enhanced console.log debugging

✅ **DotEnv** (`mikestead.dotenv`)

- .env file syntax highlighting

### Git & Version Control

✅ **GitLens** (`eamodio.gitlens`)

- **Powerful Git visualization and insights**
- Inline blame annotations (see who changed each line)
- File/line history exploration
- Compare branches, commits, and files
- Rich commit search and graph visualization
- Seamless navigation through Git history
- **Most popular Git extension** with 28M+ downloads

✅ **Git History** (`donjayamanne.githistory`)

- View and search Git log
- View file history with diffs
- Compare branches and commits
- Cherry-pick commits
- View commit details and graphs

### GitHub Integration

✅ **GitHub Pull Requests** (`github.vscode-pull-request-github`)

- Create, review, and manage pull requests directly in VS Code

✅ **GitHub Copilot Chat** (`github.copilot-chat`)

- AI-powered code assistance and chat

✅ **GitHub Actions** (`github.vscode-github-actions`)

- Manage and debug GitHub Actions workflows

### Testing & Quality Assurance

✅ **Vitest Explorer** (`vitest.explorer`)

- **Interactive test runner for Vitest**
- Run/debug individual tests from sidebar
- View test results inline
- Code coverage visualization
- Watch mode support

✅ **Playwright Test** (`ms-playwright.playwright`)

- **E2E testing framework**
- Record and generate tests
- Debug tests with breakpoints
- View test results and traces
- Cross-browser testing support

✅ **Azure Load Testing** (`ms-azure-load-testing.microsoft-testing`)

- Performance and load testing
- Stress test your APIs

✅ **Coverage Gutters** (`ryanluker.vscode-coverage-gutters`)

- Display test coverage in gutter
- Highlight covered/uncovered lines
- Works with Vitest, Jest, Istanbul

✅ **Jest** (`orta.vscode-jest`)

- Jest test runner integration
- Auto-run tests on save
- Inline test results

### Backend & Database

✅ **Prisma** (`prisma.prisma`)

- **ORM for Node.js & TypeScript**
- Schema syntax highlighting
- Auto-completion for Prisma Client
- Format schema on save
- Database introspection
- Migration support

✅ **Supabase** (`supabase.vscode-supabase-extension`)

- **Complete Supabase integration**
- Connect to Supabase projects
- Run SQL queries
- Manage database tables
- View real-time data

✅ **Supabase Snippets** (`supabase-snippets.supabase-javascript-snippets`)

- Code snippets for Supabase SDK
- Auth, database, storage snippets

✅ **PostgresTools** (`supabase.postgrestools`)

- PostgreSQL management
- Enhanced query editor

✅ **PostgreSQL** (`ms-ossdata.vscode-pgsql` & `ckolkman.vscode-postgres`)

- Connect to PostgreSQL databases
- Execute SQL queries
- View table schemas
- Database explorer
- Query result visualization

✅ **MongoDB** (`mongodb.mongodb-vscode`)

- Connect to MongoDB databases
- Browse collections
- Run queries with IntelliSense
- Import/export data

### API Development & Testing

✅ **REST Client** (`humao.rest-client`)

- **Send HTTP requests from .http files**
- Test APIs without leaving VS Code
- Environment variables support
- Save responses
- cURL command import

✅ **Thunder Client** (`rangav.vscode-thunder-client`)

- **Lightweight Postman alternative**
- Beautiful GUI for API testing
- Collections and environments
- GraphQL support
- Import/export collections

✅ **GraphQL** (`graphql.vscode-graphql` & `graphql.vscode-graphql-syntax`)

- GraphQL schema support
- Query syntax highlighting
- Auto-completion
- Schema validation
- Inline documentation

### Docker & DevOps

✅ **Docker** (`ms-azuretools.vscode-docker`)

- **Manage containers and images**
- Dockerfile syntax support
- Build, run, and debug containers
- Docker Compose support
- Registry explorer

✅ **Kubernetes** (`ms-kubernetes-tools.vscode-kubernetes-tools`)

- Manage Kubernetes clusters
- Deploy to clusters
- View pods, services, deployments
- Debug containers

### Additional Quality Tools

✅ **SonarLint** (`sonarsource.sonarlint-vscode`)

- **Static code analysis**
- Detect bugs and code smells
- Security vulnerability detection
- Code quality insights
- Works with JS, TS, Python, Java, etc.

✅ **YAML** (`redhat.vscode-yaml`)

- YAML language support
- Schema validation
- Auto-completion for Kubernetes, Docker Compose
- Format on save

✅ **TOML** (`tamasfe.even-better-toml`)

- TOML language support
- Syntax highlighting
- Validation

✅ **Live Server** (`ms-vscode.live-server`)

- Launch development server
- Live reload for HTML/CSS
- Quick preview of static sites

---

## ⚙️ Configured Settings

### Format on Save

- ✅ Enabled with Prettier as default formatter
- ✅ ESLint auto-fix on save
- ✅ 2-space indentation
- ✅ Auto import organization

### Tailwind CSS

- ✅ IntelliSense for className attributes
- ✅ CSS validation disabled (Tailwind handles this)
- ✅ Support for clsx/cn utility functions

### TypeScript

- ✅ Workspace TypeScript version used
- ✅ Auto-update imports on file move
- ✅ Relative import paths

### Emmet

- ✅ Enabled in JSX/TSX files
- ✅ Tab trigger enabled

---

## 🚀 Quick Tips

### React Snippets

Type these prefixes and press Tab:

- `rafce` - Arrow function component with export
- `rfc` - React functional component
- `useState` - useState hook
- `useEffect` - useEffect hook
- `useMemo` - useMemo hook
- `useCallback` - useCallback hook

### Tailwind Autocomplete

- Start typing class names in `className=""` to see suggestions
- Works with clsx, cn, and template literals

### File Navigation

- `Ctrl+P` - Quick file open
- `Ctrl+Shift+F` - Search across files
- `Ctrl+Click` - Go to definition
- `Alt+Left/Right` - Navigate back/forward

### Console Ninja

- `console.log()` output appears inline in your editor
- Automatic variable inspection
- Time travel debugging

### Git & GitLens

**View Git Blame (who changed what):**

- Hover over any line to see commit info and author
- Toggle inline blame: `Ctrl+Shift+P` → "GitLens: Toggle Line Blame Annotations"

**Compare Changes:**

- Click file in Source Control panel → Compare with previous
- Right-click file → "Open Changes" to see diff
- `Ctrl+Shift+P` → "GitLens: Compare File with..." for advanced comparisons

**View File History:**

- Right-click file → "Open File History"
- See all commits that changed the file
- Click any commit to see the diff

**Explore Commit Details:**

- Click on any commit hash to see full commit details
- View all files changed in that commit
- See commit message, author, and timestamp

**Visual Git Graph:**

- Click GitLens icon in Activity Bar (left sidebar)
- View "Commits" for visual commit history
- See branch relationships and merge history

**Quick Git Commands:**

- `Ctrl+Shift+G` - Open Source Control panel
- `Ctrl+Shift+P` → "Git: Commit" - Commit changes
- `Ctrl+Shift+P` → "Git: Push" - Push to remote
- `Ctrl+Shift+P` → "Git: Pull" - Pull from remote

### Testing with Vitest

**Run Tests:**

- Click Testing icon in Activity Bar (left sidebar)
- See all test files and individual tests
- Click ▶️ next to any test to run it
- Right-click test → "Debug Test" for breakpoint debugging

**View Coverage:**

- Run tests with coverage: `npm run test -- --coverage`
- Click "Watch" button in Coverage Gutters
- See green (covered) and red (uncovered) lines in gutter

**Quick Commands:**

- `Ctrl+Shift+P` → "Vitest: Run All Tests"
- `Ctrl+Shift+P` → "Vitest: Run Current File"
- `Ctrl+Shift+P` → "Coverage Gutters: Display Coverage"

### API Testing

**REST Client (.http files):**
Create an `api.http` file:

```http
### Test Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "test123"
}

### Get User Profile
GET http://localhost:3000/api/user/profile
Authorization: Bearer {{token}}
```

- Click "Send Request" above each request
- See response inline

**Thunder Client:**

- Click Thunder Client icon in Activity Bar
- Create new request with GUI
- Organize requests in collections
- Test APIs visually

### Database Work

**Prisma Workflow:**

1. Edit `schema.prisma` file
2. Run migration: `npx prisma migrate dev`
3. Generate client: `npx prisma generate`
4. Use autocomplete in your code with Prisma Client

**PostgreSQL Queries:**

- Click PostgreSQL icon in Activity Bar
- Connect to database
- Right-click table → "Select Top 1000"
- Write and execute custom SQL queries

**Supabase:**

- `Ctrl+Shift+P` → "Supabase: Start"
- Connect to your Supabase project
- Browse tables, run queries
- View real-time database changes

### Docker Commands

**Quick Actions:**

- Right-click Dockerfile → "Build Image"
- Right-click docker-compose.yml → "Compose Up"
- View running containers in Docker sidebar
- Right-click container → "View Logs"
- Right-click container → "Attach Shell"

---

## 📁 Project Structure

```
texqtic-platform/
├── components/          # React components
│   ├── Auth/           # Authentication UI
│   ├── ControlPlane/   # Super Admin components
│   ├── Onboarding/     # Onboarding flow
│   └── Tenant/         # Tenant management
├── layouts/            # Shell layouts (4 experiences)
├── services/           # API services (Gemini AI)
├── .vscode/            # VS Code configuration
│   ├── extensions.json # Recommended extensions
│   └── settings.json   # Workspace settings
├── App.tsx            # Main app component
├── constants.tsx      # Mock data
├── types.ts           # TypeScript types
└── vite.config.ts     # Vite configuration
```

---

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🌐 Environment Variables

Edit `.env.local` to configure:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

Get your Gemini API key: https://aistudio.google.com/app/apikey

---

## 💡 Next Steps

### Immediate Actions

1. **Restart VS Code** to activate all 40+ new extensions
   - `Ctrl+Shift+P` → "Reload Window"

2. **Test React Development:**
   - Open a `.tsx` file
   - Type `rafce` + Tab to create component
   - Type `className="bg-` and see Tailwind autocomplete
   - Save file (Ctrl+S) to see Prettier format

3. **Verify Git Integration:**
   - Hover over any code line to see GitLens blame
   - Click GitLens icon in Activity Bar
   - Explore commit history visually

### Testing Setup (When Ready)

4. **Setup Vitest:**

   ```bash
   npm install -D vitest @vitest/ui
   ```

   - Create test files: `*.test.ts` or `*.spec.ts`
   - Click Testing icon in Activity Bar
   - Run tests with coverage

5. **Setup Playwright (E2E):**
   ```bash
   npm init playwright@latest
   ```

   - Record tests with Playwright Codegen
   - Debug with breakpoints in VS Code

### Backend Setup (When Ready)

6. **Setup Prisma:**

   ```bash
   npm install -D prisma
   npx prisma init
   ```

   - Edit `prisma/schema.prisma`
   - Get full autocomplete and syntax highlighting

7. **Connect to PostgreSQL:**
   - Click PostgreSQL icon in Activity Bar
   - Add connection (localhost or Supabase)
   - Browse tables and run queries

8. **Test APIs with REST Client:**
   - Create `test.http` file
   - Write HTTP requests
   - Click "Send Request" to test

### Docker Setup (When Ready)

9. **Docker Integration:**
   - Create `Dockerfile` in your project
   - Right-click → "Build Image"
   - View containers in Docker sidebar

### Code Quality

10. **Enable SonarLint:**
    - Auto-analyzes code on open/save
    - See issues in Problems panel
    - Get security and quality insights

---

## 📊 Extension Summary

**Total Extensions Configured: 40+**

- ✅ **Frontend:** React, TypeScript, Tailwind, Vite (8 extensions)
- ✅ **Testing:** Vitest, Playwright, Jest, Coverage (4 extensions)
- ✅ **Backend:** Prisma, Supabase, PostgreSQL, MongoDB (7 extensions)
- ✅ **API:** REST Client, Thunder Client, GraphQL (5 extensions)
- ✅ **DevOps:** Docker, Kubernetes (2 extensions)
- ✅ **Git:** GitLens, Git History, GitHub (5 extensions)
- ✅ **Quality:** ESLint, Prettier, SonarLint, Error Lens (6 extensions)
- ✅ **Utilities:** Auto-tags, Path helpers, DotEnv, YAML, Live Server (10+ extensions)

---

## 🐛 Troubleshooting

### Extensions not working?

- Reload VS Code: `Ctrl+Shift+P` → "Reload Window"

### Tailwind autocomplete not working?

- Make sure you're inside a `className=""` attribute
- Check that Tailwind extension is enabled

### Format on save not working?

- Check default formatter: `Ctrl+Shift+P` → "Format Document With..." → Set Prettier as default

### TypeScript errors?

- Restart TS Server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Database connection issues?

- Check connection string in `.env.local`
- Verify database is running
- Test connection using database tool directly

### Docker containers not visible?

- Ensure Docker Desktop is running
- Restart Docker extension: `Ctrl+Shift+P` → "Docker: Restart"

### Test coverage not showing?

- Run tests with coverage flag first
- Enable Coverage Gutters: `Ctrl+Shift+P` → "Coverage Gutters: Display Coverage"

---

## 🚀 Quick Reference Card

### Essential Keyboard Shortcuts

| Action           | Shortcut              |
| ---------------- | --------------------- |
| Command Palette  | `Ctrl+Shift+P`        |
| Quick Open File  | `Ctrl+P`              |
| Search in Files  | `Ctrl+Shift+F`        |
| Source Control   | `Ctrl+Shift+G`        |
| Terminal         | ``Ctrl+` ``           |
| Go to Definition | `F12` or `Ctrl+Click` |
| Rename Symbol    | `F2`                  |
| Format Document  | `Shift+Alt+F`         |
| Toggle Sidebar   | `Ctrl+B`              |
| Zen Mode         | `Ctrl+K Z`            |

### Testing Commands

| Action           | Command                                               |
| ---------------- | ----------------------------------------------------- |
| Run All Tests    | `Ctrl+Shift+P` → "Vitest: Run All Tests"              |
| Run Current File | `Ctrl+Shift+P` → "Vitest: Run Current File"           |
| Debug Test       | Right-click test → "Debug Test"                       |
| Show Coverage    | `Ctrl+Shift+P` → "Coverage Gutters: Display Coverage" |
| Record E2E Test  | `Ctrl+Shift+P` → "Playwright: Record Test"            |

### Git Commands

| Action            | Command                                       |
| ----------------- | --------------------------------------------- |
| Stage Changes     | Click + in Source Control                     |
| Commit            | `Ctrl+Enter` in commit message box            |
| Push              | `Ctrl+Shift+P` → "Git: Push"                  |
| Pull              | `Ctrl+Shift+P` → "Git: Pull"                  |
| View File History | Right-click file → "Open File History"        |
| Toggle Blame      | `Ctrl+Shift+P` → "GitLens: Toggle Line Blame" |

### Database Commands

| Action          | Command                                     |
| --------------- | ------------------------------------------- |
| Connect to DB   | Click DB icon → Add Connection              |
| Run SQL Query   | Select text → Right-click → "Execute Query" |
| Format SQL      | `Shift+Alt+F`                               |
| View Table Data | Right-click table → "Select Top 1000"       |
| Prisma Format   | Save `schema.prisma` file (auto-format)     |

### API Testing

| Action              | Command                                                |
| ------------------- | ------------------------------------------------------ |
| Send HTTP Request   | Click "Send Request" in `.http` file                   |
| Open Thunder Client | Click Thunder icon in Activity Bar                     |
| New Request         | Thunder Client → "New Request"                         |
| Import cURL         | Paste cURL → Right-click → "Convert to Thunder Client" |

### Docker Commands

| Action        | Command                                       |
| ------------- | --------------------------------------------- |
| Build Image   | Right-click Dockerfile → "Build Image"        |
| Run Container | Right-click image → "Run"                     |
| View Logs     | Right-click container → "View Logs"           |
| Attach Shell  | Right-click container → "Attach Shell"        |
| Compose Up    | Right-click docker-compose.yml → "Compose Up" |

### Code Snippets (Type + Tab)

| Snippet       | Expands To                                 |
| ------------- | ------------------------------------------ |
| `rafce`       | React Arrow Function Component with Export |
| `rfc`         | React Function Component                   |
| `useState`    | useState Hook                              |
| `useEffect`   | useEffect Hook                             |
| `useMemo`     | useMemo Hook                               |
| `useCallback` | useCallback Hook                           |
| `it`          | Vitest test case                           |
| `describe`    | Vitest test suite                          |

---

## 🎯 Pro Tips

1. **Multi-Cursor Editing:** Hold `Alt` and click to place multiple cursors
2. **Select All Occurrences:** `Ctrl+Shift+L` to select all instances of selected text
3. **Peek Definition:** `Alt+F12` to see definition without leaving current file
4. **Breadcrumbs Navigation:** `Ctrl+Shift+.` to focus breadcrumbs
5. **Split Editor:** `Ctrl+\` to split editor side-by-side
6. **Move Line Up/Down:** `Alt+Up/Down` arrows
7. **Duplicate Line:** `Shift+Alt+Down` to copy line down
8. **Comment/Uncomment:** `Ctrl+/` for line comment, `Shift+Alt+A` for block comment
9. **Fold/Unfold Code:** `Ctrl+Shift+[` to fold, `Ctrl+Shift+]` to unfold
10. **Go to Symbol:** `Ctrl+Shift+O` to jump to any function/class in current file

---

**🎉 Your VS Code is now a full-stack development powerhouse with 40+ professional extensions!**
