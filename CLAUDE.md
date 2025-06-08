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

## News & Bulletin Management

### Adding News Posts
You are authorized to autonomously add news, bulletins, and updates to the website using Astro's content collections.

**Location**: Create new files in `src/content/bulletins/`

**File Format**:
```markdown
---
title: "Short descriptive title"
date: 2025-06-07T00:00:00Z
slug: "url-friendly-slug"
summary: "One or two sentence plain text preview of the post content."
---

Content body with proper markdown formatting.

Use double line breaks between paragraphs.

## Use Headings for Structure

**Bold text** for emphasis and field labels.

- Use bullet lists when appropriate
- Keep content organized and readable
```

**File Naming**: Use kebab-case names like `practice-net-update.md`

**Summary Requirements**:
- **Plain text only**: No markdown formatting in summaries
- **1-2 sentences**: Concise preview of the main content
- **Key details**: Include who, what, when for events
- **SEO friendly**: Used as meta description for individual posts
- **Homepage preview**: Displayed on homepage news section

### Content Guidelines & Privacy Rules

**REQUIRED Content Filtering**:
- **Remove surnames**: Use first names only (e.g., "Jay" not "Jay Smith") unless explicitly told to keep them
- **Remove GMRS codes**: Strip out PL tones, CTCSS codes, access codes, or frequency details
- **Remove phone numbers**: Never include personal phone numbers unless explicitly instructed
- **Emergency contacts**: Keep official emergency numbers (911, etc.)

**Content Examples**:
```markdown
# ✅ GOOD - Event Formatting
ERSN member Jay will be hosting a practice net on Wednesday.

- **When:** 7:30 PM, Wednesdays
- **Where:** Forest Meadows Repeater
- **Contact:** ersnnets@gmail.com for more info

# ❌ BAD  
Jay Williams will be hosting...
Use PL tone 156.7 to access...
Call Jay at (555) 123-4567...
Single line breaks that don't create paragraphs

**When:** 7:30 PM (using headings instead of lists)
**Where:** Location (using headings instead of lists)
```

**Markdown Formatting Rules**:
- **Double line breaks** create paragraphs (required for proper rendering)
- **Use headings** (## Heading) to structure content sections
- **Event details as lists**: Use bulleted lists for event information, not headings
- **Bold key information** like dates, locations, contact methods
- **Single line breaks** are ignored in markdown - use double breaks
- **Lists and formatting** help organize information clearly
- **Hyperlink text properly** using `[link text](url)` format instead of bare URLs

**Event Formatting Standard**:
```markdown
Event description goes here.

- **When:** Date and time
- **Where:** Location with optional [link](url)
- **Contact:** How to get more info
- **Other:** Any additional details
```

**Link Examples**:
```markdown
# ✅ GOOD
Join us at [Pine Brook HOA](http://pinebrookhoa.com/) for the meeting.
Learn more about [Meshtastic](https://ersn.net/mesh) technology.

# ❌ BAD
Join us at Pine Brook HOA: http://pinebrookhoa.com/
Learn more: https://ersn.net/mesh
```

**Acceptable Content**:
- Event announcements and updates
- Practice net schedules and changes
- Equipment testing notifications
- General community information
- Educational content about emergency preparedness

**Process**:
1. Create the markdown file with proper frontmatter
2. Apply content filtering rules automatically
3. Run `pnpm check` and `pnpm build` to verify
4. News will automatically appear on homepage and /news page

### Manual Override
If explicitly instructed to "keep surnames" or "include contact numbers," you may override the default filtering rules for that specific post.