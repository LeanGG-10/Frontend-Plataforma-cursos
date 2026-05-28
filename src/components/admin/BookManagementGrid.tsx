import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { isEditing } from '../../store/adminStore';
import BookCardReact from '../BookCardReact';
import { Plus, Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { bookService, type Book } from '../../services/book.service';
import { categoryService, type Category } from '../../services/category.service';
import { formatPrice } from '../../utils/format';
import { Settings, Edit2, Trash, PlusCircle, Check, X as CloseIcon } from 'lucide-react';

interface Props {
  initialBooks: Book[];
}

const BookManagementGrid: React.FC<Props> = ({ initialBooks }) => {
  const editing = useStore(isEditing);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  
  // Dynamic Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  
  // Category Management State
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: 'Élite Educativa',
    categoryId: '',
    price: '',
    description: '',
  });

  const [files, setFiles] = useState<{
    cover: File | null;
    pdf: File | null;
  }>({
    cover: null,
    pdf: null
  });

  // Fetch books to keep list updated
  const refreshBooks = async () => {
    try {
      const data = await bookService.getAllBooks();
      setBooks(data);
      setError(null);
    } catch (error: any) {
      console.error('Error refreshing books:', error);
      setError(error.message);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data);
      setCategoryError(null);
      
      // Update filter in libros.astro dynamically
      const filterSelect = document.getElementById('category-filter') as HTMLSelectElement;
      if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="Todas">Todas</option>' + 
          data.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        filterSelect.value = data.some(c => c.name === currentValue) ? currentValue : 'Todas';
      }

      // Update pills in libros.astro dynamically
      const pillsContainer = document.getElementById('category-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML = data.map(cat => `
          <button 
            class="category-pill px-4 py-2 rounded-full border border-secondary/10 text-[11px] font-bold uppercase tracking-wider text-primary/60 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
            data-category="${cat.name}"
          >
            ${cat.name}
          </button>
        `).join('');
        
        // Re-attach listeners to new pills
        pillsContainer.querySelectorAll('.category-pill').forEach(pill => {
          pill.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const cat = target.getAttribute('data-category');
            if (cat) setCategoryFilter(cat);
          });
        });
      }
    } catch (err: any) {
      setCategoryError(err.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    refreshBooks();
    
    const filterSelect = document.getElementById('category-filter') as HTMLSelectElement;
    const handleFilterChange = (e: Event) => {
      setCategoryFilter((e.target as HTMLSelectElement).value);
    };
    
    filterSelect?.addEventListener('change', handleFilterChange);
    
    // Listen for category clicks (pills)
    const handlePillClick = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const cat = target.getAttribute('data-category');
      if (cat) setCategoryFilter(cat);
    };

    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => pill.addEventListener('click', handlePillClick));

    return () => {
      filterSelect?.removeEventListener('change', handleFilterChange);
      pills.forEach(pill => pill.removeEventListener('click', handlePillClick));
    };
  }, []);

  // Update count in libros.astro dynamically
  useEffect(() => {
    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = books.length.toString();
  }, [books]);

  const filteredBooks = books.filter(book => {
    if (categoryFilter === 'Todas') return true;
    const bookCategory = typeof book.category === 'object' && book.category !== null 
      ? (book.category as any).name 
      : book.category;
    return bookCategory === categoryFilter;
  });

  const handleDeleteClick = (id: string, title: string) => {
    setBookToDelete({ id, title });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setLoading(true);
    try {
      await bookService.deleteBook(bookToDelete.id);
      // Actualización inmediata del estado local para feedback instantáneo
      setBooks(prev => prev.filter(b => b.id !== bookToDelete.id));
      setShowDeleteModal(false);
      // Refresco opcional desde el servidor para sincronizar
      await refreshBooks();
    } catch (error) {
      alert('Error al eliminar el libro');
    } finally {
      setLoading(false);
    }
  };

  const handleAccess = (id: string) => {
    window.location.href = `/libros/${id}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'pdf') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.cover || !files.pdf) {
      alert('Por favor selecciona tanto la portada como el archivo PDF.');
      return;
    }

    setLoading(true);
    setUploadProgress(10); // Simulación inicial

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('categoryId', formData.categoryId);
      data.append('price', formData.price);
      data.append('description', formData.description);
      data.append('cover', files.cover);
      data.append('pdf', files.pdf);

      setUploadProgress(40);
      
      await bookService.createBook(data);
      
      setUploadProgress(100);
      
      setTimeout(async () => {
        await refreshBooks();
        setShowAddModal(false);
        resetForm();
      }, 500);

    } catch (error: any) {
      alert(error.message || 'Error al añadir el libro');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: 'Élite Educativa',
      categoryId: '',
      price: '',
      description: '',
    });
    setFiles({ cover: null, pdf: null });
  };

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await categoryService.createCategory(newCatName);
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      alert('Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    try {
      await categoryService.updateCategory(id, editingCatName);
      setEditingCatId(null);
      fetchCategories();
    } catch (err) {
      alert('Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await categoryService.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert('Error al eliminar categoría');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {editing && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="group h-[300px] border-2 border-dashed border-secondary/30 rounded-[12px] flex flex-col items-center justify-center gap-4 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all duration-500 cursor-pointer p-8"
            >
              <div className="w-16 h-16 rounded-full bg-secondary text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <Plus size={32} />
              </div>
              <div className="text-center">
                <span className="block text-lg font-display font-bold text-primary italic">Añadir Libro</span>
                <span className="text-xs font-body text-primary/40 uppercase tracking-widest mt-1">Nuevo recurso</span>
              </div>
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="group border border-secondary/20 rounded-[12px] py-4 flex items-center justify-center gap-3 bg-white hover:bg-secondary/5 transition-all duration-300 cursor-pointer"
            >
              <Settings size={18} className="text-secondary group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 group-hover:text-primary">Gestionar Categorías</span>
            </button>
          </div>
        )}

        {filteredBooks.map((book) => (
          <div key={book.id} className="book-item animate-in fade-in slide-in-from-bottom-5 duration-500">
            <BookCardReact 
              {...book} 
              price={formatPrice(book.price)}
              isEditing={editing} 
              onDelete={handleDeleteClick}
              onAccess={() => handleAccess(book.id)}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="py-32 text-center animate-in fade-in duration-500">
          <div className="max-w-md mx-auto p-8 bg-red-50 rounded-[20px] border border-red-100">
             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             <h3 className="text-2xl font-display text-red-900 italic mb-2">{error}</h3>
             <p className="text-red-700/60 font-body text-sm">Estamos trabajando para restablecer el servicio. Por favor, intenta de nuevo más tarde.</p>
             <button 
               onClick={() => refreshBooks()}
               className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all cursor-pointer"
             >
               Reintentar
             </button>
          </div>
        </div>
      )}

      {!error && filteredBooks.length === 0 && (
        <div className="py-32 text-center animate-in fade-in duration-500">
          <div className="max-w-md mx-auto">
             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#C9A44A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 opacity-20"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
             <h3 className="text-2xl font-display text-primary/60 italic mb-2">No se encontraron coincidencias</h3>
             <p className="text-primary/40 font-body text-sm">Prueba seleccionando otra categoría o restablece los filtros.</p>
          </div>
        </div>
      )}

      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => !loading && setShowDeleteModal(false)} 
        title="Confirmar Eliminación"
      >
        <div className="space-y-6">
          <p className="text-primary/70 font-body">
            ¿Estás seguro de eliminar <span className="font-bold text-primary">"{bookToDelete?.title}"</span>? 
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-4">
            <button 
              disabled={loading}
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-6 py-3 rounded-[12px] border border-secondary/20 font-bold text-xs uppercase tracking-widest text-primary hover:bg-tertiary transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDelete}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-[12px] bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          if (!loading) {
            setShowAddModal(false);
            resetForm();
          }
        }} 
        title="Nueva Obra Editorial"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Título de la Obra</label>
            <input 
              type="text" 
              required
              disabled={loading}
              placeholder="Ej. Matemática Avanzada Vol. 1"
              className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Categoría</label>
              <select 
                required
                disabled={loading || loadingCategories}
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all appearance-none disabled:opacity-50"
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
              >
                <option value="">Seleccione una categoría</option>
                {loadingCategories ? (
                  <option disabled>Cargando...</option>
                ) : categoryError ? (
                  <option disabled>Error al cargar categorías</option>
                ) : (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Precio ($)</label>
              <input 
                type="number" 
                step="0.01"
                required
                disabled={loading}
                placeholder="29.99"
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Descripción de la Obra</label>
            <textarea 
              required
              disabled={loading}
              rows={3}
              placeholder="Resume de qué trata esta obra..."
              className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all resize-none disabled:opacity-50"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Portada */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Portada (Imagen)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  disabled={loading}
                  onChange={(e) => handleFileChange(e, 'cover')}
                  className="hidden"
                  id="cover-upload"
                />
                <label 
                  htmlFor="cover-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] p-4 cursor-pointer transition-all ${
                    files.cover ? 'border-green-500/50 bg-green-50/50' : 'border-secondary/20 bg-tertiary/30 hover:border-secondary/50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {files.cover ? (
                    <div className="flex flex-col items-center text-green-600">
                      <CheckCircle2 size={24} />
                      <span className="text-[10px] mt-1 font-bold truncate max-w-[120px]">{files.cover.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-primary/40 group-hover:text-secondary transition-colors">
                      <Upload size={24} />
                      <span className="text-[10px] mt-1 font-bold">Subir Imagen</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Input PDF */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Archivo (PDF)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="application/pdf"
                  disabled={loading}
                  onChange={(e) => handleFileChange(e, 'pdf')}
                  className="hidden"
                  id="pdf-upload"
                />
                <label 
                  htmlFor="pdf-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] p-4 cursor-pointer transition-all ${
                    files.pdf ? 'border-green-500/50 bg-green-50/50' : 'border-secondary/20 bg-tertiary/30 hover:border-secondary/50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {files.pdf ? (
                    <div className="flex flex-col items-center text-green-600">
                      <FileText size={24} />
                      <span className="text-[10px] mt-1 font-bold truncate max-w-[120px]">{files.pdf.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-primary/40 group-hover:text-secondary transition-colors">
                      <Upload size={24} />
                      <span className="text-[10px] mt-1 font-bold">Subir PDF</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-300">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary/40">
                <span>Procesando archivos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(201,164,74,0.5)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button 
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="flex-1 text-primary/50 font-bold text-[10px] uppercase tracking-widest py-4 rounded-[12px] border border-secondary/10 hover:bg-tertiary/50 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={`flex-[2] text-primary font-bold text-[10px] uppercase tracking-widest py-4 rounded-[12px] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                loading ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary hover:bg-secondary/90 hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Publicar Obra</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Gestión de Categorías"
      >
        <div className="space-y-6">
          {/* Add Category Input */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Nueva categoría..."
              className="flex-1 bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-secondary/50"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button 
              onClick={handleAddCategory}
              className="p-2 bg-secondary text-primary rounded-[10px] hover:bg-secondary/90 transition-colors"
            >
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-tertiary/20 rounded-[12px] border border-secondary/5 group">
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex gap-2 mr-2">
                    <input 
                      type="text"
                      autoFocus
                      className="flex-1 bg-white border border-secondary/20 rounded-[6px] px-3 py-1 text-sm text-primary outline-none"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                    />
                    <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 hover:scale-110 transition-transform"><Check size={18} /></button>
                    <button onClick={() => setEditingCatId(null)} className="text-red-500 hover:scale-110 transition-transform"><CloseIcon size={18} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-body font-medium text-primary/80">{cat.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="p-1.5 text-primary/40 hover:text-secondary transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-primary/40 hover:text-red-500 transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BookManagementGrid;
