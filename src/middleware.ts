import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase-auth';

// Jalur yang boleh dibuka tanpa login
const JALUR_PUBLIK = ['/login'];

// Formulir surat peminjaman: terbuka untuk umum, tidak butuh sesi sama sekali
const FORM_SURAT = '/';

// File statis (logo, css, dll.) tidak perlu dicek
const FILE_STATIS = /\.(png|jpe?g|gif|svg|webp|ico|css|js|map|woff2?|txt)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, cookies, redirect } = context;
  const path = url.pathname;

  if (path.startsWith('/_astro') || FILE_STATIS.test(path)) {
    return next();
  }

  if (path === FORM_SURAT) {
    return next();
  }

  const supabase = createSupabaseServer(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const halamanPublik = JALUR_PUBLIK.includes(path);

  // Belum login → tolak
  if (!user && !halamanPublik) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Belum login.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/login');
  }

  // Sudah login tapi membuka /login → langsung ke dashboard
  if (user && path === '/login') {
    return redirect('/dashboard');
  }

  return next();
});