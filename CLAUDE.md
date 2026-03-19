# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PSU Credit Tracker — a full-stack Next.js application that helps students track graduation progress by uploading academic report PDFs and comparing against curriculum requirements. Two user roles: **Student** (upload/verify/view results) and **Admin** (manage curriculums, categories, subjects, equivalencies).

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm start            # Production server
npm run lint         # ESLint

npx prisma migrate dev    # Run database migrations
npx prisma db seed        # Seed admin user
npx prisma generate       # Regenerate Prisma client after schema changes
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19, TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix primitives)
- **Database:** PostgreSQL via Prisma 7
- **Auth:** NextAuth 5 (beta) with Credentials provider, bcryptjs
- **State:** Zustand (sessionStorage-persisted) for cross-page form data
- **PDF Parsing:** pdf-parse with regex-based extraction
- **Path alias:** `@/*` → `./src/*`

## Architecture

### Student Flow: Upload → Verify → Results
1. `/upload` — Student uploads grade report + registration report PDFs
2. `/api/upload` — Server parses PDFs via `src/lib/pdf-parser.ts` (regex pattern matching, confidence scoring)
3. `/verify` — Interactive table for correcting extracted data
4. `/api/match` — Server matches verified subjects against curriculum
5. `/results` — Visual graduation progress dashboard per category

### Admin Flow (`/admin/*`)
Dashboard, curriculum CRUD (with template/clone/sync), hierarchical category management (self-referencing parent-child), global subject bank, subject equivalency mapping, bulk import.

### Key Files
- `src/lib/pdf-parser.ts` — PDF extraction logic with parseGradeReport, parseRegistrationReport, mergeSubjects, calculateConfidence
- `src/lib/auth.ts` + `src/lib/auth.config.ts` — NextAuth config with role-based access
- `src/lib/prisma.ts` — Prisma client singleton
- `src/store/credit-store.ts` — Zustand store for upload flow state
- `src/types/index.ts` — Shared TypeScript types
- `prisma/schema.prisma` — Database schema

### Database Schema (key models)
- **User** — students and admins, linked to CurriculumYear
- **CurriculumYear** — template support (baseTemplate/derivedTemplates), isActive/isTemplate flags
- **CurriculumCategory** — hierarchical (self-referencing parentId), sortOrder, spilloverType, requiredCredits
- **Subject** — linked to category and MasterSubject (global bank)
- **UserSubject** — actual transcript data with grade/status
- **MasterSubject** — global subject bank (code unique), curriculum subjects cloned from this
- **SubjectEquivalency** — maps newCode ↔ baseCode for subject code changes
- **StudyPlan / PlanSubject** — saved graduation simulations

### API Routes
- `/api/auth/[...nextauth]` — authentication
- `/api/upload`, `/api/register`, `/api/match` — student endpoints
- `/api/admin/*` — CRUD for curriculum, categories, subjects, master-subjects, equivalency, import, stats

## Notes

- React Compiler is enabled in `next.config.ts`
- `pdf-parse` and `pdfjs-dist` are configured as server external packages
- Cascading deletes are used in Prisma relations — be careful when deleting parent records
- Subject codes follow PSU SIS format (e.g., "B03-001G4", "315-202G2B")
