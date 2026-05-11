import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, AlertTriangle, TrendingUp, Search, 
  ChevronRight, Edit3, Sparkles, X, Upload, FileText, 
  ShieldCheck, Play, Info, SplitSquareHorizontal, Users, Trash2, Moon, Sun, CheckCircle2, Database
} from 'lucide-react';

// --- DATA RULES ---
const DEFAULT_AUDIT_RULES = [
  {"id": "AUDIT-COD-01", "case": "Typhoid pada Kehamilan", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A010"]}, {"operator": "OR", "codes": ["O98", "O988"]}]}, "warning": "Koreksi Koding: Jika tidak ada penyulit lain, pengkodean tifoid pada kehamilan HARUS menggunakan O98.8 sebagai Diagnosis Utama dan A01.0 sebagai Diagnosis Sekunder."},
  {"id": "AUDIT-COD-03", "case": "Batu Saluran Kemih dengan ISK", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["N20", "N21", "N22", "N23"]}, {"operator": "OR", "codes": ["N390"]}]}, "warning": "Kaidah Excludes: ISK (N39.0) SUDAH INCLUDE dalam Batu Saluran Kemih (N20-N23). ISK tidak boleh ditagihkan sebagai diagnosis sekunder terpisah."},
  {"id": "AUDIT-COD-05", "case": "Cholelithiasis dengan Obstruksi/Cholangitis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["K80", "K800", "K801", "K802"]}, {"operator": "OR", "codes": ["K831", "K830"]}]}, "warning": "Kaidah Kombinasi: K83.1 (Obstruksi) dan K83.0 (Cholangitis) TIDAK DIKODE TERPISAH jika ada Cholelithiasis. Gunakan gabungan K80.3 atau K80.4."},
  {"id": "AUDIT-COD-06", "case": "Apendisitis Perforasi/Peritonitis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["K352"]}, {"operator": "OR", "codes": ["K631"]}]}, "warning": "Unbundling: Peritonitis/perforasi sudah terwakili dalam K35.2. Perforation of intestine (K63.1) TIDAK BOLEH dikoding terpisah."},
  {"id": "AUDIT-COD-07", "case": "Amputasi Jari (Specificity)", "condition": {"type": "simple", "operator": "OR", "codes": ["8491"]}, "warning": "Kurang Spesifik: Jangan gunakan 84.91 (Amputation, NOS). Gunakan: Jari tangan (84.01), Ibu jari tangan (84.02), Jari kaki (84.11)."},
  {"id": "AUDIT-COD-08", "case": "DM dengan Ulkus/Gangren", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["E10", "E11", "E14"]}, {"operator": "OR", "codes": ["R02", "L89"]}]}, "warning": "Kode Kombinasi: DM dengan gangren/ulkus diabetik HARUS menggunakan kode E10.5 / E11.5 / E14.5. Gangren (R02) tidak dikode terpisah."},
  {"id": "AUDIT-COD-09", "case": "DM Neuropati (Dagger Asterisk)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["E149", "E119", "E109"]}, {"operator": "OR", "codes": ["G632"]}]}, "warning": "Dagger & Asterisk: Polineuropati diabetik dikode E11.4+/E14.4+ sebagai Diagnosis Utama, dan G63.2* sebagai Diagnosis Sekunder."},
  {"id": "AUDIT-COD-10", "case": "HIV dengan Infeksi Sekunder Multipel", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["B200", "B201", "B204", "B208"]}, {"operator": "OR", "codes": ["J159", "J152", "J189"]}]}, "warning": "Kode Kombinasi HIV: Jika infeksi penyerta >1 (misal Kandidiasis + Pneumonia), gunakan B20.7 (HIV resulting in multiple infections) sebagai Diagnosis Utama."},
  {"id": "AUDIT-COD-11", "case": "DHF dengan Trombositopenia", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A91", "A90"]}, {"operator": "OR", "codes": ["D696"]}]}, "warning": "Overcoding Simtom: Trombositopenia (D69.6) merupakan tanda klinis DHF (A91). Tidak boleh dikoding sebagai diagnosis sekunder."},
  {"id": "AUDIT-COD-12", "case": "IHD dengan Angina Pectoris", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["I25", "I251", "I259"]}, {"operator": "OR", "codes": ["I20", "I200", "I201", "I209"]}]}, "warning": "Overcoding Simtom: Angina Pectoris (I20.-) adalah bagian (include) dari IHD (I25.-). Tidak perlu dikode terpisah."},
  {"id": "AUDIT-COD-15", "case": "Ruptur Perineum Derajat Ringan", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["O800", "O809", "7359"]}, {"operator": "OR", "codes": ["O700", "O701"]}]}, "warning": "Overcoding: Ruptur perineum derajat 1 dan 2 (O70.0, O70.1) adalah bagian normal persalinan. Tidak dikoding terpisah."},
  {"id": "AUDIT-COD-16", "case": "Hipertensi dengan Gagal Jantung", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["I10"]}, {"operator": "OR", "codes": ["I50", "I500", "I501", "I509"]}]}, "warning": "Kaidah Kombinasi: Heart Failure (I50.-) akibat Hipertensi (I10) HARUS digabung menjadi I11.0. Keduanya tidak boleh dipisah."},
  {"id": "AUDIT-COD-17", "case": "Hipertensi dengan Gagal Ginjal Kronis (CKD)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["I10"]}, {"operator": "OR", "codes": ["N18", "N189", "N19"]}]}, "warning": "Kaidah Kombinasi: Hipertensi (I10) dengan CKD (N18.-) menggunakan kode kombinasi I12.-. (Tidak berlaku untuk AKI N17)."},
  {"id": "AUDIT-COD-18", "case": "Hipertensi + CKD + CHF", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["I10", "I110", "I120"]}, {"operator": "OR", "codes": ["N18", "N189", "N19"]}, {"operator": "OR", "codes": ["I50", "I500", "I509"]}]}, "warning": "Kaidah Kombinasi Lengkap: HT dengan CKD (N18) yang disertai CHF (I50) dikoding dengan I13.2. Gejala edema paru tidak dikoding terpisah."},
  {"id": "AUDIT-COD-19", "case": "CHF dengan Edema Paru", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["I500"]}, {"operator": "OR", "codes": ["J81"]}]}, "warning": "Kaidah Kombinasi: Edema Paru (J81) bersamaan dengan CHF (I50.0), cukup gunakan kode tunggal I50.1 (Left ventricular failure)."},
  {"id": "AUDIT-COD-20", "case": "PPOK dengan Pneumonia", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["J440", "J449"]}, {"operator": "OR", "codes": ["J18", "J189", "J15"]}]}, "warning": "Kaidah Kombinasi: PPOK (J44.9) + Pneumonia (J18.-) digabung menjadi J44.0. PENGECUALIAN: PPOK Eksaserbasi Akut (J44.1) + Pneumonia (J18.9) DIKODING TERPISAH."},
  {"id": "AUDIT-COD-21", "case": "Typhoid Fever dengan Gastroenteritis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A01", "A010"]}, {"operator": "OR", "codes": ["A09"]}]}, "warning": "Overcoding (Excludes): Gastroenteritis (A09) tidak dikoding lagi jika Typhoid Fever (A01.0) sudah tegak."},
  {"id": "AUDIT-COD-22", "case": "Typhoid Fever dengan Pneumonia", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A01", "A010"]}, {"operator": "OR", "codes": ["J18", "J189"]}]}, "warning": "Dagger & Asterisk: Pneumonia pada Typhoid Fever BUKAN J18.9. Gunakan A01.0+ (Utama) dan J17.0* (Sekunder)."},
  {"id": "AUDIT-COD-23", "case": "Oligohidramnion dengan KPD", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["O410"]}, {"operator": "OR", "codes": ["O42", "O420", "O421", "O429"]}]}, "warning": "Overcoding (Excludes): Jika ada oligohidroamnion (O41.0) disertai KPD (O42.-), maka HANYA digunakan kode O42.-."},
  {"id": "AUDIT-COD-24", "case": "Syok Hipovolemik dengan Riwayat Trauma", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["R571", "R57", "R579"]}, {"operator": "OR", "codes": ["S06", "S068", "S36", "T09"]}]}, "warning": "Kaidah Excludes R57: Syok hipovolemik (R57.1) akibat cedera/trauma HARUS diganti menjadi Traumatic shock (T79.4)."},
  {"id": "AUDIT-COD-25", "case": "Unbundling Hernia Inguinal & Adhesiolysis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["530", "5300", "5301", "5302"]}, {"operator": "OR", "codes": ["5459", "K660"]}]}, "warning": "Unbundling Prosedur: Tindakan Adhesiolysis (54.59) TIDAK LAZIM dikoding bersamaan dengan Hernia Inguinal murni. Berisiko menaikkan tarif secara tidak wajar."},
  {"id": "AUDIT-COD-26", "case": "Unbundling SC & Adhesiolysis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["741", "744", "7499"]}, {"operator": "OR", "codes": ["6589", "5459"]}]}, "warning": "Unbundling Prosedur: Lisis perlengketan (65.89/54.59) akibat riwayat SC sebelumnya SUDAH INCLUDE dalam prosedur Seksio Sesarea (74.-)."},
  {"id": "AUDIT-COD-29", "case": "Preterm Labour (O60) vs false Labour (O47)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["O600"]}, {"operator": "OR", "codes": ["O470", "O479"]}]}, "warning": "Kaidah Excludes: false Labour (O47.0) TIDAK BISA dikoding bersamaan dengan Preterm Labour (O60.0)."},
  {"id": "AUDIT-COD-30", "case": "Overcoding Gejala saat PCI", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["360", "3601", "3602", "3606"]}, {"operator": "OR", "codes": ["I493", "I499"]}]}, "warning": "Overcoding Komplikasi: Gangguan irama sesaat (VPD / I49.3) EFEK DARI prosedur PCI tidak boleh dimasukkan sebagai diagnosis sekunder."},
  {"id": "AUDIT-COD-31", "case": "Miscoding Aplastic Anemia (Post-Chemo)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["D619", "D610"]}, {"operator": "OR", "codes": ["Z511", "C"]}]}, "warning": "Kesalahan ICD: Pansitopenia efek kemoterapi BUKAN dikode Anemia Aplastik idiopatik (D61.9/D61.0). Harus dikode terkait efek obat (D61.1)."},
  {"id": "AUDIT-COD-33", "case": "HIV + Tuberkulosis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["B20", "B200"]}, {"operator": "OR", "codes": ["A15", "A150", "A16", "A160", "A162"]}]}, "warning": "Kode Kombinasi: HIV + TB HARUS menggunakan B20.0 (HIV resulting in mycobacterial infection). Kode TB (A15/A16) TIDAK BOLEH dikoding terpisah."},
  {"id": "AUDIT-COD-34", "case": "Laparotomi sebagai Operative Approach", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["5411", "5419"]}, {"operator": "OR", "codes": ["684", "685", "689", "470", "544"]}]}, "warning": "Kaidah Omit Code: Laparotomi (54.11/54.19) SEBAGAI JALAN MASUK untuk operasi utama (misal Histerektomi/Apendiktomi) adalah OMIT CODE (tidak dikoding)."},
  {"id": "AUDIT-COD-35", "case": "Repair Episiotomi vs Repair Perineum", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["O800", "O809"]}, {"operator": "OR", "codes": ["7569"]}]}, "warning": "Overcoding Prosedur: Repair episiotomi rutin dikoding 73.6. Kode 75.69 (Repair Perineum) HANYA untuk robekan derajat 3/4."},
  {"id": "AUDIT-COD-37", "case": "Pembuatan AV Shunt (Cimino) Baru vs Revisi", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["N185", "Z491"]}, {"operator": "OR", "codes": ["3942", "3952"]}]}, "warning": "Koreksi Spesifisitas: AV Shunt BARU menggunakan 39.27. Kode 39.42 HANYA untuk REVISI shunt lama."},
  {"id": "AUDIT-COD-39", "case": "Eksisi Gusi vs Kista Tulang Rahang", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["K051", "K052"]}, {"operator": "OR", "codes": ["244"]}]}, "warning": "Koreksi Anatomi: Eksisi di gusi/gingiva dikode 24.31. Jangan gunakan 24.4 (untuk kista di dalam tulang rahang/mandibula)."},
  {"id": "AUDIT-COD-40", "case": "Gejala Paraplegia pada HNP/Neoplasma Tulang Belakang", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["M512", "D166", "M51-"]}, {"operator": "OR", "codes": ["G822", "G82-"]}]}, "warning": "Underlying Cause: Paraplegia (G82.2) sebagai manifestasi HNP/Neoplasma (D16.6) TIDAK PERLU dikoding terpisah jika diagnosis utamanya sudah ditangani."},
  {"id": "AUDIT-COD-41", "case": "Kompresi Otak pada Cedera Kepala Traumatik", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["S06", "S062", "S064", "S068"]}, {"operator": "OR", "codes": ["G935"]}]}, "warning": "Kaidah Includes: G93.5 (Compression of brain) INCLUDE di dalam cedera intrakranial traumatik (S06.-). G93.5 hanya untuk kompresi otak NON-TRAUMATIK."},
  {"id": "AUDIT-COD-43", "case": "Salah Kode Kombinasi Batu Buli & Hidronefrosis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["N21", "N210"]}, {"operator": "OR", "codes": ["N13", "N132"]}, {"operator": "OR", "codes": ["N209"]}]}, "warning": "Ketidaksesuaian Anatomi: N20.9 HANYA untuk Batu Ginjal & Ureter. Jangan gunakan N20.9 untuk menggabungkan Batu Buli (N21.0) dengan Hidronefrosis (N13.2)."},
  {"id": "AUDIT-COD-44", "case": "Batu Ureter dan Pyelonephritis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["N201"]}, {"operator": "OR", "codes": ["N10"]}]}, "warning": "Kaidah Kombinasi: Batu Ureter (N20.1) & Pyelonephritis (N10) DIGABUNG menjadi N20.9 (Urinary calculus with pyelonephritis)."},
  {"id": "AUDIT-COD-46", "case": "Unbundling Induksi (Augmentasi) Persalinan", "condition": {"type": "simple", "operator": "OR", "codes": ["734"]}, "warning": "Kaidah Omit Code: 73.4 (Medical induction) TIDAK BOLEH digunakan jika tujuannya hanya 'augmentasi' (memperkuat kontraksi/HIS yang sudah ada). Augmentasi adalah OMIT CODE."},
  {"id": "AUDIT-COD-48", "case": "Abses Paru disertai Pneumonia Tidak Spesifik (J18.-)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["J850", "J852", "J853"]}, {"operator": "OR", "codes": ["J18", "J180", "J181", "J182", "J188", "J189"]}]}, "warning": "Kaidah Kode Kombinasi: Abses Paru tidak boleh dikoding terpisah dengan Pneumonia Unspecified (J18.-). Gunakan KODE KOMBINASI J85.1 sebagai Diagnosis Utama."},
  {"id": "AUDIT-COD-49", "case": "Abses Paru dengan Pneumonia Bakterial/Spesifik (J10-J16)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["J851"]}, {"operator": "OR", "codes": ["J10", "J11", "J12", "J13", "J14", "J15", "J16", "J159"]}]}, "warning": "Kaidah Excludes: Kode J85.1 memiliki Excludes untuk pneumonia bakterial/spesifik (J10-J16). Gunakan kode spesifik pneumonianya (J15.-) ditambah J85.2. JANGAN gunakan J85.1."},
  {"id": "AUDIT-COD-50", "case": "Pneumonia pada Tuberkulosis Paru", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A15", "A152", "A16", "A162"]}, {"operator": "OR", "codes": ["J18", "J189", "J15"]}]}, "warning": "Kaidah Includes: Kondisi Tuberculous Pneumonia sudah TERMASUK (Include) di dalam kode A15.2 / A16.2. Kode Pneumonia (J18.-) tidak boleh ditagihkan sebagai diagnosis sekunder."},
  {"id": "AUDIT-COD-51", "case": "Dengue Fever vs Dengue Haemorrhagic Fever", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A90"]}, {"operator": "OR", "codes": ["A91"]}]}, "warning": "Mutually Exclusive: Kode Dengue Fever (A90) mengeksklusi DHF (A91). Anda tidak boleh mengoding keduanya secara bersamaan dalam satu episode rawat."},
  {"id": "AUDIT-COD-52", "case": "Measles dengan Komplikasi Pneumonia", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["B059", "B05"]}, {"operator": "OR", "codes": ["J18", "J189"]}]}, "warning": "Dagger & Asterisk: Measles tanpa komplikasi adalah B05.9. Jika disertai Pneumonia, dilarang menggunakan J18.9. Gunakan sistem dagger-asterisk: B05.2+ (Utama) dan J17.1* (Sekunder)."},
  {"id": "AUDIT-COD-55", "case": "Overcoding Hemoptisis pada Tuberkulosis", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A15", "A150", "A16", "A160"]}, {"operator": "OR", "codes": ["R042"]}]}, "warning": "Overcoding Simtom: Hemoptisis (batuk darah / R04.2) merupakan bagian dari manifestasi klinis Tuberkulosis Paru. Tidak boleh dikode terpisah sebagai diagnosis sekunder."},
  {"id": "AUDIT-COD-58", "case": "Diagnosis Malunion dengan Fraktur Akut", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["M840"]}, {"operator": "OR", "codes": ["S72", "S82", "S52", "S-"]}]}, "warning": "Kaidah Excludes: Jika episode perawatan adalah penanganan Malunion / Non-union (M84.0), kode diagnosa Fraktur akut (S-codes) TIDAK DIKODE bersamaan."},
  {"id": "AUDIT-COD-59", "case": "Temuan Audit Coding: Psikosis & Epilepsi", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["F29"]}, {"operator": "OR", "codes": ["G40"]}]}, "warning": "Koreksi Koding: Jika Kasus Psikosis dan terdapat Epilepsi Psikosis gunakan Kode F06.8 (Sumber: Aturan ICD 10 2010)."}
];

