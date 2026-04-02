import React from 'react';
import { Profile } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface OnyxHeroProps {
  profile: Profile;
}

export function OnyxHero({ profile }: OnyxHeroProps) {
  return (
    <section id="about" className="min-h-screen flex items-center justify-center pt-20">
      <div className="section-container text-center">
        <PhotoFrame
          src={profile.photo}
          alt={profile.fullName}
          shape="rounded"
          size="w-36 h-36"
          className="mx-auto mb-8"
        />
        <h1 className="text-5xl md:text-7xl font-heading font-bold mb-4 text-white">
          {profile.fullName}
        </h1>
        <h2 className="text-2xl md:text-3xl mb-8 gradient-text">
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
            className="inline-block bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-teal)] text-white font-semibold px-8 py-3 rounded-lg hover:shadow-lg hover:shadow-[var(--accent-blue)]/50 transition-all"
          >
            Get In Touch
          </a>
        </div>
      </div>
    </section>
  );
}
