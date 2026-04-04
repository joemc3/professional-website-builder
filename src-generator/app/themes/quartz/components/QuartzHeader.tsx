import React from 'react';
import { Profile, JobPosting } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface QuartzHeaderProps {
  profile: Profile;
  jobPosting?: JobPosting;
}

export function QuartzHeader({ profile, jobPosting }: QuartzHeaderProps) {
  return (
    <header className="bg-[var(--quartz-navy)] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-6">
          <PhotoFrame
            src={profile.photo}
            alt={profile.fullName}
            shape="square"
            size="w-20 h-20"
            className="rounded-lg"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold">
              {profile.fullName}
            </h1>
            <p className="text-lg text-blue-300 mt-1">{profile.title}</p>
            {jobPosting && (
              <p className="text-sm text-blue-200/80 mt-1">
                {jobPosting.title} at {jobPosting.company}
              </p>
            )}
          </div>
        </div>
        {profile.summary && (
          <p className="text-white/80 mt-6 max-w-3xl leading-relaxed">
            {profile.summary}
          </p>
        )}
      </div>
    </header>
  );
}