const TOP_UP_RULES = [
  {"item": "Streptokinase", "layanan": "1", "cbgs": ["I410I", "I410II", "I410III"], "diags": ["I210", "I211", "I212", "I213", "I214", "I219", "I233"], "procs": ["9910"], "tarif": 4850700, "category": "sp"},
  {"item": "Deferiprone (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Deferoksamin (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Deferasirox (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Human Albumin for Septicaemia", "layanan": "1", "cbgs": ["A410I", "A410II", "A410III", "P816I", "P816II", "P816III", "W417I", "W417II", "W417III", "O611I", "O611II", "O611III", "O612I", "O612II", "O612III", "O613I", "O613II", "O613III"], "diags": ["A021", "A207", "A227", "A391", "A392", "A393", "A394", "A398", "A399", "A400", "A401", "A402", "A403", "A408", "A409", "A410", "A411", "A412", "A413", "A414", "A415", "A418", "A419", "A427", "B377", "R571", "O85", "P369", "P360", "P361", "P362", "P363", "P364", "P365", "P366", "P367", "P368"], "tarif": 2144600, "category": "sp"},
  {"item": "Anti Hemofilia Factor (IP)", "layanan": "1", "cbgs": ["D411I", "D411II", "D411III"], "diags": ["D66", "D67"], "tarif": 12637400, "category": "sp"},
  {"item": "Deferiprone (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Deferoksamin (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Deferasirox (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
  {"item": "Anti Hemofilia Factor (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D66", "D67"], "tarif": 12637400, "category": "sp"},
  {"item": "Human Albumin for Burn", "layanan": "1", "cbgs": ["S416I", "S416II", "S416III", "L120I", "L120II", "L120III"], "diags": ["T203", "T207", "T213", "T217", "T223", "T227", "T233", "T237", "T243", "T247", "T253", "T257", "T293", "T297", "T314", "T315", "T316", "T317", "T318", "T319", "T324", "T325", "T326", "T327", "T328", "T329"], "tarif": 15673000, "category": "sp"},
  {"item": "Nuclear Medicine", "layanan": "1", "cbgs": ["Z3170"], "procs": ["9205", "9215"], "tarif": 2231300, "category": "si"},
  {"item": "MRI", "layanan": "1", "cbgs": ["Z3160"], "procs": ["8892", "8893", "8897"], "tarif": 1865900, "category": "si"},
  {"item": "Diagnostic & Imaging of Eye", "layanan": "1", "cbgs": ["H3130"], "procs": ["9512"], "tarif": 594800, "category": "si"},
  {"item": "Subdural Grid Electrode", "layanan": "1", "cbgs": ["G110I", "G110II", "G110III"], "procs": ["0293"], "tarif": 16656400, "category": "sr"},
  {"item": "Contegra", "layanan": "1", "cbgs": ["I103I", "I103II", "I103III"], "procs": ["3592"], "tarif": 47175000, "category": "sr"},
  {"item": "TMJ Prosthesis", "layanan": "1", "cbgs": ["M160I", "M160II", "M160III"], "procs": ["765"], "tarif": 11868400, "category": "sr"},
  {"item": "Hip Implant", "layanan": "1", "cbgs": ["M104I", "M104II", "M104III"], "procs": ["8151", "8152", "8153", "8154", "8155"], "tarif": 18000000, "category": "sr"},
  {"item": "Evar / Tevar / Hevar Prosthesis", "layanan": "1", "cbgs": ["I120I", "I120II", "I120III"], "procs": ["3971", "3972", "3973"], "tarif": 119325000, "category": "sr"},
  {"item": "Hip/Knee Replacement", "layanan": "1", "cbgs": ["M104I", "M104II", "M104III"], "procs": ["8151", "8152", "8153", "8154", "8155"], "tarif": 13099000, "category": "sr"},
  {"item": "PCI", "layanan": "1", "cbgs": ["I140I", "I140II", "I140III"], "procs": ["3606", "3607"], "tarif": 14434100, "category": "sr"},
  {"item": "Keratoplasty", "layanan": "1", "cbgs": ["H130I", "H130II", "H130III"], "procs": ["1160", "1161", "1162", "1163", "1164", "1169"], "tarif": 8970200, "category": "sr"},
  {"item": "Pancreatectomy", "layanan": "1", "cbgs": ["B110I", "B110II", "B110III"], "procs": ["5251", "5252", "5253", "5259", "526"], "tarif": 8067400, "category": "sr"},
  {"item": "Repair of Septal Defect of Heart", "layanan": "1", "cbgs": ["I106I", "I106II", "I106III"], "procs": ["3550", "3551", "3552", "3553", "3555"], "tarif": 53870000, "category": "sr"},
  {"item": "Stereotactic Surgery & Radiotheraphy", "layanan": "1", "cbgs": ["C412I", "C412II", "C412III"], "diags": ["Z510"], "procs": ["9221", "9222", "9223", "9224", "9225", "9226", "9227", "9228", "9229", "9230", "9231", "9232", "9233", "9239"], "tarif": 4090100, "category": "sr"},
  {"item": "Torakotomi", "layanan": "1", "cbgs": ["J130I", "J130II", "J130III"], "procs": ["3402", "3403"], "tarif": 10142700, "category": "sr"},
  {"item": "Lobektomi / Bilobektomi", "layanan": "1", "cbgs": ["J110I", "J110II", "J110III"], "procs": ["3241", "3249", "3250", "3259"], "tarif": 12153800, "category": "sr"},
  {"item": "Vitrectomy", "layanan": "1", "cbgs": ["H130I", "H130II", "H130III"], "procs": ["1471", "1472", "1473", "1474"], "tarif": 8970200, "category": "sr"},
  {"item": "Phacoemulsification", "layanan": "1", "cbgs": ["H2360"], "procs": ["1341"], "tarif": 4410000, "category": "sr"},
  {"item": "Microlaringoscopy", "layanan": "2", "cbgs": ["J3150"], "procs": ["3141", "3142", "3144"], "tarif": 1173500, "category": "sr"},
  {"item": "Cholangiograph", "layanan": "2", "cbgs": ["B3110"], "procs": ["5110", "5111", "5114", "5115", "5213"], "tarif": 3411600, "category": "sr"},
  {"item": "Coil", "layanan": "2", "cbgs": ["G112I", "G112II", "G112III"], "procs": ["3975"], "tarif": 24141000, "category": "sr"},
  {"item": "Trombektomi", "layanan": "1", "cbgs": ["G112I", "G112II", "G112III"], "procs": ["3974"], "tarif": 17171600, "category": "sr"},
  {"item": "Percutaneous Endoscopy Gastrostomy", "layanan": "1", "cbgs": ["E410I", "E410II", "E410III"], "diags": ["E43", "E440", "E441"], "procs": ["4311"], "tarif": 2110100, "category": "sr"},
  {"item": "Odontektomi", "layanan": "1", "cbgs": ["U3160"], "procs": ["2319"], "tarif": 1475200, "category": "sr"},
  {"item": "Brakiterapi", "layanan": "2", "cbgs": ["C3100"], "diags": ["Z510"], "procs": ["9220", "9227"], "tarif": 1150000, "category": "sr"},
  {"item": "Knee Implant", "layanan": "1", "cbgs": ["M104I", "M104II", "M104III"], "procs": ["8151", "8152", "8153", "8154", "8155"], "tarif": 13000000, "category": "sr"}
  
  // Item di bawah ini dikecualikan sesuai permintaan agar tidak terbaca oleh logic potensi top up:
  // {"item": "CAPD (Consumables)", "layanan": "1", "procs": ["5498"], "tarif": 8000000, "category": "sd"},
  // {"item": "Imunohistokimia", "layanan": "1", "tarif": 1170000, "category": "sd"},
  // {"item": "EGFR Kanker Paru", "layanan": "1", "tarif": 1620000, "category": "sd"},
  // {"item": "PET Scan", "layanan": "1", "tarif": 10000000, "category": "si"}
];

