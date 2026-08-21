import React, { useEffect, useState } from 'react';

interface UserAvatarProps {
  dni: string;
  className?: string;
  fallbackSize?: string;
  nombre?: string;
  apellido?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  dni, 
  className = "w-10 h-10", 
  fallbackSize = "text-sm",
  nombre = "",
  apellido = ""
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPhoto = async () => {
      try {
        const configRaw = localStorage.getItem('sigb_config');
        if (configRaw) {
          const config = JSON.parse(configRaw);
          const dir = config.fotos_usuarios_dir;
          if (dir && (window as any).electronAPI) {
            const result = await (window as any).electronAPI.invoke('get-user-photo', dir, dni.trim());
            if (active) {
              setPhotoUrl(result);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error al obtener el avatar del usuario:", err);
      }
      if (active) {
        setPhotoUrl(null);
      }
    };

    fetchPhoto();
    return () => {
      active = false;
    };
  }, [dni]);

  if (photoUrl) {
    return (
      <img 
        src={photoUrl} 
        alt={`Foto de ${apellido} ${nombre}`}
        className={`${className} rounded-full object-cover shadow-sm border border-gray-200 transition-opacity duration-200`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Opción alternativa con iniciales de los Usuarios
  const initials = `${apellido ? apellido[0] : ''}${nombre ? nombre[0] : ''}`.toUpperCase().trim() || '👤';

  return (
    <div className={`${className} rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold ${fallbackSize} select-none`}>
      {initials.length > 0 ? initials : '👤'}
    </div>
  );
};
