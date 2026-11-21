import React, { useState } from 'react';
import AdminCoursesPending from './AdminCoursesPending';
import AdminBooksPending from './AdminBooksPending';
import { GraduationCap, BookOpen } from 'lucide-react';

export default function AdminContentTabs() {
  const [activeTab, setActiveTab] = useState<'courses' | 'books'>('courses');

  return (
    <div className="space-y-8">
      {/* Selector de pestañas */}
      <div className="flex border-b border-secondary/20 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-4 font-body text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'courses'
              ? 'border-secondary text-primary'
              : 'border-transparent text-primary/50 hover:text-primary hover:border-secondary/40'
          }`}
        >
          <GraduationCap size={18} />
          <span>Cursos Pendientes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('books')}
          className={`pb-3 px-4 font-body text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'books'
              ? 'border-secondary text-primary'
              : 'border-transparent text-primary/50 hover:text-primary hover:border-secondary/40'
          }`}
        >
          <BookOpen size={18} />
          <span>Libros Pendientes</span>
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'courses' ? (
        <AdminCoursesPending />
      ) : (
        <AdminBooksPending />
      )}
    </div>
  );
}
