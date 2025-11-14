import React from 'react';
import { Education as EducationType } from '@/types/portfolio';

interface EducationProps {
  education: EducationType[];
}

function formatEducationDate(startDate?: string, endDate?: string): string {
  if (!endDate) return '';
  if (!startDate) return endDate;
  return `${startDate} - ${endDate}`;
}

export default function Education({ education }: EducationProps) {
  if (!education || education.length === 0) return null;

  return (
    <section id="education" className="bg-onyx-900">
      <div className="section-container">
        <h2 className="section-title">Education</h2>
        <div className="space-y-6">
          {education.map((edu, index) => (
            <div key={index} className="card">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {edu.institution}
                  </h3>
                  <p className="text-lg text-accent-blue">
                    {edu.degree}
                    {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                  </p>
                </div>
                {edu.endDate && (
                  <div className="mt-2 md:mt-0 text-gray-400 text-sm">
                    <p>{formatEducationDate(edu.startDate, edu.endDate)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
