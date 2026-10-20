# Uji pengguna AudioMatch

Paket moderator • versi 20 Oktober 2026 • **belum ada sesi atau hasil peserta**

Tujuan: menemukan hambatan saat mencari produk, membaca rekomendasi, membandingkan, dan kembali ke hasil. Sesi juga mengecek apakah pengguna memahami batas data dan simulasi audio. Hasilnya bukan pengukuran akurasi selera atau pengganti mendengarkan headphone fisik.

## Mulai dari sini

1. Lakukan satu latihan sendiri, tidak dihitung sebagai peserta. Pastikan build yang diuji bisa dibuka dan suara dapat diputar/dihentikan.
2. Rekrut 5–8 teman yang pernah memilih earphone/headphone. Usahakan ada pengguna awam dan yang terbiasa membaca review. Ini sampel kemudahan untuk perbaikan awal, bukan sampel representatif. Jangan hanya merekrut pengembang yang sudah memahami aplikasi.
3. Gunakan satu perangkat utama per orang. Usahakan setidaknya dua sesi desktop dan dua sesi pada HP fisik; jangan menyebut emulasi browser sebagai uji HP. Catat keterbatasan rekrutmen jika pembagiannya tidak tercapai.
4. Salin [template sesi](template-sesi.md) menjadi `P01.md`, `P02.md`, dan seterusnya di folder pribadi. Jangan masukkan nama, rekaman, atau data mentah peserta ke repo publik. Simpan persetujuan dan kontak terpisah jika dibutuhkan.
5. Jalankan sesi individual selama sekitar 30–35 menit: pembukaan 3 menit, tugas 22–25 menit, wawancara 5–7 menit. Jangan membuat sesi kelompok karena jawaban bisa saling memengaruhi.
6. Rekap hasil memakai [template evaluasi](template-evaluasi.md). Perbaiki masalah yang menghambat tugas, kemudian uji ulang dengan peserta baru bila tersedia. Catat versi sebelum/sesudah.

[Kartu peserta](kartu-peserta.md) berisi skenario dan pertanyaan tanpa kunci pengamatan moderator. Tampilkan atau bacakan satu tugas setiap kali.

### Akses aplikasi dan persiapan

`http://127.0.0.1:4171/` hanya membuka aplikasi pada perangkat yang menjalankan server. Mengirim alamat ini ke teman **tidak** membagikan aplikasi. Untuk sesi desktop terdekat, gunakan laptop Steven bergantian. Untuk HP fisik, gunakan preview build yang sama di jaringan lokal terpercaya atau deployment preview yang sudah diverifikasi; catat URL dan commit. Jangan memakai situs publik lama sebagai pengganti tanpa memeriksa versinya. Publikasi preview tidak dilakukan oleh paket ini.

Jika perlu menyiapkan LAN, dari folder AudioMatch jalankan build lalu preview beralamat LAN (`node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4172 --strictPort`), buka alamat IP laptop dengan port 4172 di HP pada Wi-Fi yang sama. Jangan membuka port router. Hentikan server setelah sesi; bila firewall memblokir, gunakan perangkat laptop dulu dan tandai sesi HP belum dijalankan. Catat bahwa server LAN dapat dijangkau perangkat lain di jaringan tersebut.

Tutup tab AudioMatch lain yang sedang bersuara. Catat perangkat, browser/versi, output audio, volume aplikasi dan OS, serta EQ/enhancement aktif jika diketahui. Jangan menaikkan volume untuk memaksa perbedaan. Gunakan level nyaman. Pada sesi jarak jauh, audio harus diputar di perangkat peserta; jangan menilai suara melalui mikrofon panggilan atau hasil screen share yang diproses ulang.

Mulai dari halaman awal dengan pencarian dan kuis yang belum diisi. Pertahankan state antar T1–T3. Pertahankan hasil T4 selama membuka detail. Jangan mereset di tengah tugas untuk menyembunyikan kegagalan navigasi.

## Naskah pembukaan

