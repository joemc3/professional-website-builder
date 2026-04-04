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
