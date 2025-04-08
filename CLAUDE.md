# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `pnpm dev` or `pnpm start`: Start dev server
- `pnpm build`: Build for production
- `pnpm preview`: Preview production build
- `pnpm check`: Run Astro type checking
- `pnpm format` or `pnpm fmt`: Format code with Prettier

## Code Style Guidelines
- **Formatting**: 100 char line width, 2-space indentation, single quotes, trailing commas
- **Imports**: Framework imports first, then path aliases (@components, @layouts), then local
- **Component Structure**: Props declaration in frontmatter, clear script/template separation
- **Naming**: PascalCase for components, camelCase for variables/functions, boolean vars start with "is"
- **Path Aliases**: Use @components/, @layouts/, @pages/, @img/, @styles/ instead of relative imports
- **Error Handling**: Use optional chaining (?.) and conditional rendering
- **File Organization**: Components in src/components/, pages in src/pages/, assets in src/assets/
- **React Components**: Used sparingly when needed for interactivity