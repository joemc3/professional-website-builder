import React from 'react';
import { SkillCategory } from '@/types/portfolio';

interface OnyxSkillGridProps {
  skills: SkillCategory[];
}

export function OnyxSkillGrid({ skills }: OnyxSkillGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skills.map((category, index) => (
        <div key={index} className="card">
          <h3 className="text-xl font-heading font-bold text-[var(--accent-blue)] mb-4">
            {category.category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {category.items.map((skill, idx) => (
              <span key={idx} className="tech-tag">{skill}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
