# Repository Guidelines

## Project Structure & Module Organization
Pixelminter is a Next.js 15 + TypeScript workspace. UI entrypoints live in `pages/` (`index.tsx`, `_app.tsx`), while nearly all logic is in `src/`. Use `src/components/` for React building blocks (shared UI under `src/components/ui/`, wallet flows in `src/components/EnhancedWallet.tsx`, canvas logic inside `PixelArt.tsx`). Keep ABI files in `src/abi/`, hooks in `src/hooks/**`, shared types in `src/types/`, and Wagmi/onchain settings in `src/wagmi.ts`. Static assets belong to `public/`, Tailwind/global styles live in `src/styles/`, and tests sit next to the code inside `__tests__` folders (e.g., `src/hooks/__tests__/useEndOfDayDisable.test.ts`).

## Build, Test, and Development Commands
- `npm install` – install dependencies after cloning or pulling a lockfile change.
- `npm run dev` – start the Next.js dev server on http://localhost:3000 with hot reload.
- `npm run build` / `npm start` – create and serve the production bundle; run both before shipping.
- `npm run lint` – run the Next.js ESLint preset; treat warnings as blockers.
- `npx jest --runInBand` – execute the Jest suite defined in `jest.config.js`; append `--watch` while iterating.

## Coding Style & Naming Conventions
Code is TypeScript-first with strict mode enabled. Prefer 2-space indentation, PascalCase component files (`PixelArt.tsx`), camelCase hooks/utilities, and suffix hooks with `use`. Reference modules via the `@/` alias mapped to `src/`. Keep JSX lean, favor Tailwind utility classes from `tailwind.config.js`, and document non-obvious logic with concise comments.

## Testing Guidelines
Write tests with Jest + Testing Library (`jest.setup.js` loads `@testing-library/jest-dom`). Place specs under `__tests__` and name them `*.test.ts(x)`. Target >80% coverage as noted in the README and enforced through `collectCoverageFrom`, and cover edge interactions such as undo/redo state or wallet fallbacks. Run `npx jest --coverage` locally before requesting review.

## Commit & Pull Request Guidelines
Follow the imperative, conventional style already in `git log` (`Add example environment configuration file`, etc.). Scope commits narrowly, referencing related issues or BasePaint features in the body. Pull requests should include: a succinct summary, testing notes (`npm run lint`, `npx jest`), screenshots or screen recordings for UI changes, linked issues, and any environment or migration considerations.

## Security & Configuration Tips
Never commit secrets; derive them from `.env` copied via `.env.example`. Wallet, Lighthouse, and Base endpoints are configured through `src/config.js` and `src/wagmi.ts`, so update those files whenever chains or contracts move. When adding new chain interactions or storage providers, document required env keys and validation steps in the PR description.
