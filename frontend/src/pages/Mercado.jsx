import React, { useState } from 'react';
import Layout from '../components/layout/Layout.jsx';
import Chip from '../components/ui/Chip.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const CATEGORIES = ['Todos', 'Deportes', 'Electrónica', 'Ropa', 'Hogar', 'Otros'];

const MOCK_PRODUCTS = [
  { id: 1, title: 'Pelota de fútbol Nike', price: '$8.500', seller: 'Martín G.', avatar: 1, category: 'Deportes', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=⚽' },
  { id: 2, title: 'Remera club vintage M', price: '$4.200', seller: 'Lucía P.', avatar: 2, category: 'Ropa', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=👕' },
  { id: 3, title: 'Paleta de pádel HEAD', price: '$32.000', seller: 'Facundo R.', avatar: 3, category: 'Deportes', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=🏓' },
  { id: 4, title: 'Auriculares Bluetooth', price: '$15.000', seller: 'Sofía M.', avatar: 4, category: 'Electrónica', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=🎧' },
  { id: 5, title: 'Mochila deportiva', price: '$6.800', seller: 'Tomás L.', avatar: 5, category: 'Deportes', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=🎒' },
  { id: 6, title: 'Kit de mates completo', price: '$12.000', seller: 'Carlos B.', avatar: 6, category: 'Hogar', img: 'https://placehold.co/400x400/f1f3f8/8e99ab?text=🧉' },
];

export default function Mercado({ user, onLogout }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const filtered = selectedCategory === 'Todos' ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter((p) => p.category === selectedCategory);

  return (
    <Layout user={user} onLogout={onLogout} active="MERCADO">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Mercado</h1>
        <p className="text-[13px] text-text-muted mt-1 font-medium">Comprá y vendé en tu comunidad</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <Chip key={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>{cat}</Chip>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((product, i) => (
            <ElevatedCard key={product.id} className="flex items-center gap-3.5 p-4 active:scale-[0.98] animate-slide-up cursor-pointer" style={{ animationDelay: `${i * 40}ms` }}>
              <img
                src={product.img}
                alt={product.title}
                className="w-14 h-14 rounded-xl object-cover bg-surface-secondary shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-bold truncate text-text">{product.title}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <img
                    src={`https://i.pravatar.cc/32?u=avatar${product.avatar}`}
                    alt={product.seller}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <p className="text-[12px] text-text-muted font-medium">{product.seller}</p>
                </div>
              </div>
              <p className="text-[15px] font-extrabold text-text shrink-0">{product.price}</p>
            </ElevatedCard>
          ))}
        </div>
      ) : (
        <EmptyState icon="📦" message="No hay publicaciones en esta categoría" />
      )}

      <button className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-fab active:scale-95 transition-all duration-200 text-2xl font-light">
        +
      </button>
    </Layout>
  );
}
