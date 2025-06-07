# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an Astro-based website for the Ebbetts Pass Radio Safety Net (ERSN). The site provides information about emergency communications, GMRS radios, mesh networking, and amateur radio resources.

## Build Commands
- `pnpm dev` or `pnpm start`: Start dev server
- `pnpm build`: Build for production
- `pnpm preview`: Preview production build
- `pnpm check`: Run Astro type checking
- `pnpm format` or `pnpm fmt`: Format code with Prettier

## Quality Assurance
- **Always run checks**: After making changes, run `pnpm check` to verify TypeScript compilation
- **Format code**: Run `pnpm format` before committing to ensure consistent formatting
- **Test builds**: Run `pnpm build` to ensure production builds work correctly
- **Preview changes**: Use `pnpm preview` to test the production build locally

## Code Style Guidelines
- **Formatting**: 100 char line width, 2-space indentation, single quotes, trailing commas
- **Imports**: Framework imports first, then path aliases (@components, @layouts), then local
- **Component Structure**: Props declaration in frontmatter, clear script/template separation
- **Naming**: PascalCase for components, camelCase for variables/functions, boolean vars start with "is"
- **Path Aliases**: Use @components/, @layouts/, @pages/, @img/, @styles/ instead of relative imports
- **Error Handling**: Use optional chaining (?.) and conditional rendering
- **File Organization**: Components in src/components/, pages in src/pages/, assets in src/assets/
- **React Components**: Used sparingly when needed for interactivity

## Autonomous Operation Guidelines
- **Make changes confidently**: You have permission to edit files, add components, and modify content
- **Follow existing patterns**: Study existing components and pages to understand conventions
- **Validate changes**: Always run `pnpm check` and `pnpm build` after making changes
- **Handle errors**: If build/check fails, fix the issues before considering the task complete
- **Use existing components**: Prefer using existing components (@components/) over creating new ones
- **Maintain consistency**: Follow the established patterns for page structure and styling

## Common Tasks
- **Adding pages**: Create .astro files in src/pages/, use Layout.astro wrapper
- **Styling**: Use Tailwind CSS classes, follow existing color/spacing patterns
- **Content updates**: Edit existing .astro files in src/pages/ for content changes
- **Component updates**: Modify files in src/components/ for reusable functionality
- **Asset management**: Add images to src/assets/img/, reference with @img/ alias

## Technology Stack
- **Framework**: Astro (Static Site Generator)
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **TypeScript**: Enabled for type safety
- **Deployment**: Static hosting optimized