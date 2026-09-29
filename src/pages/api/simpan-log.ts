import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const balas = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const nama_mahasiswa = formData.get('nama_mahasiswa')?.toString();
    const nim = formData.get('nim')?.toString();
    const program_studi = formData.get('program_studi')?.toString();
    const dosen_terkait = formData.get('dosen_terkait')?.toString();
    const keperluan = formData.get('keperluan')?.toString();
    const tanggal_pakai = formData.get('tanggal_pakai')?.toString();
    const waktu_mulai = formData.get('waktu_mulai')?.toString();
    const waktu_selesai = formData.get('waktu_selesai')?.toString();
    const volume_gram = Number(formData.get('volume_gram'));

    if (!nama_mahasiswa || !nim || !tanggal_pakai || !waktu_mulai || !waktu_selesai || !volume_gram) {
      return balas({ error: 'Data form tidak lengkap.' }, 400);
    }

    // 1. Hitung durasi dalam menit
    const [jamMulai, menitMulai] = waktu_mulai.split(':').map(Number);
    const [jamSelesai, menitSelesai] = waktu_selesai.split(':').map(Number);
    const durasi_menit = Math.max(
      0,
      jamSelesai * 60 + menitSelesai - (jamMulai * 60 + menitMulai)
    );

    // 2. Ambil printer & filamen pertama
    const { data: printerData } = await supabase
      .from('printers')
      .select('id, total_menit_pakai')
      .limit(1)
      .single();
    const { data: filamentData } = await supabase
      .from('filaments')
      .select('id, sisa_stok_gram')
      .limit(1)
      .single();

    if (!printerData || !filamentData) {
      return balas({ error: 'Data printer atau filamen belum tersedia.' }, 500);
    }

    // 3. Simpan ke tabel logbooks
    const { error: logError } = await supabase.from('logbooks').insert([
      {
        printer_id: printerData.id,
        filament_id: filamentData.id,
        nama_mahasiswa,
        nim,
        program_studi,
        dosen_terkait,
        keperluan,
        tanggal_pakai,
        waktu_mulai,
        waktu_selesai,
        durasi_menit,
        volume_gram,
      },
    ]);

    if (logError) {
      return balas({ error: logError.message }, 500);
    }

    // 4. Kurangi sisa stok filamen
    const stokBaru = Math.max(0, filamentData.sisa_stok_gram - volume_gram);
    const { error: stokError } = await supabase
      .from('filaments')
      .update({ sisa_stok_gram: stokBaru })
      .eq('id', filamentData.id);

    // 5. Tambah akumulasi menit pakai mesin
    const menitBaru = (printerData.total_menit_pakai ?? 0) + durasi_menit;
    const { error: mesinError } = await supabase
      .from('printers')
      .update({ total_menit_pakai: menitBaru })
      .eq('id', printerData.id);

    if (stokError || mesinError) {
      return balas(
        { error: 'Log tersimpan, tetapi stok atau jam mesin gagal diperbarui: ' + (stokError?.message ?? mesinError?.message) },
        500
      );
    }

    return balas({ success: true });
  } catch (err: any) {
    return balas({ error: err.message }, 500);
  }
};