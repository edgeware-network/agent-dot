import type { UserConfig } from "@commitlint/types";

const Configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  formatter: "@commitlint/format",
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only changes
        "style", // Formatting, no code changes (whitespace, semicolons, etc.)
        "refactor", // Code changes that neither fix a bug nor add a feature
        "perf", // Performance improvement
        "test", // Adding or correcting tests
        "build", // Build system or dependency changes
        "ci", // CI/CD configuration changes
        "chore", // Other non-src/test changes (e.g. tooling, cleanup)
        "revert", // Reverts a previous commit
        "wip", // Work in progress
        "init", // Initial setup or commit
        "merge", // Merge branches
        "release", // Version bumps or release automation changes
        "hotfix", // Quick fix in production
        "deps", // Dependency updates
        "security", // Security improvements/fixes
        "config", // Configuration file changes
        "infra", // Infrastructure-related changes
        "ux", // User experience improvements
        "accessibility", // Accessibility-related updates (a11y)
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "auth", // Authentication/login/session
        "api", // Backend endpoints or API interactions
        "ai", // AI-related changes
        "agent", // Agent-specific changes
        "db", // Database schemas/queries
        "ui", // User interface components
        "layout", // Layout structure or visual changes
        "components", // Shared UI components
        "hooks", // Custom React/Vue hooks
        "style", // CSS/SASS/SCSS changes
        "utils", // Utility or helper modules
        "config", // Configuration files (tsconfig, eslint, prettier)
        "deps", // Dependency upgrades, removals, installs
        "setup", // Project initialization/setup
        "env", // Environment variables or .env changes
        "build", // Bundlers, compilers, Webpack/Vite/Parcel
        "ci", // CI/CD pipelines or scripts
        "lint", // Lint rules or formatting configuration
        "test", // Test suites / test framework setup
        "release", // Version bumps or release automation changes
        "types", // TypeScript types/interfaces definitions
        "docs", // Documentation (markdown, READMEs)
        "public", // Public assets (images, fonts, static files)
        "providers", // Context providers or global app providers
        "middleware", // Server/API middleware logic
        "i18n", // Localization/internationalization
        "security", // Security-related changes
        "performance", // Performance-specific code/optimizations
        "pages", // Application pages or views
        "models", // ORM or DB models
        "services", // Service layer logic
        "validators", // Schema or form validation
        "schemas", // API or DB schemas
        "constants", // Constants or enums
        "interfaces", // TypeScript interfaces
        "readme", // README updates
        "changelog", // CHANGELOG updates
        "assets", // Media and static files
        "images", // Image files
        "fonts", // Font assets
        "theme", // Theming or design tokens
        "colors", // Color definitions
        "spacing", // Spacing/layout tokens
        "docker", // Docker-related changes
        "k8s", // Kubernetes config
        "terraform", // IaC using Terraform
        "nginx", // Reverse proxy or web server config
        "monitoring", // Logging and monitoring setup
        "logging", // Log-related code
        "permissions", // Role/permission updates
        "roles", // User roles
        "secrets", // Secret management
        "encryption", // Encryption logic
        "thirdparty", // 3rd-party service integration
        "payment", // Payment processing logic
        "analytics", // Analytics/tracking code
        "web3", // Blockchain/web3 logic
        "scripts", // Project or utility scripts
        "core", // Core application logic
        "init", // Bootstrapping/init logic
        "temp", // Temporary/experimental code
        "other", // Miscellaneous or uncategorized changes
      ],
    ],
  },
};

export default Configuration;
