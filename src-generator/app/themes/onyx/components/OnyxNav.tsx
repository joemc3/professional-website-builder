import React from 'react';
import { PortfolioData } from '@/types/portfolio';

interface OnyxNavProps {
  data: PortfolioData;
}

export function OnyxNav({ data }: OnyxNavProps) {
  const links: { id: string; label: string }[] = [
    { id: 'about', label: 'About' },
  ];
  if (data.skills.length > 0) links.push({ id: 'skills', label: 'Skills' });
  if (data.workExperience.length > 0) links.push({ id: 'experience', label: 'Experience' });
  if (data.projects.length > 0) links.push({ id: 'projects', label: 'Projects' });
  if (data.education.length > 0) links.push({ id: 'education', label: 'Education' });
  links.push({ id: 'contact', label: 'Contact' });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--onyx-900)]/80 backdrop-blur-md border-b border-[var(--onyx-700)]">
      <nav className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-heading font-bold gradient-text">
            {data.profile.fullName}
          </div>
          <ul className="hidden md:flex space-x-8">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className="text-gray-300 hover:text-[var(--accent-blue)] transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
