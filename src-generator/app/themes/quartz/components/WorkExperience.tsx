import React from 'react';
import { WorkExperience as WorkExperienceType } from '@/types/portfolio';

interface WorkExperienceProps {
  experiences: WorkExperienceType[];
}

function formatDateRange(startDate: string, endDate: string): string {
  const formatDate = (date: string) => {
    if (date.toLowerCase() === 'present') return 'Present';
    const [year, month] = date.split('-');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export default function WorkExperience({ experiences }: WorkExperienceProps) {
  if (!experiences || experiences.length === 0) return null;

  return (
    <section id="experience" className="bg-quartz-900">
      <div className="section-container">
        <h2 className="section-title text-gray-900">Work Experience</h2>
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-quartz-700 hover:border-accent-purple transition-colors shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {exp.title}
                  </h3>
                  <p className="text-xl text-accent-purple">{exp.company}</p>
                </div>
                <div className="mt-2 md:mt-0 text-gray-600 text-sm md:text-right">
                  <p>{formatDateRange(exp.startDate, exp.endDate)}</p>
                  {exp.location && <p>{exp.location}</p>}
                </div>
              </div>
              {exp.responsibilities && exp.responsibilities.length > 0 && (
                <ul className="space-y-2 text-gray-700">
                  {exp.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-accent-purple mr-2 mt-1">▹</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
