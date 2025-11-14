import React from 'react';
import { Profile as ProfileType } from '@/types/portfolio';

interface ProfileProps {
  profile: ProfileType;
}

export default function Profile({ profile }: ProfileProps) {
  return (
    <section
      id="about"
      className="min-h-screen flex items-center justify-center pt-20"
    >
      <div className="section-container text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-4">
          {profile.fullName}
        </h1>
        <h2 className="text-2xl md:text-3xl text-gray-400 mb-8 gradient-text">
          {profile.title}
        </h2>
        {profile.summary && (
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {profile.summary}
          </p>
        )}
        <div className="mt-12">
          <a
            href="#contact"
            className="inline-block bg-gradient-to-r from-accent-blue to-accent-teal text-white font-semibold px-8 py-3 rounded-lg hover:shadow-lg hover:shadow-accent-blue/50 transition-all"
          >
            Get In Touch
          </a>
        </div>
      </div>
    </section>
  );
}
