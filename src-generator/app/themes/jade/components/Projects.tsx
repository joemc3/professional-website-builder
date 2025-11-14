import React from 'react';
import { Project as ProjectType } from '@/types/portfolio';

interface ProjectsProps {
  projects: ProjectType[];
}

export default function Projects({ projects }: ProjectsProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <section id="projects" className="bg-jade-950">
      <div className="section-container">
        <h2 className="section-title text-gray-800">Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div key={index} className="bg-white rounded-lg p-6 border border-jade-700 hover:border-accent-olive transition-colors shadow-sm group">
              <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-accent-olive transition-colors">
                {project.name}
              </h3>
              <p className="text-gray-700 mb-4">{project.description}</p>
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-jade-800 text-accent-olive px-3 py-1 rounded-full border border-jade-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-accent-olive hover:text-green-800 transition-colors"
                >
                  View Project
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