// --- STORAGE HELPERS (INDEXED DB) ---
const DB_NAME = 'SyamAuditDB';
const DB_VERSION = 1;
const STORE_NAME = 'auditStore';
const LS_KEY = 'syamaudit_data';
const LS_RES  = 'syamaudit_resolutions';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setItemDB(key, value) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB Save Error:", e);
    return false;
  }
}

async function getItemDB(key) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB Load Error:", e);
    return null;
  }
}

async function removeItemDB(key) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB Delete Error:", e);
    return false;
  }
}

// --- ENGINE LOGIC ---
const norm = c => String(c||'').toUpperCase().replace(/\./g,'').trim();

// PARSER CURRENCY RUPIAH AMAN
// Mengubah "1.500.000,00" atau "1500000.00" menjadi angka murni
const parseCurrency = (val) => {
  if (!val || val === '-') return 0;
  let str = String(val).trim();
  // Hilangkan koma/titik desimal (,00 atau .00) di akhir angka E-Klaim
  if (str.match(/,\d{2}$/)) str = str.substring(0, str.length - 3);
  if (str.match(/\.\d{2}$/)) str = str.substring(0, str.length - 3);
  // Hilangkan semua karakter selain angka
  str = str.replace(/[^0-9]/g, '');
  return parseInt(str || '0', 10);
};

