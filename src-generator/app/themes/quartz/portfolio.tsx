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
