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
    const no_telepon = formData.get('no_telepon')?.toString().trim() || null;
    const program_studi = formData.get('program_studi')?.toString();
    const dosen_terkait = formData.get('dosen_terkait')?.toString();
    const keperluan = formData.get('keperluan')?.toString();

    // Jadwal: field yang sama dikirim berulang, satu per baris jadwal
    const tanggalList = formData.getAll('tanggal_pakai').map(String);
    const mulaiList = formData.getAll('waktu_mulai').map(String);
    const selesaiList = formData.getAll('waktu_selesai').map(String);
    const volumeList = formData.getAll('volume_gram').map(Number);

    const jumlah = tanggalList.length;
    if (
      !nama_mahasiswa ||
      !nim ||
      jumlah === 0 ||
      mulaiList.length !== jumlah ||
      selesaiList.length !== jumlah ||
      volumeList.length !== jumlah
    ) {
      return balas({ error: 'Data form tidak lengkap.' }, 400);
    }

    // 1. Validasi tiap jadwal & hitung durasi dalam menit
    const jadwal: {
      tanggal_pakai: string;
      waktu_mulai: string;
      waktu_selesai: string;
      volume_gram: number;
      durasi_menit: number;
    }[] = [];

    for (let i = 0; i < jumlah; i++) {
      const tanggal_pakai = tanggalList[i];
      const waktu_mulai = mulaiList[i];
      const waktu_selesai = selesaiList[i];
      const volume_gram = volumeList[i];

      if (!tanggal_pakai || !waktu_mulai || !waktu_selesai || !(volume_gram > 0)) {
        return balas({ error: `Jadwal ${i + 1} belum lengkap.` }, 400);
      }

      const [jamMulai, menitMulai] = waktu_mulai.split(':').map(Number);
      const [jamSelesai, menitSelesai] = waktu_selesai.split(':').map(Number);
      const durasi_menit = jamSelesai * 60 + menitSelesai - (jamMulai * 60 + menitMulai);

      if (durasi_menit <= 0) {
        return balas({ error: `Jadwal ${i + 1}: jam selesai harus setelah jam mulai.` }, 400);
      }

      jadwal.push({ tanggal_pakai, waktu_mulai, waktu_selesai, volume_gram, durasi_menit });
    }

    const totalGram = jadwal.reduce((sum, j) => sum + j.volume_gram, 0);
    const totalMenit = jadwal.reduce((sum, j) => sum + j.durasi_menit, 0);

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

    // 3. Simpan semua jadwal ke tabel logbooks (satu insert = semua berhasil atau semua gagal)
    const { error: logError } = await supabase.from('logbooks').insert(
      jadwal.map((j) => ({
        printer_id: printerData.id,
        filament_id: filamentData.id,
        nama_mahasiswa,
        nim,
        no_telepon,
        program_studi,
        dosen_terkait,
        keperluan,
        ...j,
      }))
    );

    if (logError) {
      return balas({ error: logError.message }, 500);
    }

    // 4. Kurangi sisa stok filamen (total dari semua jadwal)
    const stokBaru = Math.max(0, filamentData.sisa_stok_gram - totalGram);
    const { error: stokError } = await supabase
      .from('filaments')
      .update({ sisa_stok_gram: stokBaru })
      .eq('id', filamentData.id);

    // 5. Tambah akumulasi menit pakai mesin (total dari semua jadwal)
    const menitBaru = (printerData.total_menit_pakai ?? 0) + totalMenit;
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

    return balas({ success: true, jumlah });
  } catch (err: any) {
    return balas({ error: err.message }, 500);
  }
};