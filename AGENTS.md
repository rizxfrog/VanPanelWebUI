# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Commands

*   **Development**: `pnpm run dev` - Starts the Vite development server.
*   **Build**: `pnpm run build` - Builds all packages and apps for production using Turbo.
*   **Lint & Format**: `pnpm run lint` (ESLint) and `pnpm run format` (Prettier) to format and fix code style.
*   **Type Check**: `pnpm run check:type` - Runs TypeScript type checking across all packages.
*   **Test All**: `pnpm run test:unit` - Runs all unit tests using Vitest with jsdom environment.
*   **Run Single Test**: `vitest run <path/to/file.test.ts>` - Executes a single test file.

## High-Level Architecture

This project is the frontend for the **AI+CloudOps** platform, explicitly tailored for the **A2 Kylin OS Security Intelligent Ops Agent** competition. It operates as a monorepo managed by `pnpm workspaces` and `turbo`. The tech stack relies on **Vue 3 (Composition API)**, **Vite**, **TypeScript**, and **Ant Design Vue**.

### Project Structure
*   **`apps/web-antd/`**: The primary web application. Most UI development, routing, and views occur here.
*   **`packages/`**: Modularized workspace packages:
    *   `@core/`: Foundational layouts and configurations.
    *   `effects/`: Side-effect handlers like the `request` client.
    *   `stores/`: Global state management via Pinia.
    *   `utils/`: Shared helper functions.

### Core Business Modules (A2 Competition Focus)
The frontend architecture is heavily geared towards "resolving AI execution uncontrollability" and "making operations visible". These core capabilities live under `apps/web-antd/src/views/`:
1.  **Intelligent Ops Console (`agent-console`)**: Replaces standard terminals. Uses SSE (Server-Sent Events) to stream LLM responses. Implements a multimodality layer that transforms LLM JSON output into dynamic Ant Design Vue data cards. Features a visual Chain-of-Thought (CoT) panel showing the agent's intent, tools used, and safety checks.
2.  **OS Dashboard (`os-dashboard`)**: Utilizes `ECharts` to provide real-time, high-dimensional visualization of Kylin Server V11 telemetry (CPU, Memory, Disk IO). It dynamically updates based on Agent actions.
3.  **Security & Approval Center (`security-approval`)**: The core safety layer. Intercepts Prompt Injections and dangerous commands (like `rm -rf`), rendering red alert cards in the chat UI. Enforces a "Human-in-the-loop" pattern requiring admin password/approval for elevated privileges.
4.  **Audit Trail (`audit-log`)**: A comprehensive logging UI that tracks intent, context, and execution results for every Agent action.
5.  **MCP Plugin Manager (`mcp-manager`)**: UI for enabling/disabling Model Context Protocol (MCP) plugins, defining the granular capabilities of the Agent.

### Data Flow
*   **State Management**: Pinia handles user sessions, security interception states, and globally shared dashboard metrics.
*   **Network Layer**: Standard CRUD operations use Axios (wrapped in `packages/effects/request`). LLM dialogue and real-time telemetry rely on SSE or WebSockets for minimal latency.
