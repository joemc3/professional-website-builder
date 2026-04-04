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
