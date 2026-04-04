# Phase 3c Themes: Coral, Serene, Jade, and Quartz

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4 remaining themes (Coral, Serene, Jade, Quartz) on the primitives composition architecture, wire all themes through the router, add a `GET /api/themes` endpoint, and remove all legacy theme code.

**Architecture:** Each theme follows the pattern established by Onyx: a `theme.config.ts` for metadata, a `fonts.ts` for `next/font/google` declarations, a `styles/theme.css` for theme-specific CSS custom properties and utility classes, optional custom wrapper components in `components/`, and `portfolio.tsx` + `targeted.tsx` layout files that compose shared primitives. The router in `page.tsx` switches on theme name to render the correct layout. A new Python API endpoint reads theme configs from disk to serve metadata to the admin UI.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, `next/font/google`, Python/FastAPI, pytest, vitest

**Spec:** `docs/superpowers/specs/2026-04-02-phase3c-theme-design.md`

**Parallelization:** Tasks 1-4 (the four themes) are fully independent and should be dispatched in parallel. Tasks 5-7 depend on all themes being complete.

---

## File Map

### New files

```
src-generator/app/themes/coral/
├── theme.config.ts
├── fonts.ts
├── styles/theme.css
├── portfolio.tsx
├── targeted.tsx
└── components/
    ├── CoralHero.tsx
    └── CoralFooter.tsx

src-generator/app/themes/serene/
├── theme.config.ts
├── fonts.ts
├── styles/theme.css
├── portfolio.tsx
├── targeted.tsx
└── components/
    └── SereneFooter.tsx

src-generator/app/themes/jade/
├── theme.config.ts
├── fonts.ts
├── styles/theme.css
├── portfolio.tsx
├── targeted.tsx
└── components/
    ├── JadeHeader.tsx
    └── JadeFooter.tsx

src-generator/app/themes/quartz/
├── theme.config.ts
├── fonts.ts
├── styles/theme.css
├── portfolio.tsx
├── targeted.tsx
└── components/
    ├── QuartzHeader.tsx
    └── QuartzFooter.tsx

src-api/app/routers/themes.py
src-api/tests/unit/test_themes_router.py
```

### Modified files

```
src-generator/app/page.tsx          # Add all theme routes
src-generator/app/globals.css       # Ensure no theme-specific styles remain
```

### Deleted files (legacy theme code replaced by new architecture)

```
src-generator/app/themes/coral/page.tsx
src-generator/app/themes/coral/theme.config.json
src-generator/app/themes/coral/components/   (all files)

src-generator/app/themes/serene/page.tsx
src-generator/app/themes/serene/theme.config.json
src-generator/app/themes/serene/components/  (all files)

src-generator/app/themes/jade/page.tsx
src-generator/app/themes/jade/theme.config.json
src-generator/app/themes/jade/components/    (all files)

src-generator/app/themes/quartz/page.tsx
src-generator/app/themes/quartz/theme.config.json
src-generator/app/themes/quartz/components/  (all files)
```

---

## Task 1: Coral Theme

**Files:**
- Delete: all files in `src-generator/app/themes/coral/`
- Create: `src-generator/app/themes/coral/theme.config.ts`
- Create: `src-generator/app/themes/coral/fonts.ts`
- Create: `src-generator/app/themes/coral/styles/theme.css`
- Create: `src-generator/app/themes/coral/components/CoralHero.tsx`
- Create: `src-generator/app/themes/coral/components/CoralFooter.tsx`
- Create: `src-generator/app/themes/coral/portfolio.tsx`
- Create: `src-generator/app/themes/coral/targeted.tsx`

