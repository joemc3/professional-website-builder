import { useState } from 'react';
import {
  PortfolioData,
  WorkExperience,
  Project,
  Education,
  SkillCategory,
  SocialLink,
} from '../types/portfolio';

interface MainEditorProps {
  portfolioData: PortfolioData;
  onUpdate: (data: PortfolioData) => void;
  onNext: () => void;
  onBack: () => void;
}

type Section =
  | 'profile'
  | 'contact'
  | 'workExperience'
  | 'projects'
  | 'education'
  | 'skills';

export default function MainEditor({
  portfolioData,
  onUpdate,
  onNext,
  onBack,
}: MainEditorProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile');

  const updateData = (section: keyof PortfolioData, data: unknown) => {
    onUpdate({ ...portfolioData, [section]: data });
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Navigation */}
      <div className="w-64 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sections</h2>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'contact', label: 'Contact', icon: '📧' },
            { id: 'workExperience', label: 'Work Experience', icon: '💼' },
            { id: 'projects', label: 'Projects', icon: '🚀' },
            { id: 'education', label: 'Education', icon: '🎓' },
            { id: 'skills', label: 'Skills', icon: '⚡' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as Section)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div className="flex gap-2 mt-6">
          <button onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
        </div>
      </div>

      {/* Right Panel - Form Editor */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-y-auto">
        {activeSection === 'profile' && (
          <ProfileSection
            data={portfolioData.profile}
            onUpdate={(data) => updateData('profile', data)}
          />
        )}
        {activeSection === 'contact' && (
          <ContactSection
            data={portfolioData.contact}
            onUpdate={(data) => updateData('contact', data)}
          />
        )}
        {activeSection === 'workExperience' && (
          <WorkExperienceSection
            data={portfolioData.workExperience}
            onUpdate={(data) => updateData('workExperience', data)}
          />
        )}
        {activeSection === 'projects' && (
          <ProjectsSection
            data={portfolioData.projects}
            onUpdate={(data) => updateData('projects', data)}
          />
        )}
        {activeSection === 'education' && (
          <EducationSection
            data={portfolioData.education}
            onUpdate={(data) => updateData('education', data)}
          />
        )}
        {activeSection === 'skills' && (
          <SkillsSection
            data={portfolioData.skills}
            onUpdate={(data) => updateData('skills', data)}
          />
        )}

        {/* Next Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button onClick={onNext} className="btn-primary w-full">
            Next: Choose Theme
          </button>
        </div>
      </div>
    </div>
  );
}

// Profile Section Component
function ProfileSection({
  data,
  onUpdate,
}: {
  data: PortfolioData['profile'];
  onUpdate: (data: PortfolioData['profile']) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile</h2>

      <div>
        <label className="label">Full Name *</label>
        <input
          type="text"
          value={data.fullName}
          onChange={(e) => onUpdate({ ...data, fullName: e.target.value })}
          className="input-field"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label className="label">Professional Title *</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate({ ...data, title: e.target.value })}
          className="input-field"
          placeholder="Full-Stack Developer & AI Enthusiast"
        />
      </div>

      <div>
        <label className="label">Summary</label>
        <textarea
          value={data.summary || ''}
          onChange={(e) => onUpdate({ ...data, summary: e.target.value })}
          className="textarea-field"
          placeholder="A brief professional summary or biography (2-4 sentences)"
        />
      </div>
    </div>
  );
}

// Contact Section Component
function ContactSection({
  data,
  onUpdate,
}: {
  data: PortfolioData['contact'];
  onUpdate: (data: PortfolioData['contact']) => void;
}) {
  const addSocialLink = () => {
    onUpdate({
      ...data,
      socialLinks: [...(data.socialLinks || []), { platform: '', url: '' }],
    });
  };

  const updateSocialLink = (index: number, link: SocialLink) => {
    const links = [...(data.socialLinks || [])];
    links[index] = link;
    onUpdate({ ...data, socialLinks: links });
  };

  const removeSocialLink = (index: number) => {
    const links = (data.socialLinks || []).filter((_, i) => i !== index);
    onUpdate({ ...data, socialLinks: links });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Contact</h2>

      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={data.email || ''}
          onChange={(e) => onUpdate({ ...data, email: e.target.value })}
          className="input-field"
          placeholder="jane.doe@email.com"
        />
      </div>

      <div>
        <label className="label">Phone</label>
        <input
          type="tel"
          value={data.phone || ''}
          onChange={(e) => onUpdate({ ...data, phone: e.target.value })}
          className="input-field"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label className="label">Website</label>
        <input
          type="url"
          value={data.website || ''}
          onChange={(e) => onUpdate({ ...data, website: e.target.value })}
          className="input-field"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Social Links</label>
          <button onClick={addSocialLink} className="btn-primary text-sm py-1">
            + Add Link
          </button>
        </div>
        <div className="space-y-3">
          {(data.socialLinks || []).map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={link.platform}
                onChange={(e) =>
                  updateSocialLink(index, { ...link, platform: e.target.value })
                }
                className="input-field flex-1"
                placeholder="Platform (e.g., GitHub)"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) =>
                  updateSocialLink(index, { ...link, url: e.target.value })
                }
                className="input-field flex-1"
                placeholder="URL"
              />
              <button
                onClick={() => removeSocialLink(index)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Work Experience Section Component
function WorkExperienceSection({
  data,
  onUpdate,
}: {
  data: WorkExperience[];
  onUpdate: (data: WorkExperience[]) => void;
}) {
  const addExperience = () => {
    onUpdate([
      ...data,
      {
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        location: '',
        responsibilities: [],
      },
    ]);
  };

  const updateExperience = (index: number, exp: WorkExperience) => {
    const updated = [...data];
    updated[index] = exp;
    onUpdate(updated);
  };

  const removeExperience = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Work Experience</h2>
        <button onClick={addExperience} className="btn-primary">
          + Add Experience
        </button>
      </div>

      {data.map((exp, index) => (
        <div key={index} className="card bg-gray-50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Experience #{index + 1}
            </h3>
            <button
              onClick={() => removeExperience(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Company *</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) =>
                    updateExperience(index, { ...exp, company: e.target.value })
                  }
                  className="input-field"
                  placeholder="Tech Solutions Inc."
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  value={exp.location || ''}
                  onChange={(e) =>
                    updateExperience(index, { ...exp, location: e.target.value })
                  }
                  className="input-field"
                  placeholder="Remote"
                />
              </div>
            </div>

            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                value={exp.title}
                onChange={(e) =>
                  updateExperience(index, { ...exp, title: e.target.value })
                }
                className="input-field"
                placeholder="Software Engineer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date (YYYY-MM) *</label>
                <input
                  type="text"
                  value={exp.startDate}
                  onChange={(e) =>
                    updateExperience(index, { ...exp, startDate: e.target.value })
                  }
                  className="input-field"
                  placeholder="2020-01"
                />
              </div>
              <div>
                <label className="label">End Date (YYYY-MM or Present) *</label>
                <input
                  type="text"
                  value={exp.endDate}
                  onChange={(e) =>
                    updateExperience(index, { ...exp, endDate: e.target.value })
                  }
                  className="input-field"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="label">Responsibilities (one per line)</label>
              <textarea
                value={(exp.responsibilities || []).join('\n')}
                onChange={(e) =>
                  updateExperience(index, {
                    ...exp,
                    responsibilities: e.target.value.split('\n').filter((r) => r.trim()),
                  })
                }
                className="textarea-field"
                placeholder="Developed and maintained client-facing features&#10;Led the migration of a legacy system"
              />
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No work experience added yet. Click "Add Experience" to get started.
        </div>
      )}
    </div>
  );
}

// Projects Section Component
function ProjectsSection({
  data,
  onUpdate,
}: {
  data: Project[];
  onUpdate: (data: Project[]) => void;
}) {
  const addProject = () => {
    onUpdate([
      ...data,
      {
        name: '',
        description: '',
        technologies: [],
        url: '',
      },
    ]);
  };

  const updateProject = (index: number, project: Project) => {
    const updated = [...data];
    updated[index] = project;
    onUpdate(updated);
  };

  const removeProject = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <button onClick={addProject} className="btn-primary">
          + Add Project
        </button>
      </div>

      {data.map((project, index) => (
        <div key={index} className="card bg-gray-50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Project #{index + 1}
            </h3>
            <button
              onClick={() => removeProject(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Project Name *</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) =>
                  updateProject(index, { ...project, name: e.target.value })
                }
                className="input-field"
                placeholder="Portfolio Builder"
              />
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                value={project.description}
                onChange={(e) =>
                  updateProject(index, { ...project, description: e.target.value })
                }
                className="textarea-field"
                placeholder="A brief description of the project"
              />
            </div>

            <div>
              <label className="label">Technologies (comma-separated)</label>
              <input
                type="text"
                value={(project.technologies || []).join(', ')}
                onChange={(e) =>
                  updateProject(index, {
                    ...project,
                    technologies: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
                className="input-field"
                placeholder="Tauri, React, Rust, Next.js"
              />
            </div>

            <div>
              <label className="label">URL</label>
              <input
                type="url"
                value={project.url || ''}
                onChange={(e) =>
                  updateProject(index, { ...project, url: e.target.value })
                }
                className="input-field"
                placeholder="https://github.com/user/project"
              />
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No projects added yet. Click "Add Project" to get started.
        </div>
      )}
    </div>
  );
}

// Education Section Component
function EducationSection({
  data,
  onUpdate,
}: {
  data: Education[];
  onUpdate: (data: Education[]) => void;
}) {
  const addEducation = () => {
    onUpdate([
      ...data,
      {
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
      },
    ]);
  };

  const updateEducation = (index: number, edu: Education) => {
    const updated = [...data];
    updated[index] = edu;
    onUpdate(updated);
  };

  const removeEducation = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Education</h2>
        <button onClick={addEducation} className="btn-primary">
          + Add Education
        </button>
      </div>

      {data.map((edu, index) => (
        <div key={index} className="card bg-gray-50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Education #{index + 1}
            </h3>
            <button
              onClick={() => removeEducation(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Institution *</label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) =>
                  updateEducation(index, { ...edu, institution: e.target.value })
                }
                className="input-field"
                placeholder="State University"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Degree *</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducation(index, { ...edu, degree: e.target.value })
                  }
                  className="input-field"
                  placeholder="B.S."
                />
              </div>
              <div>
                <label className="label">Field of Study</label>
                <input
                  type="text"
                  value={edu.fieldOfStudy || ''}
                  onChange={(e) =>
                    updateEducation(index, { ...edu, fieldOfStudy: e.target.value })
                  }
                  className="input-field"
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Year (YYYY)</label>
                <input
                  type="text"
                  value={edu.startDate || ''}
                  onChange={(e) =>
                    updateEducation(index, { ...edu, startDate: e.target.value })
                  }
                  className="input-field"
                  placeholder="2016"
                />
              </div>
              <div>
                <label className="label">End Year (YYYY) *</label>
                <input
                  type="text"
                  value={edu.endDate}
                  onChange={(e) =>
                    updateEducation(index, { ...edu, endDate: e.target.value })
                  }
                  className="input-field"
                  placeholder="2020"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No education added yet. Click "Add Education" to get started.
        </div>
      )}
    </div>
  );
}

// Skills Section Component
function SkillsSection({
  data,
  onUpdate,
}: {
  data: SkillCategory[];
  onUpdate: (data: SkillCategory[]) => void;
}) {
  const addCategory = () => {
    onUpdate([
      ...data,
      {
        category: '',
        items: [],
      },
    ]);
  };

  const updateCategory = (index: number, cat: SkillCategory) => {
    const updated = [...data];
    updated[index] = cat;
    onUpdate(updated);
  };

  const removeCategory = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Skills</h2>
        <button onClick={addCategory} className="btn-primary">
          + Add Category
        </button>
      </div>

      {data.map((category, index) => (
        <div key={index} className="card bg-gray-50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Category #{index + 1}
            </h3>
            <button
              onClick={() => removeCategory(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Category Name *</label>
              <input
                type="text"
                value={category.category}
                onChange={(e) =>
                  updateCategory(index, { ...category, category: e.target.value })
                }
                className="input-field"
                placeholder="Programming Languages"
              />
            </div>

            <div>
              <label className="label">Skills (comma-separated) *</label>
              <textarea
                value={category.items.join(', ')}
                onChange={(e) =>
                  updateCategory(index, {
                    ...category,
                    items: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="textarea-field"
                placeholder="JavaScript, TypeScript, Python, Rust"
              />
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No skill categories added yet. Click "Add Category" to get started.
        </div>
      )}
    </div>
  );
}
