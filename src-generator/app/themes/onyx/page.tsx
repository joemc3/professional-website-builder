import React from 'react';
import { loadPortfolioData } from '@/lib/loadPortfolioData';
import Header from './components/Header';
import Profile from './components/Profile';
import WorkExperience from './components/WorkExperience';
import Projects from './components/Projects';
import Education from './components/Education';
import Skills from './components/Skills';
import Contact from './components/Contact';

export default function OnyxTheme() {
  const data = loadPortfolioData();

  return (
    <div className="min-h-screen bg-onyx-950">
      <Header fullName={data.profile.fullName} />
      <main>
        <Profile profile={data.profile} />
        <WorkExperience experiences={data.workExperience} />
        <Projects projects={data.projects} />
        <Education education={data.education} />
        <Skills skills={data.skills} />
        <Contact contact={data.contact} />
      </main>
      <footer className="bg-onyx-900 border-t border-onyx-700 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-400">
          <p>
            © {new Date().getFullYear()} {data.profile.fullName}. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
