import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/index.js';
import { createMarketRepository } from '../repositories/market.repository.js';
import { createMarketService } from '../services/market.service.js';
import { marketHandler } from '../controllers/market.controller.js';

const router = Router();
const market = createMarketService(createMarketRepository(supabase));
router.use('/mercado', authMiddleware, async (req, res, next) => {
  try {
    req.marketMember = await market.authorize(req.user);
    next();
  } catch (error) {
    res.status(error.statusCode ?? 503).json({ message: error.statusCode ? error.message : 'No se pudo verificar la membresía' });
  }
});
router.get('/mercado/config', marketHandler((r) => market.config(r.marketMember)));
router.get('/mercado/productos', marketHandler((r) => market.list(r.marketMember, 'public', r.query)));
router.get('/mercado/mis-publicaciones', marketHandler((r) => market.list(r.marketMember, 'mine')));
router.get('/mercado/mis-reservas', marketHandler((r) => market.reservations(r.marketMember)));
router.get('/mercado/productos/:id', marketHandler((r) => market.detail(r.marketMember, r.params.id)));
router.post('/mercado/productos', marketHandler((r) => market.save(r.marketMember, null, r.body)));
router.put('/mercado/productos/:id', marketHandler((r) => market.save(r.marketMember, r.params.id, r.body)));
router.delete('/mercado/productos/:id', marketHandler((r) => market.manage(r.marketMember, r.params.id, 'eliminar')));
router.post('/mercado/productos/:id/reservar', marketHandler((r) => market.reserve(r.marketMember, r.params.id)));
router.patch('/mercado/productos/:id/vendido', marketHandler((r) => market.manage(r.marketMember, r.params.id, 'vendido')));
export default router;
