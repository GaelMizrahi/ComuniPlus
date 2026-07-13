import React, { useState } from 'react';
import Layout from '../components/layout/Layout.jsx';
import Chip from '../components/ui/Chip.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const CATEGORIES = ['Todos', 'Deportes', 'Electrónica', 'Ropa', 'Hogar', 'Otros'];

const MOCK_PRODUCTS = [
  { id: 1, title: 'Pelota de fútbol Nike', price: '$8.500', seller: 'Martín G.', category: 'Deportes' },
  { id: 2, title: 'Remera club vintage M', price: '$4.200', seller: 'Lucía P.', category: 'Ropa' },
  { id: 3, title: 'Paleta de pádel HEAD', price: '$32.000', seller: 'Facundo R.', category: 'Deportes' },
  { id: 4, title: 'Auriculares Bluetooth', price: '$15.000', seller: 'Sofía M.', category: 'Electrónica' },
  { id: 5, title: 'Mochila deportiva', price: '$6.800', seller: 'Tomás L.', category: 'Deportes' },
  { id: 6, title: 'Kit de mates completo', price: '$12.000', seller: 'Carlos B.', category: 'Hogar' },
];

export default function Mercado({ user, onLogout }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const filtered = selectedCategory === 'Todos' ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter((p) => p.category === selectedCategory);

  return (
    <Layout user={user} onLogout={onLogout} active="MERCADO">
      <div className="mb-6">
        <p className="text-[13px] text-text-muted mb-1">Tu comunidad</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Mercado</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5">
        {CATEGORIES.map((cat) => (
          <Chip key={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>{cat}</Chip>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((product) => (
            <ElevatedCard key={product.id} className="p-4 active:scale-[0.99]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold truncate">{product.title}</h4>
                  <p className="text-[12px] text-text-muted mt-0.5">{product.seller}</p>
                </div>
                <p className="text-[15px] font-semibold text-text shrink-0">{product.price}</p>
              </div>
            </ElevatedCard>
          ))}
        </div>
      ) : (
        <EmptyState icon="🛍" message="No hay publicaciones en esta categoría" />
      )}

      <button className="fixed bottom-20 right-5 z-40 w-12 h-12 bg-text text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform text-xl">
        +
      </button>
    </Layout>
  );
}
