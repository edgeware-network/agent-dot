# 🌐 AgentDOT – Polkadot AI Assistant

<div align="center">

![AgentDOT Logo](https://img.shields.io/badge/AgentDOT-Polkadot%20AI%20Agent-blue?style=for-the-badge&logo=polkadot)

## **AI-powered blockchain interactions for the Polkadot ecosystem**

[![Version](https://img.shields.io/badge/version-1.9.2-blue.svg)](https://github.com/your-username/agent-dot/releases)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🤝 Contributing](#-contributing) • [📄 License](#-license)

</div>

---

## 📖 Table of Contents

- [✨ Overview](#-overview)
- [🛠 Tech Stack](#-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [🌐 Supported Networks](#-supported-networks)
- [📚 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🤝 Contributing](#-contributing)
- [🐛 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

---

## ✨ Overview

**AgentDOT** is a cutting-edge **Next.js 15** application that seamlessly integrates **AI capabilities** with the **Polkadot blockchain ecosystem**. Built with modern web technologies and a focus on user experience, it delivers intelligent blockchain interactions through an intuitive, responsive interface.

### 🎯 Key Features

- 🤖 **AI-Powered Interactions** – Intelligent blockchain agent actions and recommendations
- ⚡ **Next.js 15 App Router** – Modern server components, streaming, and optimized routing
- 🛠 **TypeScript** – Type-safe, maintainable, and scalable codebase
- 🌐 **Multi-Chain Support** – Polkadot, Edgeware, Westend, and more
- 💰 **DeFi Functionality** – Staking, nomination pools, and yield optimization
- 🔄 **XCM Transfers** – Seamless cross-chain asset transfers
- 📱 **Responsive Design** – Mobile-first approach with modern UI/UX
- 🔐 **Wallet Integration** – Support for major Polkadot wallets
- 🎨 **Modern UI Components** – Built with Tailwind CSS and custom components

---

## 🛠 Tech Stack

### 🎨 Frontend & Framework

| Technology                                    | Version | Purpose                         |
| --------------------------------------------- | ------- | ------------------------------- |
| [Next.js](https://nextjs.org/)                | 15.4.6  | React framework with App Router |
| [React](https://react.dev/)                   | 19.1.1  | UI library with latest features |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.2   | Type-safe JavaScript            |
| [Tailwind CSS](https://tailwindcss.com/)      | 4.1.11  | Utility-first CSS framework     |

### ⛓️ Blockchain & Polkadot

| Technology                                 | Version | Purpose                 |
| ------------------------------------------ | ------- | ----------------------- |
| [polkadot-api](https://polkadot.js.org/)   | 1.15.4  | Polkadot JavaScript API |
| [@polkadot/util](https://polkadot.js.org/) | 13.5.4  | Polkadot utilities      |
| [@paraspell/sdk](https://paraspell.xyz/)   | 10.11.7 | XCM transfer SDK        |

### 🤖 AI & Intelligence

| Technology                                   | Version | Purpose                  |
| -------------------------------------------- | ------- | ------------------------ |
| [Vercel AI SDK](https://sdk.vercel.ai/)      | 5.0.8   | AI integration framework |
| [@ai-sdk/react](https://sdk.vercel.ai/docs)  | 2.0.8   | React AI components      |
| [@ai-sdk/openai](https://sdk.vercel.ai/docs) | 2.0.7   | OpenAI integration       |

### 🛠️ Development Tools

| Technology                                 | Version   | Purpose              |
| ------------------------------------------ | --------- | -------------------- |
| [pnpm](https://pnpm.io/)                   | Workspace | Fast package manager |
| [ESLint](https://eslint.org/)              | 9.33.0    | Code linting         |
| [Prettier](https://prettier.io/)           | 3.6.2     | Code formatting      |
| [Husky](https://typicode.github.io/husky/) | 9.1.7     | Git hooks            |

---

## 📋 Prerequisites

Before starting, ensure you have:

- [Node.js **v22.15.1**](https://nodejs.org/en/) or higher
- [pnpm](https://pnpm.io/) v9+ (recommended package manager)
- Git for version control

> 💡 **Pro Tip:** Use a Node version manager like `nvm` or `fnm` to easily switch between Node.js versions.

### **Node.js Installation**

We recommend using a Node version manager:

**Using nvm (Node Version Manager):**

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js v22.15.1
nvm install 22.15.1
nvm use 22.15.1
```

**Using fnm (Fast Node Manager):**

```bash
# Install fnm (if not already installed)
curl -fsSL https://fnm.vercel.app/install | bash

# Install and use Node.js v22.15.1
fnm install 22.15.1
fnm use 22.15.1
```

### **pnpm Installation**

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/edgeware-network/agent-dot.git
cd agent-dot
```

### 2. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Database URL (if using external database)
DATABASE_URL=your_database_url_here

# Other configuration variables
NEXT_PUBLIC_APP_NAME=AgentDOT
```

### 4. Run the Development Server

```bash
# Using pnpm
pnpm dev

# Or using npm
npm run dev

# Or using yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 5. Build for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

---

## 🌐 Supported Networks

AgentDOT supports multiple Polkadot networks and parachains:

| Network      | Type    | Status    | Features              |
| ------------ | ------- | --------- | --------------------- |
| **Polkadot** | Mainnet | ✅ Active | Full functionality    |
| **Westend**  | Testnet | ✅ Active | Testing & development |
| **Paseo**    | Testnet | ✅ Active | Testing & development |

---

## 📚 Features

### 🤖 AI-Powered Blockchain Agents

AgentDOT features a comprehensive suite of intelligent agents that handle various blockchain operations:

#### 🔐Identity & Account Management

- **Account Discovery** – Automatically detect and manage connected wallet accounts
- **Network Switching** – Seamlessly switch between Polkadot networks (Polkadot, Edgeware, Westend, Paseo)
- **Balance Monitoring** – Real-time balance checking across multiple networks
- **Active Account Management** – Set and manage active accounts for transactions

#### 💰 Transfer

- **Token Transfers** – Execute native token transfers on any supported network
- **Address Validation** – Automatic SS58 address validation for security
- **Transaction Preparation** – Prepare and confirm transfers with proper error handling
- **Multi-Token Support** – Transfer DOT, WND, PAS, and other network tokens

#### ⚡ Staking

- **Bonding Operations** – Bond tokens for staking with configurable reward destinations
- **Validator Nomination** – Nominate trusted validators for optimal staking rewards
- **Unbonding Management** – Manage unbonding periods and withdrawal schedules
- **Multi-Network Support** – Staking operations across Polkadot, Westend, and Paseo
- **Reward Configuration** – Configure where staking rewards are sent (re-bond, stash, controller, or specific account)

#### 🏊 Nomination Pools

- **Pool Participation** – Join existing nomination pools with minimal token requirements
- **Additional Bonding** – Add more tokens to increase staking rewards
- **Reward Restaking** – Automatically re-stake accumulated rewards
- **Pool Management** – Unbond from pools when needed
- **Minimum Bond Requirements** – Network-specific minimum bond amounts enforced

#### 🌐 XCM (Cross-Chain)

- **Cross-Chain Transfers** – Teleport tokens between different Polkadot networks
- **Asset Hub Integration** – Seamless transfers to and from Asset Hub parachains
- **Network Discovery** – Automatically detect available system and relay chains
- **Asset Support Validation** – Verify asset compatibility before transfers
- **Multi-Token XCM** – Support for DOT, WND, and PAS cross-chain transfers

#### 🔐 Wallet Integration

- **Multi-Wallet Support** – Talisman, Polkadot.js, SubWallet, and more
- **Account Management** – Easy account switching and management
- **Security Features** – Secure transaction signing and validation
- **SS58 Address Validation** – Built-in address format verification

---

## 📖 Documentation

### **Available Scripts**

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Start development server with Turbopack |
| `pnpm build`      | Build the application for production    |
| `pnpm start`      | Start production server                 |
| `pnpm lint`       | Run ESLint for code quality             |
| `pnpm format`     | Check code formatting with Prettier     |
| `pnpm format:fix` | Fix code formatting issues              |
| `pnpm tsc`        | Run TypeScript type checking            |

### **Database Commands**

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm db:generate` | Generate new database migrations |
| `pnpm db:migrate`  | Run database migrations          |
| `pnpm db:push`     | Push schema changes to database  |
| `pnpm db:pull`     | Pull database schema             |

---

## 🏗️ Architecture

```text
agent-dot/
├── app/                    # Next.js 15 App Router
│   ├── (chat)/           # Chat interface routes
│   ├── api/              # API routes
│   └── globals.css       # Global styles
├── agents/               # AI agent implementations
│   ├── tools/            # Agent tools and utilities
│   └── index.ts          # Agent exports
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components
│   └── account/         # Account-related components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── providers/           # React context providers
└── types/               # TypeScript type definitions
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🐛 Reporting Issues

- Use the [GitHub issue tracker](https://github.com/your-username/agent-dot/issues)
- Include detailed reproduction steps
- Attach relevant logs and screenshots

### 💡 Suggesting Features

- Open a [feature request issue](https://github.com/your-username/agent-dot/issues/new?template=feature_request.md)
- Describe the use case and expected behavior
- Consider contributing the implementation

### 💻 Code Style

- Follow TypeScript best practices
- Use Prettier for code formatting
- Follow ESLint rules
- Write meaningful commit messages

### ✅ Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): message
```

Examples:

```text

feat(ui): add new feature
fix(ui): bug fix
docs(readme): documentation changes
style(lint): formatting changes
refactor(hooks): code refactoring
test(app): adding tests
chore(deps): maintenance tasks

```

---

### 🔧 Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### 📋 Development Guidelines

- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 🐛 Troubleshooting

### Common Issues

#### 🔴 Build Errors

```bash
# Clear Next.js cache
rm -rf .next
pnpm install
pnpm dev
```

#### 🔴 Dependency Issues

```bash
# Clear pnpm cache
pnpm store prune
pnpm install
```

#### 🔴 Database Connection Issues

- Verify your `.env.local` configuration
- Ensure the database is running and accessible
- Check network connectivity

#### 🔴 AI Features Not Working

- Verify your OpenAI API key is valid
- Check API rate limits and quotas
- Ensure proper environment variable configuration

### Getting Help

- 📖 Check the [documentation](#-documentation)
- 🐛 Search [existing issues](https://github.com/your-username/agent-dot/issues)
- 💬 Join our [Discord community](https://discord.gg/your-community)
- 📧 Contact us at [support@agentdot.com](mailto:support@agentdot.com)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Polkadot Community** – For the amazing blockchain ecosystem
- **Next.js Team** – For the incredible React framework
- **OpenAI** – For powering our AI features
- **Contributors** – Everyone who has contributed to this project

---

<div align="center">

### Made with ❤️ by the EdgetributorSubDAO Team

[🌐 Website](https://edgeware.io) • [🐦 Twitter](https://twitter.com/edgeware) • [💬 Discord](https://discord.gg/edgeware)

</div>