function findCol(obj, keywords) {
  if (!obj) return '';
  const keys = Object.keys(obj);
  
  for (let kw of keywords) {
    const target = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let k of keys) {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === target) return obj[k];
    }
  }
  for (let kw of keywords) {
    const target = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let k of keys) {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes(target) || target.includes(clean)) return obj[k];
    }
  }
  return '';
}

// Regex agresif untuk membaca ICD pemisah Spasi, Enter, Titik Koma, Koma, atau Plus
const splitCodes = (s) => String(s || '').split(/[;\s\n\r\t+,]+/).map(norm).filter(Boolean);

function checkAuditRule(row, rule) {
  const diags = new Set(splitCodes(row.DIAGLIST_TXT));
  const procs = new Set(splitCodes(row.PROCLIST_TXT));
  const all = new Set([...diags,...procs]);
  const cond = rule.condition;
  if (cond.type === 'simple') {
    const rc = new Set(cond.codes.map(norm));
    return [...rc].some(c => all.has(c));
  }
  if (cond.type === 'grouped') {
    const gRes = cond.groups.map(g => {
      return g.codes.map(norm).some(gc => {
        if (gc.endsWith('-')) return [...all].some(ac => ac.startsWith(gc.slice(0,-1)));
        return all.has(gc);
      });
    });
    return cond.operator === 'AND' ? gRes.every(Boolean) : gRes.some(Boolean);
  }
  return false;
}