> Aku sedang menguji AudioMatch, bukan menguji kemampuanmu. Coba gunakan seperti biasa sambil ceritakan apa yang kamu cari dan apa yang membingungkan. Kamu boleh bilang tidak tahu, tidak mendengar perbedaan, melewati tugas, atau berhenti kapan saja. Aku akan mencatat tindakan dan komentar dengan kode peserta, tanpa nama. Hasil anonimnya dapat dipakai untuk memperbaiki aplikasi dan menjelaskan proses di portofolio. Apakah kamu bersedia?

Persetujuan merekam layar/suara harus ditanyakan **terpisah**; menolak rekaman tidak menghalangi sesi. Tentukan masa penyimpanan sebelum mulai (contoh rencana: hapus rekaman setelah 30 hari), beritahu peserta, dan patuhi. Minta izin terpisah bila kutipan anonim ingin dipublikasikan. Jika persetujuan sesi ditolak, akhiri tanpa mencatat respons.

Tanyakan singkat sebelum tugas:

- Terakhir memilih earphone/headphone kapan? Informasi apa yang kamu gunakan?
- Seberapa sering kamu membaca grafik pengukuran: belum pernah, kadang, atau sering?
- Apakah sebelumnya sudah mencoba AudioMatch? Catat agar efek belajar terlihat.

## Aturan moderator

