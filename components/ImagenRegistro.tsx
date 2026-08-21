import React, { useEffect, useState } from 'react';

interface ImagenRegistroProps {
  inventarios?: string[];
  tipoMaterial: string;
  className?: string;
  titulo?: string;
  hideFallback?: boolean;
}

export const ImagenRegistro: React.FC<ImagenRegistroProps> = ({ 
  inventarios = [], 
  tipoMaterial = "Libro",
  className = "w-16 h-24 md:w-20 md:h-28",
  titulo = "Material",
  hideFallback = false
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const inventariosStr = JSON.stringify(inventarios);

  useEffect(() => {
    let active = true;
    const fetchPhoto = async () => {
      setIsLoading(true);
      try {
        const configRaw = localStorage.getItem('sigb_config');
        if (configRaw) {
          const config = JSON.parse(configRaw);
          const dir = config.imagenes_registros_dir;
          if (dir && (window as any).electronAPI) {
            const parsedInventarios = JSON.parse(inventariosStr);
            const result = await (window as any).electronAPI.invoke('get-registro-imagen', dir, {
              inventarios: parsedInventarios
            });
            if (active) {
              setPhotoUrl(result);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error al obtener la imagen del registro:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
      if (active) {
        setPhotoUrl(null);
      }
    };

    fetchPhoto();
    return () => {
      active = false;
    };
  }, [inventariosStr]);

  if (photoUrl) {
    return (
      <div className={`${className} flex-shrink-0 relative rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-all duration-200 bg-white hover:shadow`}>
        <img 
          src={photoUrl} 
          alt={`Portada de ${titulo}`}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (hideFallback) {
    return <div className={`${className} flex-shrink-0 rounded-lg`} />;
  }

  // Opción visual alternativa según el tipo de material
  const getFallbackConfig = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('libro')) {
      return { emoji: '📖', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'LIBRO' };
    }
    if (t.includes('revista') || t.includes('seriada')) {
      return { emoji: '📰', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-600', label: 'REVISTA' };
    }
    if (t.includes('mapa') || t.includes('cartográfico') || t.includes('cartografico')) {
      return { emoji: '🗺️', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', label: 'MAPA' };
    }
    if (t.includes('gráfico') || t.includes('grafico')) {
      return { emoji: '🖼️', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: 'IMAGEN' };
    }
    if (t.includes('audio') || t.includes('grabación de sonido') || t.includes('sonido')) {
      return { emoji: '🎵', bg: 'bg-violet-50 border-violet-200', text: 'text-violet-600', label: 'AUDIO' };
    }
    if (t.includes('partitura')) {
      return { emoji: '🎼', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', label: 'MÚSICA' };
    }
    if (t.includes('video') || t.includes('película') || t.includes('pelicula')) {
      return { emoji: '🎬', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-600', label: 'VIDEO' };
    }
    if (t.includes('manuscrito')) {
      return { emoji: '📜', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600', label: 'MANUSCRITO' };
    }
    return { emoji: '📦', bg: 'bg-gray-100 border-gray-200', text: 'text-gray-500', label: 'OBJETO' };
  };

  const fallback = getFallbackConfig(tipoMaterial);

  return (
    <div className={`${className} flex-shrink-0 rounded-lg border flex flex-col items-center justify-center p-2 relative select-none shadow-inner ${fallback.bg} ${fallback.text}`}>
      <span className="text-3xl md:text-4xl mb-1 filter drop-shadow">{fallback.emoji}</span>
      <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">{fallback.label}</span>
    </div>
  );
};
