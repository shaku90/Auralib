
import React from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  libraryName?: string;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, libraryName }) => {
  const links = [
    { id: 'dashboard', label: 'Inicio' },
    { id: 'circulation', label: 'Préstamos' },
    { id: 'catalog', label: 'Catálogo' },
    { id: 'users', label: 'Usuarios' },
    { id: 'statistics', label: 'Estadísticas' },
    { id: 'settings', label: 'Configuración' },
  ];

  return (
    <nav className="bg-black shadow-md shrink-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white tracking-tight">Auralib</h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 h-16 ${
                    currentPage.startsWith(link.id)
                      ? 'border-blue-600 text-blue-400'
                      : 'border-transparent text-gray-400 hover:border-blue-600 hover:text-gray-200'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
