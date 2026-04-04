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
