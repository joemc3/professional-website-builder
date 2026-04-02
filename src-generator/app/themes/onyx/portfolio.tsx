import React from 'react';
import { PortfolioData } from '@/types/portfolio';
import { Section, SectionList, ContactBar, TimelineEntry, ProjectCard, CertificationItem, PublicationItem, AwardItem, LanguageItem } from '@/primitives';
import { OnyxNav } from './components/OnyxNav';
import { OnyxHero } from './components/OnyxHero';
import { OnyxSkillGrid } from './components/OnyxSkillGrid';
import { OnyxFooter } from './components/OnyxFooter';
import './styles/theme.css';

interface OnyxPortfolioProps {
  data: PortfolioData;
}

export default function OnyxPortfolio({ data }: OnyxPortfolioProps) {
  return (
    <div className="onyx-theme min-h-screen bg-[var(--onyx-950)] text-gray-100 font-body">
      <OnyxNav data={data} />

      <main>
        <OnyxHero profile={data.profile} />

        <Section id="skills" title="Skills" data={data.skills} className="bg-[var(--onyx-900)]" containerClassName="section-container" titleClassName="section-title">
          <OnyxSkillGrid skills={data.skills} />
        </Section>

        <Section id="experience" title="Work Experience" data={data.workExperience} className="bg-[var(--onyx-950)]" containerClassName="section-container" titleClassName="section-title">
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
                titleClassName="text-2xl font-bold text-white mb-1"
                subtitleClassName="text-xl text-[var(--accent-blue)]"
                dateClassName="text-gray-400 text-sm"
                highlightClassName="flex items-start text-gray-300"
                highlightBullet={<span className="text-[var(--accent-teal)] mr-2 mt-1">▹</span>}
              />
            )}
          />
        </Section>

        <Section id="projects" title="Projects" data={data.projects} className="bg-[var(--onyx-900)]" containerClassName="section-container" titleClassName="section-title">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.projects.map((project, idx) => (
              <ProjectCard
                key={idx}
                project={project}
                className="card group"
                nameClassName="text-xl font-bold text-white mb-3 group-hover:text-[var(--accent-blue)] transition-colors"
                techClassName="tech-tag"
                linkClassName="inline-flex items-center text-[var(--accent-blue)] hover:text-[var(--accent-teal)] transition-colors"
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education" data={data.education} className="bg-[var(--onyx-950)]" containerClassName="section-container" titleClassName="section-title">
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
                titleClassName="text-2xl font-bold text-white mb-1"
                subtitleClassName="text-lg text-[var(--accent-blue)]"
                dateClassName="text-gray-400 text-sm"
              />
            )}
          />
        </Section>

        <Section id="certifications" title="Certifications" data={data.certifications} className="bg-[var(--onyx-900)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.certifications}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            renderItem={(cert, idx) => (
              <CertificationItem
                key={idx}
                cert={cert}
                className="card"
                nameClassName="text-lg font-bold text-white"
                detailClassName="text-gray-400 text-sm"
              />
            )}
          />
        </Section>

        <Section id="publications" title="Publications" data={data.publications} className="bg-[var(--onyx-950)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.publications}
            className="space-y-4"
            renderItem={(pub, idx) => (
              <PublicationItem
                key={idx}
                pub={pub}
                className="card flex flex-col gap-1"
                titleClassName="text-lg font-bold text-white"
                detailClassName="text-gray-400 text-sm ml-2"
                linkClassName="text-lg font-bold text-[var(--accent-blue)] hover:text-[var(--accent-teal)]"
              />
            )}
          />
        </Section>

        <Section id="awards" title="Awards" data={data.awards} className="bg-[var(--onyx-900)]" containerClassName="section-container" titleClassName="section-title">
          <SectionList
            items={data.awards}
            className="space-y-4"
            renderItem={(award, idx) => (
              <AwardItem
                key={idx}
                award={award}
                className="card"
                titleClassName="text-lg font-bold text-white"
                detailClassName="text-gray-400 text-sm ml-2"
              />
            )}
          />
        </Section>

        <Section id="volunteer" title="Volunteer Experience" data={data.volunteer} className="bg-[var(--onyx-950)]" containerClassName="section-container" titleClassName="section-title">
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
                titleClassName="text-xl font-bold text-white mb-1"
                subtitleClassName="text-lg text-[var(--accent-blue)]"
                dateClassName="text-gray-400 text-sm"
              />
            )}
          />
        </Section>

        <Section id="languages" title="Languages" data={data.languages} className="bg-[var(--onyx-900)]" containerClassName="section-container" titleClassName="section-title">
          <div className="flex flex-wrap gap-4">
            {data.languages.map((lang, idx) => (
              <LanguageItem
                key={idx}
                lang={lang}
                className="card flex items-center gap-2 px-4 py-2"
                nameClassName="text-white font-bold"
                proficiencyClassName="text-gray-400 text-sm"
              />
            ))}
          </div>
        </Section>

        <Section id="contact" title="Get In Touch" data={data.contact} className="bg-[var(--onyx-950)]" containerClassName="section-container text-center" titleClassName="section-title">
          <p className="text-lg text-gray-300 mb-8">
            I&apos;m always open to discussing new projects, creative ideas, or opportunities.
          </p>
          <ContactBar
            contact={data.contact}
            className="flex flex-col items-center space-y-4"
            linkClassName="text-xl text-[var(--accent-blue)] hover:text-[var(--accent-teal)] transition-colors"
          />
        </Section>
      </main>

      <OnyxFooter fullName={data.profile.fullName} />
    </div>
  );
}
