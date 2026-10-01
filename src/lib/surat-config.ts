// Konfigurasi tetap untuk surat peminjaman. Ubah di sini bila ada pergantian pejabat/daftar pilihan.
export const SURAT = {
  kop: {
    nama: 'POLITEKNIK MANUFAKTUR BANDUNG',
    alamat: 'Jalan Kanayakan No.21 Dago, Coblong, Kota Bandung, 40135',
    kota: 'Bandung',
  },
  perihal: 'Surat Peminjaman 3D Printer',
  penerima: {
    sapaan: 'Ibu',
    nama: 'Dr.Eng. Pipit Anggraeni, S.T., M.T., M.Sc.Eng.',
    instansi: 'Politeknik Manufaktur Bandung',
  },
  // Kosongkan "nip" bila tidak ingin dicetak di bawah nama
  penyetuju: { nama: 'Dr. Eng. Pipit Anggraeni, S.T., M.T., M.Sc.Eng.', nip: '197908242005012001' },
  pengetahui: { jabatan: 'Sekretaris Jurusan', nama: 'Nur Wisma Nugraha, S.T., M.T.', nip: '197406092003121000' },
  jurusanDefault: 'Teknik Otomasi Manufaktur dan Mekatronika',
  catatanTabel: '* (tabel kosong diprint di balik surat di atas, isi ditulis tangan)',
};

export const PRODI = [
  'Teknologi Rekayasa Mekatronika',
  'Teknologi Rekayasa Otomasi',
  'Teknologi Rekayasa Informatika Industri',
  'Teknologi Rekayasa Sistem Aerial Nirawak',
  'Sistem Siber-Fisik (Cyber Physical System)',
];

export const MAKS_BARIS = 11; // jumlah baris tabel "Waktu Pemakaian"