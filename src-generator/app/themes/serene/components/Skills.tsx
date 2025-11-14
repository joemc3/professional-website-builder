import React from 'react';
import { SkillCategory } from '@/types/portfolio';

interface SkillsProps {
  skills: SkillCategory[];
}

export default function Skills({ skills }: SkillsProps) {
  if (!skills || skills.length === 0) return null;

  return (
    <section id="skills" className="bg-serene-950">
      <div className="section-container">
        <h2 className="section-title text-gray-800">Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skillCategory, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-serene-700 hover:border-accent-teal-serene transition-colors shadow-sm">
              <h3 className="text-xl font-bold text-accent-teal-serene mb-4">
                {skillCategory.category}
              </h3>
              <ul className="space-y-2">
                {skillCategory.items.map((skill, idx) => (
                  <li key={idx} className="flex items-start text-gray-700">
                    <span className="text-accent-teal-serene mr-2">•</span>
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