Bacakan hanya kolom **skenario**, satu tugas setiap kali. Jangan membacakan kriteria berhasil, menyebut tombol yang harus diklik, atau menjelaskan skor sebelum peserta menjawab. Skenario memakai tujuan nyata dan tidak memberikan jalur klik, mengikuti [panduan skenario NN/g](https://www.nngroup.com/articles/task-scenarios-usability-testing/).

Mulai timer setelah instruksi selesai dibacakan. Akhiri ketika kriteria terpenuhi, peserta menyerah, atau waktu maksimum tercapai. Catat waktu habis sebagai batas waktu, bukan waktu penyelesaian. Jika peserta diam, boleh mengatakan “Apa yang sedang kamu pikirkan?”; itu prompt netral. Menunjukkan lokasi/tombol adalah bantuan dan harus dicatat. Setelah tugas gagal, moderator boleh menyiapkan titik awal tugas berikutnya; tandai bantuan setup agar kegagalan pertama tidak otomatis menggagalkan semua tugas.

## Skenario dan kriteria pengamatan

| ID / batas waktu | Skenario untuk peserta | Kriteria moderator, jangan dibacakan |
|---|---|---|
| T1 / 3 menit | Kamu menyukai Apple Airpods Pro 2 dan ingin menemukan alternatif dengan karakter suara serupa. Temukan satu kandidat yang ingin kamu periksa lebih lanjut. | Produk acuan benar pada rig HypetheSonics; memilih satu kandidat dari hasilnya. Catat nama/ID/rig. Menemukan produk dengan nama sama pada rig lain tidak dihitung sebagai salah pengguna; catat ambiguitas dan sesuaikan konteks berikutnya. |
| T2 / 3 menit | Sebelum memutuskan, cari tahu lebih jauh tentang kandidat itu. Jelaskan dengan kata-katamu sendiri apa arti skor kemiripannya dan informasi apa yang belum kamu ketahui. | Membuka detail kandidat. Catat keberhasilan navigasi terpisah dari pemahaman: skor menjelaskan kedekatan kurva, bukan peluang menyukai/membeli atau kualitas mutlak. Pemahaman = tepat/sebagian/keliru/tidak tahu. |
| T3 / 3 menit | Sekarang lanjutkan mencari dari daftar hasil yang tadi. Pilih kandidat lain tanpa mengetik ulang pencarian awal. | Kembali ke hasil sebelumnya, produk acuan/pencarian tetap, dan kandidat lain bisa dipilih. Catat jika peserta memakai tombol browser atau tombol aplikasi, posisi scroll, kehilangan state, dan jalan memutar. |
| T4 / 5 menit | Kali ini kamu belum punya produk acuan. Cari rekomendasi untuk headphone over-ear yang menutup telinga, dengan karakter suara yang kamu sukai. Periksa satu hasil, lalu kembali ke hasil tadi. | Menuntaskan kuis dengan over-ear, melihat hasil, membuka detail dan kembali tanpa kehilangan jawaban/hasil. Catat jawaban dan produk. Kesesuaian subjektif ditanyakan, bukan dianggap kebenaran label. |
| T5 / 4 menit | Kamu ingin membandingkan produk acuan T1 dengan salah satu kandidatnya melalui fitur suara. Coba kedua pilihan suara, ceritakan apa yang terjadi, lalu hentikan pemutarannya. | Memilih pasangan, menjalankan audio, mengganti A dan B, menghentikan. **Mendengar perbedaan bukan syarat lulus tugas.** Catat perubahan yang dilaporkan, atau “tidak berubah”, tanpa koreksi. Pisahkan bug audio dari kesulitan menemukan kontrol. |
| T6 / 4 menit | Kamu ingin menjelajahi karakter suara produk lain secara visual. Pilih satu produk yang menarik, lihat detailnya, lalu kembali ke penjelajahan tadi. Jelaskan apa yang kamu simpulkan dari letaknya. | Menemukan peta, memilih titik/alternatif tabel, membuka detail, kembali dengan rig/seleksi terjaga. Catat apakah peserta menganggap jarak peta sebagai ranking kemiripan pasti; PCA hanya ringkasan. |

Setelah setiap tugas, tanyakan: **“Seberapa mudah atau sulit tugas tadi? 1 sangat sulit, 7 sangat mudah. Apa alasannya?”** Ini skala praktis untuk pilot, bukan skor SUS atau instrumen tervalidasi yang diklaim telah diterapkan. Biarkan kosong jika peserta tidak ingin menjawab.

Sesudah T5, tanyakan tanpa mengarahkan:

- Menurutmu, apa yang diputar oleh A dan apa yang berubah pada B?
- Apa, jika ada, yang berbeda saat kamu berpindah pilihan?
- Seberapa yakin kamu dengan pengamatan itu? 1 tidak yakin–5 sangat yakin; boleh tidak menjawab.
- Menurutmu, seberapa jauh fitur ini membantu keputusan memilih produk? Apa yang masih perlu diperiksa langsung?

Jangan menjawab “harusnya terdengar” atau menilai telinga/peralatan peserta. Jika tidak ada perubahan, catat sebagai temuan. Ulangi hanya **setelah** hasil tugas utama dicatat, sebagai diagnosis terpisah: pasangan yang sama (kontrol nol), pasangan berbeda pada rig sama, status putar, volume, dan restart/reload. Catat urutannya. Pengulangan ini bukan percobaan buta dan bukan bukti akurasi persepsi.

## Wawancara penutup

1. Bagian mana yang paling membantu memilih kandidat? Apa yang masih kurang?
2. Di bagian mana kamu berhenti atau ragu? Apa yang kamu harapkan terjadi?
3. Apakah ada angka/istilah yang terasa menyesatkan atau sulit dimengerti?
4. Kalau hanya satu hal boleh diperbaiki, kamu memilih apa dan mengapa?
5. Dalam situasi apa kamu akan memakai aplikasi ini lagi? Dalam situasi apa kamu tidak akan memakainya?

Setelah semua jawaban selesai, jelaskan batasnya: skor adalah kedekatan pengukuran pada rig yang sama; kuis belum membuktikan preferensi pribadi; peta adalah proyeksi; mode A tanpa EQ pembanding, B ilustrasi selisih B–A. Simulasi tidak mereproduksi headphone secara utuh. Beri kesempatan peserta mengoreksi catatan atau menarik kutipannya.

## Cara mengevaluasi

Gunakan definisi dan tabel di template evaluasi. Laporkan jumlah nyata (misalnya “3 dari 5 peserta yang mencoba T3”), bukan hanya persentase. Jangan menganggap enam tugas seorang peserta sebagai enam orang independen. Pisahkan peserta baru/lama dan perangkat; sampel kecil tidak cukup untuk menyimpulkan satu perangkat lebih unggul.

Rencana 5–8 orang dan durasi di sini adalah keputusan praktis proyek. Prinsip observasi tugas, fasilitator, dan peserta mengikuti [Usability Testing 101, NN/g](https://www.nngroup.com/articles/usability-testing-101/). Hasil pilot dipakai untuk menemukan masalah dan menguji perbaikannya, bukan klaim populasi atau akurasi algoritme. Rencana riset preferensi terpisah ada di [protokol evaluasi manusia](../human-evaluation-protocol.md).
