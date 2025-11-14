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
    <section id="education" className="bg-jade-900">
      <div className="section-container">
        <h2 className="section-title text-gray-800">Education</h2>
        <div className="space-y-6">
          {education.map((edu, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-jade-700 hover:border-accent-olive transition-colors shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {edu.institution}
                  </h3>
                  <p className="text-lg text-accent-olive">
                    {edu.degree}
                    {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                  </p>
                </div>
                {edu.endDate && (
                  <div className="mt-2 md:mt-0 text-gray-600 text-sm">
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
