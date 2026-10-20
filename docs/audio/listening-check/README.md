# Diagnosis laporan A/B tidak berubah

20 Oktober 2026. Status terbaru: **ditutup setelah Steven mengonfirmasi pembanding sudah berfungsi pada sesinya**. Penyebab pengamatan awal tidak berhasil diisolasi; tidak ada klaim perbaikan runtime tertentu atau validasi perseptual umum. Catatan diagnosis berikut dipertahankan sebagai riwayat pemeriksaan.

Steven melaporkan suara sama pada pasangan bawaan dan setelah mengganti pasangan, menggunakan speaker yang layak. Laporan ini tidak ditolak berdasarkan hasil otomatis. Inspeksi tab menunjukkan pasangan Sony WF-1000XM4 → Apple Airpods Pro 2 pada HypetheSonics; tidak ditemukan error pada log tab yang tersedia. Pemeriksaan log bukan bukti tidak ada masalah.

## Bukti yang ditambahkan

- `scripts/probe_audio_output.mjs`: klik tombol A/B pada preview, baca PCM lewat AnalyserNode setelah master gain pada graph Jam. Musik dihentikan dan diganti probe sinus berlevel rendah melalui bus yang sama agar perubahan sumber tidak mencemari perbandingan. Ini berbeda dari sekadar membaca nilai parameter filter.
- Pada pasangan bawaan Airpods Pro 2 → SeeAudio Yume, perubahan PCM B terhadap A sekitar −0,55 dB pada 125 Hz, −1,51 dB pada 500 Hz, +1,96 dB pada 2 kHz, dan +1,52 dB pada 8 kHz. Kembali ke A memulihkan respons. Lihat [hasil PCM](../pcm-output-probe.json).
- `scripts/probe_audio_output.mjs --sony` menguji pasangan yang terlihat pada tab pengguna; hasilnya disimpan terpisah di [hasil PCM Sony](../pcm-output-probe-sony.json).
- `scripts/render_audio_comparison.mjs` merender instrumen musik Jam asli dengan not, noise seeded, durasi, dan master level yang sama. Kedua mode memakai graph EQ dan limiter asli. Sinyal B berbeda dari A; RMS musik B sekitar 0,51 dB lebih rendah pada pasangan bawaan. Tidak ada normalisasi volume terpisah. Lihat [parameter dan hasil render](report.json).

Tes PCM memakai Chrome desktop lokal dengan speaker dimute. Render musik memakai OfflineAudioContext. Keduanya **tidak** mengukur keluaran speaker Steven, tidak membuktikan perbedaan perseptual, dan tidak menguji engine audio tab in-app secara langsung. Offline render juga tidak menjalankan scheduler realtime. Perbedaan waveform bukan otomatis perbedaan yang dilaporkan pendengar.

## Sampel untuk mengisolasi masalah

- [A asli, 10 detik](A-original.wav)
- [B pasangan bawaan, 10 detik](B-default-pair.wav)
- [A–B–A–B, 40 detik](A-B-A-B.wav): A 0–10 detik, B 10–20, A 20–30, B 30–40. Setiap bagian mengulang sumber musik yang sama. Pergantian langsung antarbagian dapat menghasilkan transien di batas; jangan menilai perbedaan dari bunyi klik batas itu.

Putar pada volume nyaman melalui pemutar lokal dan output audio yang sama. Catat pengamatan apa adanya. Jika file berbeda tetapi tab aplikasi tidak, lanjutkan diagnosis browser/runtime/output routing; itu belum menentukan satu penyebab. Jika file juga terdengar sama, catat hasil tersebut tanpa menyimpulkan ada masalah pada pendengar. Pasangan bawaan memiliki kurva yang dekat, tetapi fakta ini saja tidak menjelaskan laporan saat pasangan lain juga tidak berubah.

Tidak ada perbaikan runtime tertentu yang diklaim menyelesaikan laporan. Penutupan mengikuti konfirmasi langsung Steven setelah diagnosis, bukan hanya tes otomatis. Jika keluhan muncul kembali, bandingkan pemutaran live di tab in-app dan Chrome biasa pada pasangan dan output yang sama, lalu instrumentasi lingkungan yang benar-benar mereproduksi keluhan.

## Reproduksi teknis

Jalankan preview build di `127.0.0.1:4171`, kemudian jalankan kedua script dari root repo. Opsional `PW_CHROMIUM` menunjuk executable Chromium. Script memakai browser terpisah dan tidak mengubah pilihan pada tab pengguna. Output tidak memuat data peserta. Sumber aplikasi belum diubah oleh diagnosis ini.