function checkTopUp(row, rule) {
  const diags = splitCodes(row.DIAGLIST_TXT);
  const procs = splitCodes(row.PROCLIST_TXT);
  const cbg = norm(row.INACBG);
  const layanan = String(row.PTD||'');
  
  if (rule.layanan && rule.layanan !== layanan) return false;
  if (rule.cbgs && !rule.cbgs.includes(cbg)) return false;
  
  // LOGIKA DIPERBAIKI SESUAI INSTRUKSI:
  // SEMUA rule Top Up yang mensyaratkan Diagnosis,
  // wajib dievaluasi berdasarkan DIAGNOSIS UTAMA (index ke 0).
  if (rule.diags) {
    if (diags.length === 0) return false;
    if (!rule.diags.includes(diags[0])) return false;
  }
  
  if (rule.procs && !rule.procs.some(p => procs.includes(p))) return false;
  
  // Pastikan top up belum ditagihkan (nilai SD/SR/SI/SP harus 0)
  const cats = ['SD','SR','SI','SP'];
  for (const c of cats){
    if (row[c] && row[c] > 0) return false; // Nilai > 0 berarti sudah ada tagihan (bukan potensi lagi)
  }
  return true;
}

function normList(s) {
  if (!s || s === '-') return '';
  return [...new Set(splitCodes(s))].sort().join('');
}

// --- FILE PARSERS ---
async function parseTxt(file) {
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  const COL_MAP = {
    50:'SEP', 53:'CODER_ID', 45:'NAMA_PASIEN', 46:'MRN', 19:'INACBG',
    26:'DESKRIPSI_INACBG', 39:'TARIF_RS_TXT', 38:'TARIF_INACBG_TXT',
    11:'DIAGLIST_TXT', 12:'PROCLIST_TXT', 5:'TGL_MASUK', 6:'TGL_PULANG',
    4:'PTD', 82:'IDRG_DRG_CODE', 83:'IDRG_DRG_DESCRIPTION', 90:'IDRG_TOTAL_TARIF',
    78:'IDRG_DIAG_LISTS', 79:'IDRG_PROC_LISTS',
    34:'SR', 35:'SD', 36:'SI', 37:'SP'
  };
  const rows = [];
  for (const line of lines){
    const cols = line.split('\t');
    const row = {};
    for (const [idx,name] of Object.entries(COL_MAP)){
      row[name] = (cols[parseInt(idx)] || '').trim();
    }
    if (row.SEP) {
      row.TARIF_INACBG_TXT = parseCurrency(row.TARIF_INACBG_TXT);
      row.TARIF_RS_TXT = parseCurrency(row.TARIF_RS_TXT);
      row.SD = parseCurrency(row.SD);
      row.SR = parseCurrency(row.SR);
      row.SI = parseCurrency(row.SI);
      row.SP = parseCurrency(row.SP);
      rows.push(row);
    }
  }
  return rows;
}

async function parseExcelPending(file) {
  const ab = await file.arrayBuffer();
  const wb = window.XLSX.read(ab);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
  return data.map(r => {
    const sep = findCol(r, ['SEP', 'NOSEP']);
    const status = findCol(r, ['Status', 'STATUSPENDING']);
    const ket = findCol(r, ['Keterangan', 'Alasan', 'Pending', 'Catatan']);
    return sep ? { SEP: String(sep).trim(), STATUS_PENDING: String(status).trim(), KETERANGAN_PENDING: String(ket).trim() } : null;
  }).filter(Boolean);
}