Coral is warm, bold, energetic. Audience: creative professionals, designers. Typography: Poppins 700 (headings), DM Sans (body). Palette: warm coral (#d4553a), amber accent (#f4a261), dark text on light warm backgrounds. Layout: visual cards for projects, energetic spacing, color accents on section transitions, rounded corners. Projects lead in portfolio mode.

- [ ] **Step 1: Delete legacy Coral files**

```bash
cd src-generator
rm -rf app/themes/coral/
mkdir -p app/themes/coral/components app/themes/coral/styles
```

- [ ] **Step 2: Create theme config**

Create `src-generator/app/themes/coral/theme.config.ts`:

```typescript
import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'coral',
  name: 'Coral',
  description: 'Warm, bold, energetic',
  audience: 'Creative professionals, designers',
  fonts: {
    heading: 'Poppins',
    body: 'DM Sans',
  },
  colors: {
    primary: '#d4553a',
    accent: '#f4a261',
    background: '#fffaf7',
    surface: '#fff5f0',
    text: '#2d2420',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
```

- [ ] **Step 3: Create font declarations**

Create `src-generator/app/themes/coral/fonts.ts`:

```typescript
import { Poppins, DM_Sans } from 'next/font/google';

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
```

- [ ] **Step 4: Create theme CSS**

Create `src-generator/app/themes/coral/styles/theme.css`:

```css
.coral-theme {
  --coral-primary: #d4553a;
  --coral-primary-light: #e0735e;
  --coral-amber: #f4a261;
  --coral-amber-light: #f7be8a;
  --coral-bg: #fffaf7;
  --coral-surface: #fff5f0;
  --coral-surface-alt: #fef0e8;
  --coral-text: #2d2420;
  --coral-text-muted: #6b5b52;
  --coral-border: #e8d5c8;
}

.coral-theme .section-container {
  @apply max-w-6xl mx-auto px-6 py-16 md:py-24;
}

.coral-theme .section-title {
  @apply text-3xl md:text-4xl font-heading font-bold mb-8 text-[var(--coral-text)];
}

.coral-theme .card {
  @apply bg-white rounded-2xl p-6 border border-[var(--coral-border)] shadow-sm hover:shadow-md transition-shadow;
}

.coral-theme .accent-bar {
  @apply h-1 w-16 rounded-full bg-gradient-to-r from-[var(--coral-primary)] to-[var(--coral-amber)];
}

.coral-theme .tag {
  @apply text-sm bg-[var(--coral-surface-alt)] text-[var(--coral-primary)] px-3 py-1 rounded-full font-medium;
}
```

- [ ] **Step 5: Create CoralHero component**

Create `src-generator/app/themes/coral/components/CoralHero.tsx`:

```tsx
import React from 'react';
import { Profile } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface CoralHeroProps {
  profile: Profile;
}

export function CoralHero({ profile }: CoralHeroProps) {
  return (
    <section id="about" className="min-h-[80vh] flex items-center bg-gradient-to-br from-[var(--coral-bg)] to-[var(--coral-surface)]">
      <div className="section-container w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="accent-bar mb-6" />
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-[var(--coral-text)] mb-4 leading-tight">
              {profile.fullName}
            </h1>
            <h2 className="text-2xl md:text-3xl text-[var(--coral-primary)] font-heading font-semibold mb-6">
              {profile.title}
            </h2>
            {profile.summary && (
              <p className="text-lg text-[var(--coral-text-muted)] leading-relaxed">
                {profile.summary}
              </p>
            )}
            <div className="mt-8">
              <a
                href="#contact"
                className="inline-block bg-[var(--coral-primary)] text-white font-semibold px-8 py-3 rounded-full hover:bg-[var(--coral-primary-light)] transition-colors"
              >
                Let&apos;s Connect
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            <PhotoFrame
              src={profile.photo}
              alt={profile.fullName}
              shape="rounded"
              size="w-72 h-72 md:w-96 md:h-96"
              className="shadow-xl rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create CoralFooter component**

Create `src-generator/app/themes/coral/components/CoralFooter.tsx`:

```tsx
import React from 'react';

interface CoralFooterProps {
  fullName: string;
}

export function CoralFooter({ fullName }: CoralFooterProps) {
  return (
    <footer className="bg-[var(--coral-text)] py-8">
      <div className="max-w-6xl mx-auto px-6 text-center text-[var(--coral-border)]">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create portfolio layout**

Create `src-generator/app/themes/coral/portfolio.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, PublicationItem, AwardItem, LanguageItem } from '@/primitives';
import { CoralHero } from './components/CoralHero';
import { CoralFooter } from './components/CoralFooter';
import './styles/theme.css';

interface CoralPortfolioProps {
  data: PortfolioData;
}

export default function CoralPortfolio({ data }: CoralPortfolioProps) {
  return (
    <div className="coral-theme min-h-screen bg-[var(--coral-bg)] text-[var(--coral-text)] font-body">
      <CoralHero profile={data.profile} />

      <main>
        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card group"
                nameClassName="text-xl font-heading font-bold text-[var(--coral-text)] mb-2 group-hover:text-[var(--coral-primary)] transition-colors"
                techClassName="tag"
                linkClassName="inline-flex items-center text-[var(--coral-primary)] hover:text-[var(--coral-primary-light)] font-medium transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-8"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                location={exp.location}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-2xl font-heading font-bold text-[var(--coral-text)] mb-1"
                subtitleClassName="text-xl text-[var(--coral-primary)]"
                dateClassName="text-[var(--coral-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--coral-text)]"
                highlightBullet={<span className="text-[var(--coral-amber)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-lg font-heading font-bold text-[var(--coral-primary)] mb-3"
                itemClassName="tag mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-6"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                startDate={edu.startDate}
                endDate={edu.endDate}
                notes={edu.notes}
                className="card"
                titleClassName="text-2xl font-heading font-bold text-[var(--coral-text)] mb-1"
                subtitleClassName="text-lg text-[var(--coral-primary)]"
                dateClassName="text-[var(--coral-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="awards" title="Awards" data={data.awards} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.awards}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(award, idx) => (
              <AwardItem
                key={idx}
                award={award}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--coral-text)]"
                detailClassName="text-[var(--coral-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <Section id="publications" title="Publications" data={data.publications} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-4"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="card flex flex-col gap-1"
                titleClassName="text-lg font-heading font-bold text-[var(--coral-text)]"
                detailClassName="text-[var(--coral-text-muted)] text-sm ml-2"
                linkClassName="text-lg font-heading font-bold text-[var(--coral-primary)] hover:text-[var(--coral-primary-light)]"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="text-lg font-heading font-bold text-[var(--coral-text)]"
                detailClassName="text-[var(--coral-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="volunteer" title="Volunteer" data={data.volunteer} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.volunteer}
            className="space-y-6"
            renderItem={(vol, idx) => (
              <TimelineEntry
                key={idx}
                title={vol.role || ''}
                subtitle={vol.organization}
                startDate={vol.startDate}
                endDate={vol.endDate}
                description={vol.description}
                className="card"
                titleClassName="text-xl font-heading font-bold text-[var(--coral-text)] mb-1"
                subtitleClassName="text-lg text-[var(--coral-primary)]"
                dateClassName="text-[var(--coral-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-4">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-5 py-3"
                nameClassName="text-[var(--coral-text)] font-bold"
                proficiencyClassName="text-[var(--coral-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <Section id="contact" title="Get In Touch" data={data.contact} className="bg-[var(--coral-surface)]" containerClassName="section-container text-center" titleClassName="section-title">
          <p className="text-lg text-[var(--coral-text-muted)] mb-8">
            I&apos;d love to hear about your next project.
          </p>
          <ContactBar
            contact={data.contact}
            className="flex flex-col items-center space-y-4"
            linkClassName="text-xl text-[var(--coral-primary)] hover:text-[var(--coral-primary-light)] transition-colors font-medium"
          />
        </Section>
      </main>

      <CoralFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 8: Create targeted layout**

Create `src-generator/app/themes/coral/targeted.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, LanguageItem } from '@/primitives';
import { PhotoFrame } from '@/primitives';
import { CoralFooter } from './components/CoralFooter';
import './styles/theme.css';

interface CoralTargetedProps {
  data: PortfolioData;
}

export default function CoralTargeted({ data }: CoralTargetedProps) {
  return (
    <div className="coral-theme min-h-screen bg-[var(--coral-bg)] text-[var(--coral-text)] font-body">
      {/* Targeted header — color-blocked with company/role emphasis */}
      <header className="bg-gradient-to-r from-[var(--coral-primary)] to-[var(--coral-amber)]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-8">
            <PhotoFrame
              src={data.profile.photo}
              alt={data.profile.fullName}
              shape="rounded"
              size="w-24 h-24"
              className="rounded-2xl shadow-lg"
            />
            <div className="text-white">
              <h1 className="text-4xl font-heading font-bold">
                {data.profile.fullName}
              </h1>
              {data.jobPosting && (
                <p className="text-xl mt-1 opacity-90">
                  for {data.jobPosting.title} at {data.jobPosting.company}
                </p>
              )}
              <p className="mt-2 opacity-80">{data.profile.title}</p>
            </div>
          </div>
          {data.profile.summary && (
            <p className="text-white/90 mt-6 max-w-3xl leading-relaxed">
              {data.profile.summary}
            </p>
          )}
        </div>
      </header>

      <main>
        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card"
                nameClassName="text-lg font-heading font-bold text-[var(--coral-text)] mb-2"
                techClassName="tag"
                linkClassName="text-[var(--coral-primary)] hover:text-[var(--coral-primary-light)] font-medium text-sm transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-6"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-xl font-heading font-bold text-[var(--coral-text)] mb-1"
                subtitleClassName="text-lg text-[var(--coral-primary)]"
                dateClassName="text-[var(--coral-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--coral-text)]"
                highlightBullet={<span className="text-[var(--coral-amber)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-lg font-heading font-bold text-[var(--coral-primary)] mb-3"
                itemClassName="tag mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-4"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                endDate={edu.endDate}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--coral-text)] mb-1"
                subtitleClassName="text-[var(--coral-primary)]"
                dateClassName="text-[var(--coral-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--coral-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="text-[var(--coral-text)] font-heading font-bold"
                detailClassName="text-[var(--coral-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--coral-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-3">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-[var(--coral-text)] font-bold"
                proficiencyClassName="text-[var(--coral-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <section className="bg-[var(--coral-bg)]">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <ContactBar
              contact={data.contact}
              className="flex flex-wrap justify-center gap-6"
              linkClassName="text-[var(--coral-primary)] hover:text-[var(--coral-primary-light)] font-medium transition-colors"
            />
          </div>
        </section>
      </main>

      <CoralFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src-generator/app/themes/coral/
git commit -m "feat(generator): build Coral theme — warm, bold, energetic

Portfolio and targeted layouts with Poppins + DM Sans typography,
warm coral/amber palette, rounded cards, projects-first section order."
```

---

## Task 2: Serene Theme

**Files:**
- Delete: all files in `src-generator/app/themes/serene/`
- Create: `src-generator/app/themes/serene/theme.config.ts`
- Create: `src-generator/app/themes/serene/fonts.ts`
- Create: `src-generator/app/themes/serene/styles/theme.css`
- Create: `src-generator/app/themes/serene/components/SereneFooter.tsx`
- Create: `src-generator/app/themes/serene/portfolio.tsx`
- Create: `src-generator/app/themes/serene/targeted.tsx`

Serene is clean, minimal, spacious. Audience: consultants, executives. Typography: Source Serif 4 (headings), Source Sans 3 (body). Palette: near-white backgrounds (#fafbfc), subtle gray borders, minimal accent. No hero banner — compact header. Maximum whitespace, content breathes.

- [ ] **Step 1: Delete legacy Serene files**

```bash
cd src-generator
rm -rf app/themes/serene/
mkdir -p app/themes/serene/components app/themes/serene/styles
```

- [ ] **Step 2: Create theme config**

Create `src-generator/app/themes/serene/theme.config.ts`:

```typescript
import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'serene',
  name: 'Serene',
  description: 'Clean, minimal, spacious',
  audience: 'Consultants, executives',
  fonts: {
    heading: 'Source Serif 4',
    body: 'Source Sans 3',
  },
  colors: {
    primary: '#2c3e50',
    accent: '#7f8c8d',
    background: '#fafbfc',
    surface: '#ffffff',
    text: '#2c3e50',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
```

- [ ] **Step 3: Create font declarations**

Create `src-generator/app/themes/serene/fonts.ts`:

```typescript
import { Source_Serif_4, Source_Sans_3 } from 'next/font/google';

export const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
```

- [ ] **Step 4: Create theme CSS**

Create `src-generator/app/themes/serene/styles/theme.css`:

```css
.serene-theme {
  --serene-bg: #fafbfc;
  --serene-surface: #ffffff;
  --serene-text: #2c3e50;
  --serene-text-muted: #7f8c8d;
  --serene-border: #ecf0f1;
  --serene-accent: #95a5a6;
}

.serene-theme .section-container {
  @apply max-w-3xl mx-auto px-6 py-16 md:py-20;
}

.serene-theme .section-title {
  @apply text-2xl font-heading font-semibold mb-10 text-[var(--serene-text)] tracking-tight;
}

.serene-theme .divider {
  @apply border-t border-[var(--serene-border)] my-0;
}
```

- [ ] **Step 5: Create SereneFooter component**

Create `src-generator/app/themes/serene/components/SereneFooter.tsx`:

```tsx
import React from 'react';

interface SereneFooterProps {
  fullName: string;
}

export function SereneFooter({ fullName }: SereneFooterProps) {
  return (
    <footer className="py-12">
      <div className="max-w-3xl mx-auto px-6 text-center text-[var(--serene-text-muted)] text-sm">
        <p>&copy; {new Date().getFullYear()} {fullName}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Create portfolio layout**

Create `src-generator/app/themes/serene/portfolio.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, PublicationItem, AwardItem, LanguageItem } from '@/primitives';
import { PhotoFrame } from '@/primitives';
import { SereneFooter } from './components/SereneFooter';
import './styles/theme.css';

interface SerenePortfolioProps {
  data: PortfolioData;
}

export default function SerenePortfolio({ data }: SerenePortfolioProps) {
  return (
    <div className="serene-theme min-h-screen bg-[var(--serene-bg)] text-[var(--serene-text)] font-body">
      {/* Compact header — no hero banner */}
      <header className="pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-6">
            <PhotoFrame
              src={data.profile.photo}
              alt={data.profile.fullName}
              shape="circle"
              size="w-20 h-20"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-semibold text-[var(--serene-text)] tracking-tight">
                {data.profile.fullName}
              </h1>
              <p className="text-lg text-[var(--serene-text-muted)] mt-1">{data.profile.title}</p>
            </div>
          </div>
          {data.profile.summary && (
            <p className="text-[var(--serene-text)] mt-8 leading-relaxed text-lg">
              {data.profile.summary}
            </p>
          )}
        </div>
      </header>

      <hr className="divider max-w-3xl mx-auto" />

      <main>
        <Section id="experience" title="Experience" data={data.workExperience} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-10"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                location={exp.location}
                highlights={exp.responsibilities}
                titleClassName="text-xl font-heading font-semibold text-[var(--serene-text)] mb-1"
                subtitleClassName="text-lg text-[var(--serene-text-muted)]"
                dateClassName="text-[var(--serene-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--serene-text)] leading-relaxed"
                highlightBullet={<span className="text-[var(--serene-accent)] mr-3 mt-1">&mdash;</span>}
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="education" title="Education" data={data.education} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-8"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                startDate={edu.startDate}
                endDate={edu.endDate}
                notes={edu.notes}
                titleClassName="text-xl font-heading font-semibold text-[var(--serene-text)] mb-1"
                subtitleClassName="text-lg text-[var(--serene-text-muted)]"
                dateClassName="text-[var(--serene-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="skills" title="Skills" data={data.skills} containerClassName="section-container" titleClassName="section-title">
          <div className="space-y-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="flex flex-wrap items-baseline gap-x-1"
                categoryClassName="text-sm font-semibold text-[var(--serene-text)] uppercase tracking-wider mr-3"
                itemClassName="text-[var(--serene-text-muted)] text-sm after:content-[',_'] last:after:content-['']"
              />
            ))}
          </div>
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="projects" title="Projects" data={data.projects} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.projects}
            className="space-y-8"
            renderItem={(project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                nameClassName="text-lg font-heading font-semibold text-[var(--serene-text)] mb-1"
                techClassName="text-xs text-[var(--serene-text-muted)] bg-[var(--serene-border)] px-2 py-0.5 rounded mr-1.5 mb-1 inline-block"
                linkClassName="text-[var(--serene-text-muted)] hover:text-[var(--serene-text)] underline text-sm transition-colors"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="certifications" title="Certifications" data={data.certifications} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="space-y-4"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                nameClassName="font-heading font-semibold text-[var(--serene-text)]"
                detailClassName="text-[var(--serene-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="publications" title="Publications" data={data.publications} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-4"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="flex flex-col gap-0.5"
                titleClassName="font-heading font-semibold text-[var(--serene-text)]"
                detailClassName="text-[var(--serene-text-muted)] text-sm"
                linkClassName="font-heading font-semibold text-[var(--serene-text)] hover:text-[var(--serene-text-muted)] underline"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="awards" title="Awards" data={data.awards} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.awards}
            className="space-y-4"
            renderItem={(award, idx) => (
              <AwardItem
                key={idx}
                award={award}
                titleClassName="font-heading font-semibold text-[var(--serene-text)]"
                detailClassName="text-[var(--serene-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="volunteer" title="Volunteer" data={data.volunteer} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.volunteer}
            className="space-y-8"
            renderItem={(vol, idx) => (
              <TimelineEntry
                key={idx}
                title={vol.role || ''}
                subtitle={vol.organization}
                startDate={vol.startDate}
                endDate={vol.endDate}
                description={vol.description}
                titleClassName="text-lg font-heading font-semibold text-[var(--serene-text)] mb-1"
                subtitleClassName="text-[var(--serene-text-muted)]"
                dateClassName="text-[var(--serene-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="languages" title="Languages" data={data.languages} containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-6">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="flex items-baseline gap-2"
                nameClassName="text-[var(--serene-text)] font-semibold"
                proficiencyClassName="text-[var(--serene-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="contact" title="Contact" data={data.contact} containerClassName="section-container" titleClassName="section-title">
          <ContactBar
            contact={data.contact}
            className="flex flex-col space-y-3"
            linkClassName="text-[var(--serene-text-muted)] hover:text-[var(--serene-text)] transition-colors"
          />
        </Section>
      </main>

      <SereneFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 7: Create targeted layout**

Create `src-generator/app/themes/serene/targeted.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, LanguageItem } from '@/primitives';
import { PhotoFrame } from '@/primitives';
import { SereneFooter } from './components/SereneFooter';
import './styles/theme.css';

interface SereneTargetedProps {
  data: PortfolioData;
}

export default function SereneTargeted({ data }: SereneTargetedProps) {
  return (
    <div className="serene-theme min-h-screen bg-[var(--serene-bg)] text-[var(--serene-text)] font-body">
      {/* Compact header with subtle "Prepared for" line */}
      <header className="pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-6">
            <PhotoFrame
              src={data.profile.photo}
              alt={data.profile.fullName}
              shape="circle"
              size="w-16 h-16"
            />
            <div>
              <h1 className="text-3xl font-heading font-semibold text-[var(--serene-text)] tracking-tight">
                {data.profile.fullName}
              </h1>
              <p className="text-[var(--serene-text-muted)] mt-1">{data.profile.title}</p>
              {data.jobPosting && (
                <p className="text-sm text-[var(--serene-accent)] mt-1">
                  Prepared for {data.jobPosting.company} &mdash; {data.jobPosting.title}
                </p>
              )}
            </div>
          </div>
          {data.profile.summary && (
            <p className="text-[var(--serene-text)] mt-8 leading-relaxed">
              {data.profile.summary}
            </p>
          )}
        </div>
      </header>

      <hr className="divider max-w-3xl mx-auto" />

      <main>
        <Section id="experience" title="Experience" data={data.workExperience} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-8"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                highlights={exp.responsibilities}
                titleClassName="text-lg font-heading font-semibold text-[var(--serene-text)] mb-1"
                subtitleClassName="text-[var(--serene-text-muted)]"
                dateClassName="text-[var(--serene-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--serene-text)] leading-relaxed"
                highlightBullet={<span className="text-[var(--serene-accent)] mr-3 mt-1">&mdash;</span>}
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="skills" title="Skills" data={data.skills} containerClassName="section-container" titleClassName="section-title">
          <div className="space-y-4">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="flex flex-wrap items-baseline gap-x-1"
                categoryClassName="text-sm font-semibold text-[var(--serene-text)] uppercase tracking-wider mr-3"
                itemClassName="text-[var(--serene-text-muted)] text-sm after:content-[',_'] last:after:content-['']"
              />
            ))}
          </div>
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="projects" title="Projects" data={data.projects} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.projects}
            className="space-y-6"
            renderItem={(project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                nameClassName="text-lg font-heading font-semibold text-[var(--serene-text)] mb-1"
                techClassName="text-xs text-[var(--serene-text-muted)] bg-[var(--serene-border)] px-2 py-0.5 rounded mr-1.5 mb-1 inline-block"
                linkClassName="text-[var(--serene-text-muted)] hover:text-[var(--serene-text)] underline text-sm transition-colors"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="education" title="Education" data={data.education} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-6"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                endDate={edu.endDate}
                titleClassName="text-lg font-heading font-semibold text-[var(--serene-text)] mb-1"
                subtitleClassName="text-[var(--serene-text-muted)]"
                dateClassName="text-[var(--serene-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="certifications" title="Certifications" data={data.certifications} containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="space-y-3"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                nameClassName="font-heading font-semibold text-[var(--serene-text)]"
                detailClassName="text-[var(--serene-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <Section id="languages" title="Languages" data={data.languages} containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-6">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="flex items-baseline gap-2"
                nameClassName="text-[var(--serene-text)] font-semibold"
                proficiencyClassName="text-[var(--serene-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <hr className="divider max-w-3xl mx-auto" />

        <section>
          <div className="max-w-3xl mx-auto px-6 py-12">
            <ContactBar
              contact={data.contact}
              className="flex flex-wrap gap-6"
              linkClassName="text-[var(--serene-text-muted)] hover:text-[var(--serene-text)] transition-colors text-sm"
            />
          </div>
        </section>
      </main>

      <SereneFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src-generator/app/themes/serene/
git commit -m "feat(generator): build Serene theme — clean, minimal, spacious

Portfolio and targeted layouts with Source Serif 4 + Source Sans 3,
near-white palette, no hero banner, maximum whitespace, subtle dividers."
```

---

## Task 3: Jade Theme

**Files:**
- Delete: all files in `src-generator/app/themes/jade/`
- Create: `src-generator/app/themes/jade/theme.config.ts`
- Create: `src-generator/app/themes/jade/fonts.ts`
- Create: `src-generator/app/themes/jade/styles/theme.css`
- Create: `src-generator/app/themes/jade/components/JadeHeader.tsx`
- Create: `src-generator/app/themes/jade/components/JadeFooter.tsx`
- Create: `src-generator/app/themes/jade/portfolio.tsx`
- Create: `src-generator/app/themes/jade/targeted.tsx`

Jade is earthy, balanced, sophisticated. Audience: academics, researchers. Typography: Libre Baskerville (headings), Nunito Sans (body). Palette: earthy greens (#3d6b4f primary, #8fb380 secondary), warm off-white backgrounds (#f4f7f2). Publications and education elevated. Citation-style formatting.

- [ ] **Step 1: Delete legacy Jade files**

```bash
cd src-generator
rm -rf app/themes/jade/
mkdir -p app/themes/jade/components app/themes/jade/styles
```

- [ ] **Step 2: Create theme config**

Create `src-generator/app/themes/jade/theme.config.ts`:

```typescript
import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'jade',
  name: 'Jade',
  description: 'Earthy, balanced, sophisticated',
  audience: 'Academics, researchers',
  fonts: {
    heading: 'Libre Baskerville',
    body: 'Nunito Sans',
  },
  colors: {
    primary: '#3d6b4f',
    accent: '#8fb380',
    background: '#f4f7f2',
    surface: '#ffffff',
    text: '#2a3a2e',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
```

- [ ] **Step 3: Create font declarations**

Create `src-generator/app/themes/jade/fonts.ts`:

```typescript
import { Libre_Baskerville, Nunito_Sans } from 'next/font/google';

export const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-heading',
  display: 'swap',
});

export const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
```

- [ ] **Step 4: Create theme CSS**

Create `src-generator/app/themes/jade/styles/theme.css`:

```css
.jade-theme {
  --jade-primary: #3d6b4f;
  --jade-primary-light: #4e8a64;
  --jade-secondary: #8fb380;
  --jade-bg: #f4f7f2;
  --jade-surface: #ffffff;
  --jade-text: #2a3a2e;
  --jade-text-muted: #5a6e5f;
  --jade-border: #d4e0d7;
}

.jade-theme .section-container {
  @apply max-w-5xl mx-auto px-6 py-16 md:py-20;
}

.jade-theme .section-title {
  @apply text-2xl md:text-3xl font-heading font-bold mb-8 text-[var(--jade-primary)] border-b-2 border-[var(--jade-secondary)] pb-3 inline-block;
}

.jade-theme .card {
  @apply bg-[var(--jade-surface)] rounded-lg p-6 border border-[var(--jade-border)] shadow-sm;
}

.jade-theme .tag {
  @apply text-sm bg-[var(--jade-bg)] text-[var(--jade-primary)] px-3 py-1 rounded border border-[var(--jade-border)];
}
```

- [ ] **Step 5: Create JadeHeader component**

Create `src-generator/app/themes/jade/components/JadeHeader.tsx`:

```tsx
import React from 'react';
import { Profile } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface JadeHeaderProps {
  profile: Profile;
  subtitle?: string;
}

export function JadeHeader({ profile, subtitle }: JadeHeaderProps) {
  return (
    <header className="bg-[var(--jade-primary)] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-8">
          <PhotoFrame
            src={profile.photo}
            alt={profile.fullName}
            shape="circle"
            size="w-28 h-28"
            className="border-4 border-[var(--jade-secondary)]"
          />
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold">
              {profile.fullName}
            </h1>
            <p className="text-xl text-[var(--jade-secondary)] mt-2">{profile.title}</p>
            {subtitle && (
              <p className="text-white/80 mt-1 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {profile.summary && (
          <p className="text-white/90 mt-8 max-w-3xl leading-relaxed text-lg">
            {profile.summary}
          </p>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create JadeFooter component**

Create `src-generator/app/themes/jade/components/JadeFooter.tsx`:

```tsx
import React from 'react';

interface JadeFooterProps {
  fullName: string;
}

export function JadeFooter({ fullName }: JadeFooterProps) {
  return (
    <footer className="bg-[var(--jade-primary)] py-8">
      <div className="max-w-5xl mx-auto px-6 text-center text-[var(--jade-secondary)]">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create portfolio layout**

Create `src-generator/app/themes/jade/portfolio.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, PublicationItem, AwardItem, LanguageItem } from '@/primitives';
import { JadeHeader } from './components/JadeHeader';
import { JadeFooter } from './components/JadeFooter';
import './styles/theme.css';

interface JadePortfolioProps {
  data: PortfolioData;
}

export default function JadePortfolio({ data }: JadePortfolioProps) {
  return (
    <div className="jade-theme min-h-screen bg-[var(--jade-bg)] text-[var(--jade-text)] font-body">
      <JadeHeader profile={data.profile} />

      <main>
        <Section id="publications" title="Publications" data={data.publications} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-4"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="py-3 border-b border-[var(--jade-border)] last:border-b-0"
                titleClassName="font-heading font-bold text-[var(--jade-text)]"
                detailClassName="text-[var(--jade-text-muted)] text-sm italic ml-1"
                linkClassName="font-heading font-bold text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)]"
              />
            )}
          />
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-8"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                startDate={edu.startDate}
                endDate={edu.endDate}
                notes={edu.notes}
                className="card"
                titleClassName="text-xl font-heading font-bold text-[var(--jade-text)] mb-1"
                subtitleClassName="text-lg text-[var(--jade-primary)]"
                dateClassName="text-[var(--jade-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-8"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                location={exp.location}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-xl font-heading font-bold text-[var(--jade-text)] mb-1"
                subtitleClassName="text-lg text-[var(--jade-primary)]"
                dateClassName="text-[var(--jade-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--jade-text)]"
                highlightBullet={<span className="text-[var(--jade-secondary)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card"
                nameClassName="text-lg font-heading font-bold text-[var(--jade-text)] mb-2"
                techClassName="tag mr-1.5 mb-1.5 inline-block"
                linkClassName="text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)] transition-colors text-sm"
              />
            ))}
          </div>
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-lg font-heading font-bold text-[var(--jade-primary)] mb-3"
                itemClassName="tag mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="awards" title="Awards" data={data.awards} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.awards}
            className="space-y-4"
            renderItem={(award, idx) => (
              <AwardItem
                key={idx}
                award={award}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--jade-text)]"
                detailClassName="text-[var(--jade-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="font-heading font-bold text-[var(--jade-text)]"
                detailClassName="text-[var(--jade-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="volunteer" title="Volunteer" data={data.volunteer} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.volunteer}
            className="space-y-6"
            renderItem={(vol, idx) => (
              <TimelineEntry
                key={idx}
                title={vol.role || ''}
                subtitle={vol.organization}
                startDate={vol.startDate}
                endDate={vol.endDate}
                description={vol.description}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--jade-text)] mb-1"
                subtitleClassName="text-[var(--jade-primary)]"
                dateClassName="text-[var(--jade-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-4">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-[var(--jade-text)] font-bold"
                proficiencyClassName="text-[var(--jade-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <Section id="contact" title="Contact" data={data.contact} className="bg-[var(--jade-surface)]" containerClassName="section-container text-center" titleClassName="section-title">
          <ContactBar
            contact={data.contact}
            className="flex flex-col items-center space-y-4"
            linkClassName="text-lg text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)] transition-colors"
          />
        </Section>
      </main>

      <JadeFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 8: Create targeted layout**

Create `src-generator/app/themes/jade/targeted.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, PublicationItem, LanguageItem } from '@/primitives';
import { JadeHeader } from './components/JadeHeader';
import { JadeFooter } from './components/JadeFooter';
import './styles/theme.css';

interface JadeTargetedProps {
  data: PortfolioData;
}

export default function JadeTargeted({ data }: JadeTargetedProps) {
  const subtitle = data.jobPosting
    ? `for ${data.jobPosting.title} at ${data.jobPosting.company}`
    : undefined;

  return (
    <div className="jade-theme min-h-screen bg-[var(--jade-bg)] text-[var(--jade-text)] font-body">
      <JadeHeader profile={data.profile} subtitle={subtitle} />

      <main>
        <Section id="publications" title="Publications" data={data.publications} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-3"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="py-2 border-b border-[var(--jade-border)] last:border-b-0"
                titleClassName="font-heading font-bold text-[var(--jade-text)]"
                detailClassName="text-[var(--jade-text-muted)] text-sm italic ml-1"
                linkClassName="font-heading font-bold text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)]"
              />
            )}
          />
        </Section>

        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-6"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--jade-text)] mb-1"
                subtitleClassName="text-[var(--jade-primary)]"
                dateClassName="text-[var(--jade-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--jade-text)]"
                highlightBullet={<span className="text-[var(--jade-secondary)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-6"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                endDate={edu.endDate}
                notes={edu.notes}
                className="card"
                titleClassName="text-lg font-heading font-bold text-[var(--jade-text)] mb-1"
                subtitleClassName="text-[var(--jade-primary)]"
                dateClassName="text-[var(--jade-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-lg font-heading font-bold text-[var(--jade-primary)] mb-3"
                itemClassName="tag mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card"
                nameClassName="text-lg font-heading font-bold text-[var(--jade-text)] mb-2"
                techClassName="tag mr-1.5 mb-1.5 inline-block"
                linkClassName="text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)] text-sm transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--jade-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="font-heading font-bold text-[var(--jade-text)]"
                detailClassName="text-[var(--jade-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--jade-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-4">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-[var(--jade-text)] font-bold"
                proficiencyClassName="text-[var(--jade-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <section className="bg-[var(--jade-surface)]">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <ContactBar
              contact={data.contact}
              className="flex flex-wrap justify-center gap-6"
              linkClassName="text-[var(--jade-primary)] hover:text-[var(--jade-primary-light)] transition-colors"
            />
          </div>
        </section>
      </main>

      <JadeFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src-generator/app/themes/jade/
git commit -m "feat(generator): build Jade theme — earthy, balanced, sophisticated

Portfolio and targeted layouts with Libre Baskerville + Nunito Sans,
earthy green palette, publications-first section order, academic styling."
```

---

## Task 4: Quartz Theme

**Files:**
- Delete: all files in `src-generator/app/themes/quartz/`
- Create: `src-generator/app/themes/quartz/theme.config.ts`
- Create: `src-generator/app/themes/quartz/fonts.ts`
- Create: `src-generator/app/themes/quartz/styles/theme.css`
- Create: `src-generator/app/themes/quartz/components/QuartzHeader.tsx`
- Create: `src-generator/app/themes/quartz/components/QuartzFooter.tsx`
- Create: `src-generator/app/themes/quartz/portfolio.tsx`
- Create: `src-generator/app/themes/quartz/targeted.tsx`

Quartz is light, crisp, corporate. Audience: business and finance professionals. Typography: Inter for both headings and body, heavier weights for hierarchy. Palette: white backgrounds, navy/blue accent (#3355cc), structured gray tones. Metrics and quantified results highlighted. Clean grid layout.

- [ ] **Step 1: Delete legacy Quartz files**

```bash
cd src-generator
rm -rf app/themes/quartz/
mkdir -p app/themes/quartz/components app/themes/quartz/styles
```

- [ ] **Step 2: Create theme config**

Create `src-generator/app/themes/quartz/theme.config.ts`:

```typescript
import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'quartz',
  name: 'Quartz',
  description: 'Light, crisp, corporate',
  audience: 'Business and finance professionals',
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  colors: {
    primary: '#3355cc',
    accent: '#5577ee',
    background: '#ffffff',
    surface: '#f8f9fb',
    text: '#1a1a2e',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
```

- [ ] **Step 3: Create font declarations**

Create `src-generator/app/themes/quartz/fonts.ts`:

```typescript
import { Inter } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

// Quartz uses Inter for both heading and body
export const interBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
```

- [ ] **Step 4: Create theme CSS**

Create `src-generator/app/themes/quartz/styles/theme.css`:

```css
.quartz-theme {
  --quartz-primary: #3355cc;
  --quartz-primary-light: #5577ee;
  --quartz-bg: #ffffff;
  --quartz-surface: #f8f9fb;
  --quartz-text: #1a1a2e;
  --quartz-text-muted: #6b7280;
  --quartz-border: #e5e7eb;
  --quartz-navy: #1e2a4a;
}

.quartz-theme .section-container {
  @apply max-w-6xl mx-auto px-6 py-14 md:py-20;
}

.quartz-theme .section-title {
  @apply text-2xl font-heading font-bold mb-8 text-[var(--quartz-navy)] uppercase tracking-wide text-sm;
}

.quartz-theme .card {
  @apply bg-[var(--quartz-bg)] rounded-lg p-6 border border-[var(--quartz-border)] hover:border-[var(--quartz-primary-light)] transition-colors;
}

.quartz-theme .metric {
  @apply text-sm font-bold text-[var(--quartz-primary)] bg-[var(--quartz-surface)] px-3 py-1 rounded-full border border-[var(--quartz-border)];
}
```

- [ ] **Step 5: Create QuartzHeader component**

Create `src-generator/app/themes/quartz/components/QuartzHeader.tsx`:

```tsx
import React from 'react';
import { Profile, JobPosting } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface QuartzHeaderProps {
  profile: Profile;
  jobPosting?: JobPosting;
}

export function QuartzHeader({ profile, jobPosting }: QuartzHeaderProps) {
  return (
    <header className="bg-[var(--quartz-navy)] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-6">
          <PhotoFrame
            src={profile.photo}
            alt={profile.fullName}
            shape="square"
            size="w-20 h-20"
            className="rounded-lg"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold">
              {profile.fullName}
            </h1>
            <p className="text-lg text-blue-300 mt-1">{profile.title}</p>
            {jobPosting && (
              <p className="text-sm text-blue-200/80 mt-1">
                {jobPosting.title} at {jobPosting.company}
              </p>
            )}
          </div>
        </div>
        {profile.summary && (
          <p className="text-white/80 mt-6 max-w-3xl leading-relaxed">
            {profile.summary}
          </p>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create QuartzFooter component**

Create `src-generator/app/themes/quartz/components/QuartzFooter.tsx`:

```tsx
import React from 'react';

interface QuartzFooterProps {
  fullName: string;
}

export function QuartzFooter({ fullName }: QuartzFooterProps) {
  return (
    <footer className="bg-[var(--quartz-navy)] py-6">
      <div className="max-w-6xl mx-auto px-6 text-center text-blue-300 text-sm">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create portfolio layout**

Create `src-generator/app/themes/quartz/portfolio.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, PublicationItem, AwardItem, LanguageItem } from '@/primitives';
import { QuartzHeader } from './components/QuartzHeader';
import { QuartzFooter } from './components/QuartzFooter';
import './styles/theme.css';

interface QuartzPortfolioProps {
  data: PortfolioData;
}

export default function QuartzPortfolio({ data }: QuartzPortfolioProps) {
  return (
    <div className="quartz-theme min-h-screen bg-[var(--quartz-bg)] text-[var(--quartz-text)] font-body">
      <QuartzHeader profile={data.profile} />

      <main>
        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-8"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                location={exp.location}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-xl font-bold text-[var(--quartz-text)] mb-1"
                subtitleClassName="text-lg text-[var(--quartz-primary)]"
                dateClassName="text-[var(--quartz-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--quartz-text)]"
                highlightBullet={<span className="text-[var(--quartz-primary)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-sm font-bold text-[var(--quartz-navy)] uppercase tracking-wider mb-3"
                itemClassName="metric mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card"
                nameClassName="text-lg font-bold text-[var(--quartz-text)] mb-2"
                techClassName="metric mr-1.5 mb-1.5 inline-block"
                linkClassName="text-[var(--quartz-primary)] hover:text-[var(--quartz-primary-light)] font-medium text-sm transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-6"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                startDate={edu.startDate}
                endDate={edu.endDate}
                notes={edu.notes}
                className="card"
                titleClassName="text-xl font-bold text-[var(--quartz-text)] mb-1"
                subtitleClassName="text-lg text-[var(--quartz-primary)]"
                dateClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="font-bold text-[var(--quartz-text)]"
                detailClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="awards" title="Awards" data={data.awards} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.awards}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(award, idx) => (
              <AwardItem
                key={idx}
                award={award}
                className="card"
                titleClassName="font-bold text-[var(--quartz-text)]"
                detailClassName="text-[var(--quartz-text-muted)] text-sm ml-2"
              />
            )}
          />
        </Section>

        <Section id="publications" title="Publications" data={data.publications} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-4"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="card flex flex-col gap-1"
                titleClassName="font-bold text-[var(--quartz-text)]"
                detailClassName="text-[var(--quartz-text-muted)] text-sm ml-2"
                linkClassName="font-bold text-[var(--quartz-primary)] hover:text-[var(--quartz-primary-light)]"
              />
            )}
          />
        </Section>

        <Section id="volunteer" title="Volunteer" data={data.volunteer} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.volunteer}
            className="space-y-6"
            renderItem={(vol, idx) => (
              <TimelineEntry
                key={idx}
                title={vol.role || ''}
                subtitle={vol.organization}
                startDate={vol.startDate}
                endDate={vol.endDate}
                description={vol.description}
                className="card"
                titleClassName="text-lg font-bold text-[var(--quartz-text)] mb-1"
                subtitleClassName="text-[var(--quartz-primary)]"
                dateClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-3">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-[var(--quartz-text)] font-bold"
                proficiencyClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <Section id="contact" title="Contact" data={data.contact} className="bg-[var(--quartz-surface)]" containerClassName="section-container text-center" titleClassName="section-title">
          <ContactBar
            contact={data.contact}
            className="flex flex-col items-center space-y-3"
            linkClassName="text-[var(--quartz-primary)] hover:text-[var(--quartz-primary-light)] font-medium transition-colors"
          />
        </Section>
      </main>

      <QuartzFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 8: Create targeted layout**

Create `src-generator/app/themes/quartz/targeted.tsx`:

```tsx
import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, SkillGroup, CertificationItem, LanguageItem } from '@/primitives';
import { QuartzHeader } from './components/QuartzHeader';
import { QuartzFooter } from './components/QuartzFooter';
import './styles/theme.css';

interface QuartzTargetedProps {
  data: PortfolioData;
}

export default function QuartzTargeted({ data }: QuartzTargetedProps) {
  return (
    <div className="quartz-theme min-h-screen bg-[var(--quartz-bg)] text-[var(--quartz-text)] font-body">
      <QuartzHeader profile={data.profile} jobPosting={data.jobPosting} />

      <main>
        <Section id="experience" title="Experience" data={data.workExperience} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.workExperience}
            className="space-y-6"
            renderItem={(exp, idx) => (
              <TimelineEntry
                key={idx}
                title={exp.title}
                subtitle={exp.company}
                startDate={exp.startDate}
                endDate={exp.endDate}
                highlights={exp.responsibilities}
                className="card"
                titleClassName="text-lg font-bold text-[var(--quartz-text)] mb-1"
                subtitleClassName="text-[var(--quartz-primary)]"
                dateClassName="text-[var(--quartz-text-muted)] text-sm"
                highlightClassName="flex items-start text-[var(--quartz-text)]"
                highlightBullet={<span className="text-[var(--quartz-primary)] mr-2 mt-1">&bull;</span>}
              />
            )}
          />
        </Section>

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.skills.map((skill, idx) => (
              <SkillGroup
                key={idx}
                skill={skill}
                className="card"
                categoryClassName="text-sm font-bold text-[var(--quartz-navy)] uppercase tracking-wider mb-3"
                itemClassName="metric mr-2 mb-2 inline-block"
              />
            ))}
          </div>
        </Section>

        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card"
                nameClassName="text-lg font-bold text-[var(--quartz-text)] mb-2"
                techClassName="metric mr-1.5 mb-1.5 inline-block"
                linkClassName="text-[var(--quartz-primary)] hover:text-[var(--quartz-primary-light)] font-medium text-sm transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.education}
            className="space-y-4"
            renderItem={(edu, idx) => (
              <TimelineEntry
                key={idx}
                title={edu.institution}
                subtitle={`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`}
                endDate={edu.endDate}
                className="card"
                titleClassName="text-lg font-bold text-[var(--quartz-text)] mb-1"
                subtitleClassName="text-[var(--quartz-primary)]"
                dateClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--quartz-bg)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="font-bold text-[var(--quartz-text)]"
                detailClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--quartz-surface)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-3">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-[var(--quartz-text)] font-bold"
                proficiencyClassName="text-[var(--quartz-text-muted)] text-sm"
              />
            ))}
          </div>
        </Section>

        <section className="bg-[var(--quartz-bg)]">
          <div className="max-w-6xl mx-auto px-6 py-12 text-center">
            <ContactBar
              contact={data.contact}
              className="flex flex-wrap justify-center gap-6"
              linkClassName="text-[var(--quartz-primary)] hover:text-[var(--quartz-primary-light)] font-medium transition-colors"
            />
          </div>
        </section>
      </main>

      <QuartzFooter fullName={data.profile.fullName} />
    </div>
  );
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src-generator/app/themes/quartz/
git commit -m "feat(generator): build Quartz theme — light, crisp, corporate

Portfolio and targeted layouts with Inter typography, navy/blue accent,
structured grid, corporate styling with metric-highlighted skills."
```

---

## Task 5: Wire All Themes Through Router

**Files:**
- Modify: `src-generator/app/page.tsx`

**Depends on:** Tasks 1-4 (all themes must exist)

- [ ] **Step 1: Update page.tsx to route all themes**

Replace `src-generator/app/page.tsx`:

```tsx
import { loadPortfolioData } from './lib/loadPortfolioData';

import { jetbrainsMono, inter as onyxInter } from './themes/onyx/fonts';
import OnyxPortfolio from './themes/onyx/portfolio';
import OnyxTargeted from './themes/onyx/targeted';

import { poppins, dmSans } from './themes/coral/fonts';
import CoralPortfolio from './themes/coral/portfolio';
import CoralTargeted from './themes/coral/targeted';

import { sourceSerif, sourceSans } from './themes/serene/fonts';
import SerenePortfolio from './themes/serene/portfolio';
import SereneTargeted from './themes/serene/targeted';

import { libreBaskerville, nunitoSans } from './themes/jade/fonts';
import JadePortfolio from './themes/jade/portfolio';
import JadeTargeted from './themes/jade/targeted';

import { inter as quartzInter, interBody as quartzInterBody } from './themes/quartz/fonts';
import QuartzPortfolio from './themes/quartz/portfolio';
import QuartzTargeted from './themes/quartz/targeted';

export default function Home() {
  const data = loadPortfolioData();
  const themeName = data.theme.name.toLowerCase();
  const isTargeted = data.siteType === 'targeted';

  switch (themeName) {
    case 'coral': {
      const fontClasses = `${poppins.variable} ${dmSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <CoralTargeted data={data} /> : <CoralPortfolio data={data} />}</div>;
    }
    case 'serene': {
      const fontClasses = `${sourceSerif.variable} ${sourceSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <SereneTargeted data={data} /> : <SerenePortfolio data={data} />}</div>;
    }
    case 'jade': {
      const fontClasses = `${libreBaskerville.variable} ${nunitoSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <JadeTargeted data={data} /> : <JadePortfolio data={data} />}</div>;
    }
    case 'quartz': {
      const fontClasses = `${quartzInter.variable} ${quartzInterBody.variable}`;
      return <div className={fontClasses}>{isTargeted ? <QuartzTargeted data={data} /> : <QuartzPortfolio data={data} />}</div>;
    }
    case 'onyx':
    default: {
      const fontClasses = `${jetbrainsMono.variable} ${onyxInter.variable}`;
      return <div className={fontClasses}>{isTargeted ? <OnyxTargeted data={data} /> : <OnyxPortfolio data={data} />}</div>;
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all generator tests**

Run: `cd src-generator && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src-generator/app/page.tsx
git commit -m "feat(generator): wire all 5 themes through page router

Router switch handles onyx, coral, serene, jade, quartz with
both portfolio and targeted layouts. Onyx remains default."
```

---

## Task 6: GET /api/themes Endpoint

**Files:**
- Create: `src-api/app/routers/themes.py`
- Create: `src-api/tests/unit/test_themes_router.py`
- Modify: `src-api/app/main.py`

**Depends on:** Tasks 1-4 (theme configs must exist to define the source of truth)

This endpoint returns theme metadata for the admin UI. The data is static — it matches the theme configs in the generator. Rather than reading from the generator filesystem at runtime (which would couple the API to the generator container), we define the theme registry in Python. This stays in sync because both are derived from the same spec.

- [ ] **Step 1: Write failing tests**

Create `src-api/tests/unit/test_themes_router.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


class TestListThemes:
    @pytest.mark.asyncio
    async def test_returns_all_themes(self, client):
        resp = await client.get("/api/themes")
        assert resp.status_code == 200
        themes = resp.json()
        assert len(themes) == 5
        slugs = [t["slug"] for t in themes]
        assert set(slugs) == {"onyx", "coral", "serene", "jade", "quartz"}

    @pytest.mark.asyncio
    async def test_theme_has_required_fields(self, client):
        resp = await client.get("/api/themes")
        theme = resp.json()[0]
        assert "slug" in theme
        assert "name" in theme
        assert "description" in theme
        assert "audience" in theme
        assert "fonts" in theme
        assert "heading" in theme["fonts"]
        assert "body" in theme["fonts"]
        assert "colors" in theme
        assert "primary" in theme["colors"]
        assert "accent" in theme["colors"]
        assert "background" in theme["colors"]

    @pytest.mark.asyncio
    async def test_onyx_theme_data(self, client):
        resp = await client.get("/api/themes")
        themes = resp.json()
        onyx = next(t for t in themes if t["slug"] == "onyx")
        assert onyx["name"] == "Onyx"
        assert onyx["description"] == "Dark, technical, sharp edges"
        assert onyx["audience"] == "Developers, engineers"
        assert onyx["fonts"]["heading"] == "JetBrains Mono"
        assert onyx["colors"]["primary"] == "#0a0a0a"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_themes_router.py -v`
Expected: FAIL — 404 on `/api/themes`

- [ ] **Step 3: Implement the themes router**

Create `src-api/app/routers/themes.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/themes", tags=["themes"])

THEMES = [
    {
        "slug": "onyx",
        "name": "Onyx",
        "description": "Dark, technical, sharp edges",
        "audience": "Developers, engineers",
        "fonts": {"heading": "JetBrains Mono", "body": "Inter"},
        "colors": {
            "primary": "#0a0a0a",
            "accent": "#7c8aff",
            "background": "#0a0a0a",
            "surface": "#1a1a1a",
            "text": "#e0e0e0",
        },
    },
    {
        "slug": "coral",
        "name": "Coral",
        "description": "Warm, bold, energetic",
        "audience": "Creative professionals, designers",
        "fonts": {"heading": "Poppins", "body": "DM Sans"},
        "colors": {
            "primary": "#d4553a",
            "accent": "#f4a261",
            "background": "#fffaf7",
            "surface": "#fff5f0",
            "text": "#2d2420",
        },
    },
    {
        "slug": "serene",
        "name": "Serene",
        "description": "Clean, minimal, spacious",
        "audience": "Consultants, executives",
        "fonts": {"heading": "Source Serif 4", "body": "Source Sans 3"},
        "colors": {
            "primary": "#2c3e50",
            "accent": "#7f8c8d",
            "background": "#fafbfc",
            "surface": "#ffffff",
            "text": "#2c3e50",
        },
    },
    {
        "slug": "jade",
        "name": "Jade",
        "description": "Earthy, balanced, sophisticated",
        "audience": "Academics, researchers",
        "fonts": {"heading": "Libre Baskerville", "body": "Nunito Sans"},
        "colors": {
            "primary": "#3d6b4f",
            "accent": "#8fb380",
            "background": "#f4f7f2",
            "surface": "#ffffff",
            "text": "#2a3a2e",
        },
    },
    {
        "slug": "quartz",
        "name": "Quartz",
        "description": "Light, crisp, corporate",
        "audience": "Business and finance professionals",
        "fonts": {"heading": "Inter", "body": "Inter"},
        "colors": {
            "primary": "#3355cc",
            "accent": "#5577ee",
            "background": "#ffffff",
            "surface": "#f8f9fb",
            "text": "#1a1a2e",
        },
    },
]


@router.get("")
async def list_themes():
    return THEMES
```

- [ ] **Step 4: Register the router in main.py**

In `src-api/app/main.py`, add the import and include:

Add to imports:
```python
from app.routers import auth, documents, job_postings, profile, settings as settings_router, sites, themes
```

Add after the existing `app.include_router` calls:
```python
app.include_router(themes.router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_themes_router.py -v`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src-api/app/routers/themes.py src-api/tests/unit/test_themes_router.py src-api/app/main.py
git commit -m "feat(api): add GET /api/themes endpoint with metadata for all 5 themes"
```

---

## Task 7: Run All Tests and Final Verification

**Depends on:** Tasks 1-6

- [ ] **Step 1: Run all Python tests**

Run: `cd src-api && uv run pytest tests/unit/ -v`
Expected: All tests PASS (including profile_transform, site_generator, and themes_router tests)

- [ ] **Step 2: Run all generator tests**

Run: `cd src-generator && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Verify TypeScript compiles with all themes**

Run: `cd src-generator && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit (if any fixups needed)**

Only if previous steps required fixes:

```bash
git add -A
git commit -m "fix: resolve test/type issues from theme integration"
```

---

## Summary

After Plan B is complete:
- 5 visually distinct themes (Onyx, Coral, Serene, Jade, Quartz)
- All themes use the primitives composition architecture
- Each theme has portfolio + targeted layout variants
- Router handles all 5 themes
- `GET /api/themes` endpoint serves theme metadata
- All legacy theme code removed
- All tests passing

**Plan C** (next phase) will cover:
- Live preview system (generator SSR mode + API preview endpoint)
- Admin UI theme picker redesign (card grid with preview iframe)
- Photo upload UI on the admin profile page
