import React from 'react';

interface HeaderProps {
  fullName: string;
}

export default function Header({ fullName }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-quartz-700">
      <nav className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-accent-purple to-purple-600 bg-clip-text text-transparent">{fullName}</div>
          <ul className="flex space-x-8">
            <li>
              <a
                href="#about"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                About
              </a>
            </li>
            <li>
              <a
                href="#experience"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                Experience
              </a>
            </li>
            <li>
              <a
                href="#projects"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                Projects
              </a>
            </li>
            <li>
              <a
                href="#education"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                Education
              </a>
            </li>
            <li>
              <a
                href="#skills"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                Skills
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="text-gray-700 hover:text-accent-purple transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