async function parseSyamval(file) {
  const ab = await file.arrayBuffer();
  let rows = [];
  try {
    const wb = window.XLSX.read(ab, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch(e) {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const trs = doc.querySelectorAll('tr');
    
    let headerRow = -1;
    for (let i=0; i<trs.length; i++) {
       if (trs[i].querySelectorAll('th').length > 0 || trs[i].innerText.includes('SEP')) {
           headerRow = i;
           break;
       }
    }
    
    if (headerRow !== -1) {
        const headers = [...trs[headerRow].querySelectorAll('th,td')].map(c => c.innerText.trim());
        for (let i=headerRow+1; i<trs.length; i++){
          const cells = [...trs[i].querySelectorAll('td')].map(c => c.innerText.trim());
          if (cells.length === 0) continue;
          const obj = {};
          headers.forEach((h,j) => obj[h] = cells[j] || '');
          rows.push(obj);
        }
    }
  }
  
  return rows.map(r => {
    const sep = findCol(r, ['SEP', 'NOSEP']);
    const coder = findCol(r, ['NamaCoder', 'Coder', 'Koder', 'Nama']);
    const coding = findCol(r, ['CodingICD', 'Diagnosa', 'Kode', 'ICD']);
    return sep ? { SEP: String(sep).trim(), NAMA_CODER: String(coder).trim(), CODING_ICD_SYAMVAL: String(coding).trim() } : null;
  }).filter(Boolean);
}

function processAudit(txtRows, pendingRows, syamvalRows, resolutions) {
  const pendingMap = Object.fromEntries(pendingRows.map(r => [r.SEP,r]));
  const syamvalMap = Object.fromEntries(syamvalRows.map(r => [r.SEP,r]));

  const result = txtRows.map(row => {
    const p = pendingMap[row.SEP] || {};
    const s = syamvalMap[row.SEP] || {};
    const res = resolutions[row.SEP] || {};
    return {
      ...row,
      STATUS_PENDING: p.STATUS_PENDING || 'Layak Klaim',
      KETERANGAN_PENDING: p.KETERANGAN_PENDING || '-',
      NAMA_CODER: s.NAMA_CODER || '',
      CODING_ICD_SYAMVAL: s.CODING_ICD_SYAMVAL || '',
      JAWABAN: res.JAWABAN || '-',
      TINDAK_LANJUT: res.TINDAK_LANJUT || '-',
    };
  });

  result.forEach(row => {
    const warns = DEFAULT_AUDIT_RULES.filter(r => checkAuditRule(row,r)).map(r => r.warning);
    row.AUDIT_WARNINGS = warns.length ? warns.join('; ') : 'Clean';
    
    const matches = TOP_UP_RULES.filter(r => checkTopUp(row,r));
    row.POTENSI_TOPUP = matches.length ? matches.map(r => r.item).join('; ') : '-';
    row.POTENSI_NILAI = matches.reduce((s,r) => s + (r.tarif || 0), 0);
    
    const txtCodes = normList((row.DIAGLIST_TXT||'') + ';' + (row.PROCLIST_TXT||''));
    const svCodes  = normList(row.CODING_ICD_SYAMVAL||'');
    row.IS_DISCREPANT = txtCodes !== svCodes && svCodes !== '';
    row.DISPLAY_CODER = row.NAMA_CODER || row.CODER_ID || 'Unknown';
  });

  const coderMap = {};
  result.forEach(row => {
    const c = row.DISPLAY_CODER;
    if (!coderMap[c]) coderMap[c] = { name: c, total: 0, clean: 0, audit: 0, topup: 0, nilai: 0, diff: 0 };
    coderMap[c].total++;
    if (row.AUDIT_WARNINGS === 'Clean') coderMap[c].clean++; else coderMap[c].audit++;
    if (row.POTENSI_TOPUP !== '-') coderMap[c].topup++;
    coderMap[c].nilai += row.POTENSI_NILAI || 0;
    if (row.IS_DISCREPANT) coderMap[c].diff++;
  });
  const perf = Object.values(coderMap).map(c => {
    return { ...c, akurasi: c.total > 0 ? ((c.clean/c.total)*100).toFixed(1) : 0 };
  });

  const summary = {
    total_cases: result.length,
    audit_findings: result.filter(r => r.AUDIT_WARNINGS !== 'Clean').length,
    topup_findings: result.filter(r => r.POTENSI_TOPUP !== '-').length,
    discrepancies: result.filter(r => r.IS_DISCREPANT).length,
    pending_cases: result.filter(r => r.STATUS_PENDING !== 'Layak Klaim').length,
    total_topup_value: result.reduce((s,r) => s + (r.POTENSI_NILAI || 0), 0),
  };
  return { summary, perf, rows: result };
}

// --- SUB-COMPONENTS ---
const StatCard = ({ icon: Icon, label, value, colorClass }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:-translate-y-1 transition-transform">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass.bg} ${colorClass.text}`}>
      <Icon size={24} />
    </div>
    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</div>
    <div className="text-2xl font-black text-slate-800 dark:text-white">{value}</div>
  </div>
);

const UploadBox = ({ title, icon: Icon, accept, onFiles, files = [] }) => {
  return (
    <label className={`flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${files.length > 0 ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/5' : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-500/50'}`}>
      <div className="w-16 h-16 bg-white dark:bg-slate-950 shadow-sm rounded-2xl flex items-center justify-center text-slate-400">
        <Icon size={32} className={files.length > 0 ? 'text-teal-500' : ''} />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">Klik atau seret file ke sini</p>
      </div>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 justify-center">
          {files.map((f, i) => (
            <div key={i} className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/10 px-3 py-1 rounded-full truncate max-w-[200px]" title={f.name}>✅ {f.name}</div>
          ))}
        </div>
      )}
      <input type="file" multiple accept={accept} onChange={e => {
        if(e.target.files.length > 0) onFiles(Array.from(e.target.files));
        e.target.value = null; 
      }} className="hidden" />
    </label>
  );
};

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('upload');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [auditData, setAuditData] = useState(null);
  const [files, setFiles] = useState({ txt: [], pending: [], syamval: [] });
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('audit');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [resolutions, setResolutions] = useState({});

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    
    const loadCachedData = async () => {
      const resData = await getItemDB(LS_RES);
      if (resData) setResolutions(resData);
      
      const cached = await getItemDB(LS_KEY);
      if (cached) { 
        setAuditData(cached); 
        setView('dashboard'); 
      }
    };
    loadCachedData();
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const runAudit = async () => {
    if (!files.txt.length) { alert('Upload minimal 1 file TXT terlebih dahulu!'); return; }
    if (!window.XLSX) { alert('Library Excel sedang disiapkan. Tunggu 1-2 detik lalu coba lagi.'); return; }
    
    setProcessing(true);
    try {
      const txtPromises = files.txt.map(f => parseTxt(f));
      const allTxt = (await Promise.all(txtPromises)).flat();
      const sepSeen = new Set();
      const dedupTxt = allTxt.filter(r => { if (sepSeen.has(r.SEP)) return false; sepSeen.add(r.SEP); return true; });

      let pendingRows = [];
      for (const f of files.pending) pendingRows.push(...(await parseExcelPending(f)));

      let syamvalRows = [];
      for (const f of files.syamval) syamvalRows.push(...(await parseSyamval(f)));

      const result = processAudit(dedupTxt, pendingRows, syamvalRows, resolutions);
      const ok = await setItemDB(LS_KEY, result);
      if (!ok) alert('Gagal menyimpan ke penyimpanan lokal browser. Namun Anda tetap dapat melihat hasilnya.');
      setAuditData(result);
      setView('dashboard');
    } catch(e) {
      alert('Error saat proses: ' + e.message);
      console.error(e);
    } finally { setProcessing(false); }
  };

  const saveResolution = async (sep, jawaban, tindakLanjut) => {
    const updated = { ...resolutions, [sep]: { JAWABAN: jawaban, TINDAK_LANJUT: tindakLanjut } };
    setResolutions(updated);
    await setItemDB(LS_RES, updated);
    if (auditData) {
      const newRows = auditData.rows.map(r => r.SEP === sep ? { ...r, JAWABAN: jawaban, TINDAK_LANJUT: tindakLanjut } : r);
      const newData = { ...auditData, rows: newRows };
      setAuditData(newData);
      await setItemDB(LS_KEY, newData);
    }
  };

  const clearStorage = async () => {
    if (!confirm('Hapus seluruh riwayat data tersimpan? Aksi ini tidak dapat dibatalkan.')) return;
    await removeItemDB(LS_KEY);
    await removeItemDB(LS_RES);
    setAuditData(null); setResolutions({});
    setFiles({ txt: [], pending: [], syamval: [] });
    setView('upload');
  };

  const getFilteredRows = () => {
    if (!auditData) return [];
    let src = [];
    if (tab === 'audit') src = auditData.rows.filter(r => r.AUDIT_WARNINGS !== 'Clean');
    else if (tab === 'topup') src = auditData.rows.filter(r => r.POTENSI_TOPUP !== '-');
    else if (tab === 'pending') src = auditData.rows.filter(r => r.STATUS_PENDING !== 'Layak Klaim');
    else if (tab === 'discrepancy') src = auditData.rows.filter(r => r.IS_DISCREPANT);
    else src = auditData.rows;
    
    if (!search) return src;
    const q = search.toLowerCase();
    return src.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  };

  const summary = auditData?.summary || {};
  const filteredRows = getFilteredRows();

  if (processing) return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-50">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }} className="text-teal-500 mb-8">
        <ShieldCheck size={80} />
      </motion.div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Menganalisis Data...</h2>
      <p className="text-slate-500 font-medium mt-2">Menjalankan audit coding rules secara lokal</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-teal-500/30 transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">SYAMAUDIT</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RSUD Syamsudin</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView('upload')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'upload' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <Upload size={18} /> Data Center
          </button>
          <button onClick={() => setView('dashboard')} disabled={!auditData} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <LayoutDashboard size={18} /> Analytics
          </button>
          <button onClick={() => setView('perf')} disabled={!auditData} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === 'perf' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <Users size={18} /> Performa Koder
          </button>
        </nav>
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {theme === 'dark' ? <><Sun size={16}/> Light Mode</> : <><Moon size={16}/> Dark Mode</>}
          </button>
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine Status</p>
            <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-1">Browser-Local</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <AnimatePresence mode="wait">
          {view === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto">
              <header className="mb-10">
                <h2 className="text-4xl font-black text-slate-800 dark:text-white">Data <span className="text-teal-500 dark:text-teal-400">Center</span></h2>
                <p className="text-slate-500 mt-2">Unggah dataset klaim (mendukung multi-file) untuk diproses secara lokal tanpa backend.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <UploadBox title="E-Klaim (.TXT)" icon={FileText} accept=".TXT,.txt" onFiles={f => setFiles(p => ({ ...p, txt: [...p.txt, ...f] }))} files={files.txt} />
                <UploadBox title="Syamval (.xls/.html)" icon={SplitSquareHorizontal} accept=".xls,.xlsx,.html" onFiles={f => setFiles(p => ({ ...p, syamval: [...p.syamval, ...f] }))} files={files.syamval} />
                <UploadBox title="Pending BPJS (.xlsx)" icon={AlertTriangle} accept=".xlsx,.xls" onFiles={f => setFiles(p => ({ ...p, pending: [...p.pending, ...f] }))} files={files.pending} />
              </div>

              <div className="flex justify-center mb-16">
                <button onClick={runAudit} disabled={!files.txt.length} className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:to-cyan-500 text-white rounded-2xl font-black shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                  <Play size={20} /> Mulai Audit Otomatis
                </button>
              </div>

              {auditData && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
                   <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2"><Database size={20} className="text-teal-500"/> Riwayat Data Tersimpan</h3>
                   <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center rounded-xl"><CheckCircle2 size={24}/></div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white">Data Audit Aktif Tersedia</p>
                          <p className="text-sm text-slate-500 font-medium">{summary.total_cases} Kasus Dievaluasi | {summary.audit_findings} Temuan Rule</p>
                        </div>
                      </div>
                      <button onClick={clearStorage} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 hover:dark:bg-slate-800 rounded-xl font-bold transition-colors shadow-sm">
                         <Trash2 size={16} /> Hapus Seluruh Data
                      </button>
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'dashboard' && auditData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1600px] mx-auto space-y-8">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white">Audit Insights</h2>
                  <p className="text-slate-500 mt-2 text-sm">Dashboard monitoring audit coding klaim</p>
                </div>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={Database} label="Total Kasus" value={summary.total_cases?.toLocaleString()} colorClass={{bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400'}} />
                <StatCard icon={AlertTriangle} label="Temuan Audit" value={summary.audit_findings} colorClass={{bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400'}} />
                <StatCard icon={TrendingUp} label="Potensi Top-Up" value={`Rp ${(summary.total_topup_value||0).toLocaleString('id-ID')}`} colorClass={{bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400'}} />
                <StatCard icon={Info} label="Pending Klaim" value={summary.pending_cases} colorClass={{bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400'}} />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex gap-2 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    {[
                      {id: 'audit', label: 'Audit', count: summary.audit_findings},
                      {id: 'pending', label: 'Pending', count: summary.pending_cases},
                      {id: 'topup', label: 'Top-Up', count: summary.topup_findings},
                      {id: 'discrepancy', label: 'Diskrepansi', count: summary.discrepancies},
                      {id: 'all', label: 'Semua', count: summary.total_cases}
                    ].map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tab === t.id ? 'bg-teal-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        {t.label} <span className={`${tab === t.id ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-800'} px-2 py-0.5 rounded-md`}>{t.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Cari SEP, Nama..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors w-64 shadow-sm" />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                  {filteredRows.length === 0 ? (
                    <div className="p-16 text-center text-slate-500"><p>Tidak ada data ditemukan.</p></div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                        <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Info Kasus</th>
                          <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Koder</th>
                          {tab==='pending' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Keterangan Pending</th>}
                          {tab==='audit' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Temuan Audit</th>}
                          {tab==='topup' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Potensi Top-Up</th>}
                          {tab==='pending' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Resolusi</th>}
                          {tab==='discrepancy' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Kode Syamval</th>}
                          {tab==='all' && <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Status</th>}
                          <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredRows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 dark:text-white">{row.SEP}</div>
                              <div className="text-xs text-slate-500 mt-1">{row.NAMA_PASIEN}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{row.DISPLAY_CODER}</div>
                            </td>
                            {tab==='pending' && (
                              <td className="px-6 py-4">
                                <div className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] whitespace-normal line-clamp-2">{row.KETERANGAN_PENDING}</div>
                              </td>
                            )}
                            {tab==='audit' && <td className="px-6 py-4 text-xs whitespace-normal max-w-[300px]">{row.AUDIT_WARNINGS === 'Clean' ? <span className="text-emerald-500 dark:text-emerald-400 font-bold">✅ Clean</span> : <span className="text-rose-500 dark:text-rose-400 italic">{row.AUDIT_WARNINGS}</span>}</td>}
                            {tab==='topup' && <td className="px-6 py-4"><div className="text-xs font-bold text-orange-500 dark:text-orange-400">{row.POTENSI_TOPUP}</div><div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">Rp {(row.POTENSI_NILAI||0).toLocaleString()}</div></td>}
                            {tab==='pending' && <td className="px-6 py-4"><div className="text-xs text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{row.JAWABAN !== '-' ? row.JAWABAN : '—'}</div><div className="text-[10px] font-bold text-teal-600 dark:text-teal-500 mt-1">{row.TINDAK_LANJUT !== '-' ? row.TINDAK_LANJUT : ''}</div></td>}
                            {tab==='discrepancy' && <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">{row.CODING_ICD_SYAMVAL || '-'}</td>}
                            {tab==='all' && <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${row.STATUS_PENDING === 'Layak Klaim' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'}`}>{row.STATUS_PENDING}</span></td>}
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {tab==='pending' && <button onClick={() => setEditItem(row)} className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500 hover:text-white rounded-lg transition-colors"><Edit3 size={14}/></button>}
                                <button onClick={() => setDetailItem(row)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 hover:dark:text-white rounded-lg transition-colors"><ChevronRight size={14}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'perf' && auditData && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1600px] mx-auto space-y-8">
               <header>
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white">Performa Koder</h2>
                 <p className="text-slate-500 mt-2 text-sm">Ringkasan akurasi koding per petugas</p>
               </header>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden p-6 shadow-sm">
                 <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="py-4 px-4 font-bold">Nama Koder</th>
                        <th className="py-4 px-4 font-bold">Total</th>
                        <th className="py-4 px-4 font-bold">Clean</th>
                        <th className="py-4 px-4 font-bold">Temuan</th>
                        <th className="py-4 px-4 font-bold">Top-Up</th>
                        <th className="py-4 px-4 font-bold">Nilai Top-Up</th>
                        <th className="py-4 px-4 font-bold">Akurasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                       {auditData.perf.sort((a,b)=>b.total-a.total).map((p,i) => (
                         <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                           <td className="py-4 px-4 font-bold text-slate-800 dark:text-white">{p.name}</td>
                           <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{p.total}</td>
                           <td className="py-4 px-4 text-emerald-600 dark:text-emerald-400">{p.clean}</td>
                           <td className="py-4 px-4 text-rose-600 dark:text-rose-400">{p.audit}</td>
                           <td className="py-4 px-4 text-orange-600 dark:text-orange-400">{p.topup}</td>
                           <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">Rp {(p.nilai||0).toLocaleString()}</td>
                           <td className="py-4 px-4">
                             <div className={`font-bold ${p.akurasi >= 80 ? 'text-emerald-500 dark:text-emerald-400' : p.akurasi >= 60 ? 'text-orange-500 dark:text-orange-400' : 'text-rose-500 dark:text-rose-400'}`}>{p.akurasi}%</div>
                             <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{width: `${p.akurasi}%`}}></div></div>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      {detailItem && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-transparent rounded-t-3xl">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3"><Info className="text-teal-500" /> Detail Kasus</h3>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-6">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Nama Pasien</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.NAMA_PASIEN || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">No. SEP</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.SEP || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">ICD-10 (TXT)</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.DIAGLIST_TXT || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">ICD-9-CM (TXT)</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.PROCLIST_TXT || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Koder</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.DISPLAY_CODER || '-'}</p></div>
              </div>
              <div className="space-y-6">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Tarif INA-CBG</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">Rp {parseInt(detailItem.TARIF_INACBG_TXT||0).toLocaleString()}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Potensi Top-Up</p><p className="font-black text-teal-600 dark:text-teal-400 mt-1">{detailItem.POTENSI_TOPUP || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Temuan Audit</p><p className="font-bold text-rose-500 dark:text-rose-400 italic mt-1">{detailItem.AUDIT_WARNINGS || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Status Klaim</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.STATUS_PENDING || '-'}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase">Syamval Coding</p><p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailItem.CODING_ICD_SYAMVAL || '-'}</p></div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-transparent rounded-b-3xl">
                <button onClick={() => setDetailItem(null)} className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col">
             <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-transparent rounded-t-3xl">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3"><Edit3 className="text-teal-500" /> Resolusi Pending</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Keterangan BPJS</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 italic font-medium">"{editItem.KETERANGAN_PENDING}"</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Usulan Resolusi</label>
                <textarea className="w-full h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-800 dark:text-white outline-none focus:border-teal-500 transition-colors shadow-sm" placeholder="Tulis jawaban..." defaultValue={editItem.JAWABAN !== '-' ? editItem.JAWABAN : ''} id="resolusi_input"></textarea>
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Tindak Lanjut</label>
                 <select className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white outline-none focus:border-teal-500 shadow-sm" defaultValue={editItem.TINDAK_LANJUT !== '-' ? editItem.TINDAK_LANJUT : ''} id="tindaklanjut_input">
                   <option value="">— Pilih Status —</option>
                   <option value="Proses Perbaikan Dokumen">Proses Perbaikan Dokumen</option>
                   <option value="Siap Ajukan Kembali">Siap Ajukan Kembali</option>
                   <option value="Tolak / Tidak Dapat Diproses">Tolak / Tidak Dapat Diproses</option>
                 </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-transparent rounded-b-3xl">
              <button onClick={() => setEditItem(null)} className="px-6 py-2.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors">Batal</button>
              <button onClick={() => saveResolution(editItem.SEP, document.getElementById('resolusi_input').value, document.getElementById('tindaklanjut_input').value)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-500/20">Simpan Resolusi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
