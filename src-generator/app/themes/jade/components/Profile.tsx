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
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gray-800">
          {profile.fullName}
        </h1>
        <h2 className="text-2xl md:text-3xl text-gray-600 mb-8 bg-gradient-to-r from-accent-olive to-green-700 bg-clip-text text-transparent">
          {profile.title}
        </h2>
        {profile.summary && (
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            {profile.summary}
          </p>
        )}
        <div className="mt-12">
          <a
            href="#contact"
            className="inline-block bg-gradient-to-r from-accent-olive to-green-700 text-white font-semibold px-8 py-3 rounded-lg hover:shadow-lg hover:shadow-green-700/50 transition-all"
          >
            Get In Touch
          </a>
        </div>
      </div>
    </section>
  );
}
