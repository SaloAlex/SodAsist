import React, { useState } from 'react';

interface NotasFormProps {
  onSubmit: (nota: string) => void;
  initialValue?: string;
  className?: string;
}

export const NotasForm: React.FC<NotasFormProps> = ({
  onSubmit,
  initialValue = '',
  className = '',
}) => {
  const [nota, setNota] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nota.trim()) {
      onSubmit(nota.trim());
      setNota('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-2 ${className}`}>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Agregar nota..."
        className="w-full p-2 border rounded resize-y min-h-[100px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        aria-label="Nota de la visita"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!nota.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Guardar Nota
        </button>
      </div>
    </form>
  );
}; 