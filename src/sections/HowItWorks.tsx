import { SectionHead } from '../components/common'
import type { CoreData } from '../lib/types'

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`
const dec = (v: number, d = 3) => v.toFixed(d).replace('.', ',')

export function HowItWorks({ data }: { data: CoreData }) {
  const { meta } = data
  const steps = [
    ['Ambil data', `Kurva frekuensi dari repo AutoEq (commit ${meta.autoeq.commit.slice(0, 7)}, ${meta.autoeq.date}). Semua diolah sekali di laptop, hasilnya file JSON statis.`],
    ['Satu rig, satu perbandingan', 'Alat ukur beda bikin kurva beda untuk headphone yang sama. Jadi produk cuma dibandingkan dengan produk lain dari rig yang sama.'],
    ['Grid dan level', `Tiap kurva diinterpolasi ke ${meta.grid.length} titik log dari 20 Hz sampai 20 kHz, lalu digeser supaya rata-rata 300 Hz sampai 3 kHz jadi 0 dB.`],
    ['Kemiripan', `Jarak RMS antar kurva di 20 Hz sampai 10 kHz. Di atas 10 kHz hasil ukur gampang berubah karena posisi pasang. 0 dB = skor 100, ${meta.scoreZeroDb} dB atau lebih = 0.`],
    ['Peta dan kelompok', 'PCA 2 komponen untuk peta, k-means untuk kelompok (k dipilih pakai silhouette dari 3 sampai 8). Nama kelompok dibuat otomatis dari aturan band di pusat kelompok.'],
  ]
  return (
    <section aria-labelledby="data-title" id="data" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
      <SectionHead index="05" id="data-title" title="Cara kerjanya">
        Angka di sini <span className="text-ink-2">semuanya keluar dari pipeline, bukan dikarang.</span>
      </SectionHead>

      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="card p-5">
            <p className="num text-sm text-teal">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-2 font-semibold">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
          </li>
        ))}
      </ol>

      <p id="rig-table-caption" className="mt-10 mb-3 text-sm text-ink-2">
        Rig yang dipakai: {meta.totals.measurements.toLocaleString('id-ID')} hasil pengukuran, {meta.totals.modelRigPairs.toLocaleString('id-ID')} pasangan model–rig, dan {meta.totals.distinctBaseNames.toLocaleString('id-ID')} nama dasar berbeda lintas rig. Model yang diukur pada beberapa rig dihitung pada setiap rig. Nama dasar masih mengikuti normalisasi nama sumber, bukan katalog produk unik yang sudah diverifikasi.
      </p>
      <div className="overflow-x-auto">
        <table aria-describedby="rig-table-caption" className="num w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-2 pr-4 font-medium">Pengukur</th>
              <th className="py-2 pr-4 font-medium">Rig</th>
              <th className="py-2 pr-4 font-medium">Tipe</th>
              <th className="py-2 pr-4 font-medium">Model dalam rig</th>
              <th className="py-2 pr-4 font-medium">PCA (PC1 + PC2)</th>
              <th className="py-2 pr-4 font-medium">k</th>
              <th className="py-2 pr-4 font-medium">Silhouette</th>
              <th className="py-2 pr-4 font-medium">Skor preferensi</th>
            </tr>
          </thead>
          <tbody>
            {meta.rigs.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <th className="py-2.5 pr-4 font-medium">
                  {r.sourceUrl ? (
                    <a href={r.sourceUrl} className="underline-offset-4 hover:underline" rel="noreferrer" target="_blank">
                      {r.source}
                    </a>
                  ) : (
                    r.source
                  )}
                </th>
                <td className="py-2.5 pr-4">{r.rig}</td>
                <td className="py-2.5 pr-4">{r.formLabel}</td>
                <td className="py-2.5 pr-4">{r.models}</td>
                <td className="py-2.5 pr-4">
                  {pct(r.pca.explained[0])} + {pct(r.pca.explained[1])}
                </td>
                <td className="py-2.5 pr-4">{r.k}</td>
                <td className="py-2.5 pr-4">{dec(r.silhouette)}</td>
                <td className="py-2.5 pr-4">{r.withPref ? `${r.withPref} hasil ukur` : 'tidak ada'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 text-sm leading-relaxed text-ink-2 md:grid-cols-2">
        <p>
          Silhouette di kisaran 0,1 sampai 0,3 artinya kelompoknya tidak terpisah tegas. Karakter suara headphone itu lebih mirip
          spektrum daripada kotak-kotak, jadi nama kelompok anggap sebagai gambaran kasar, bukan label pasti.
        </p>
        <p>
          Skor preferensi diambil dari RANKING.md AutoEq (model statistik riset Harman). Skor ini cuma ada untuk sebagian rig. Itu
          selera rata-rata banyak pendengar, bukan selera kamu, makanya ada kuis.
        </p>
      </div>
    </section>
  )
}
