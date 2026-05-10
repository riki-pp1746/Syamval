import pandas as pd
import numpy as np
import os
import glob
import json

# --- DATA RULES ---
DEFAULT_AUDIT_RULES = [
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
    {"id": "AUDIT-COD-29", "case": "Preterm Labour (O60) vs False Labour (O47)", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["O600"]}, {"operator": "OR", "codes": ["O470", "O479"]}]}, "warning": "Kaidah Excludes: False Labour (O47.0) TIDAK BISA dikoding bersamaan dengan Preterm Labour (O60.0)."},
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
]

TOP_UP_RULES = [
    {"item": "Streptokinase", "layanan": "1", "cbgs": ["I410I", "I410II", "I410III"], "diags": ["I210", "I211", "I212", "I213", "I214", "I219", "I233"], "procs": ["9910"], "tarif": 4850700, "category": "sp"},
    {"item": "Deferiprone (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Deferoksamin (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Deferasirox (IP)", "layanan": "1", "cbgs": ["D413I", "D413II", "D413III"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Human Albumin for Septicaemia", "layanan": "1", "cbgs": ["A410I", "A410II", "A410III", "P816I", "P816II", "P816III", "W417I", "W417II", "W417III", "O611I", "O611II", "O611III", "O612I", "O612II", "O612III", "O613I", "O613II", "O613III"], "diags": ["A021", "A207", "A227", "A391", "A392", "A393", "A394", "A398", "A399", "A400", "A401", "A402", "A403", "A408", "A409", "A410", "A411", "A412", "A413", "A414", "A415", "A418", "A419", "A427", "B377", "R571", "O85", "P369", "P360", "P361", "P362", "P363", "P364", "P365", "P366", "P367", "P368"], "tarif": 2144600, "category": "sp", "primaryOnly": True},
    {"item": "Anti Hemofilia Factor (IP)", "layanan": "1", "cbgs": ["D411I", "D411II", "D411III"], "diags": ["D66", "D67"], "tarif": 12637400, "category": "sp"},
    {"item": "Deferiprone (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Deferoksamin (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Deferasirox (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D561"], "tarif": 0, "category": "sp"},
    {"item": "Anti Hemofilia Factor (OP)", "layanan": "2", "cbgs": ["Q5440"], "diags": ["D66", "D67"], "tarif": 12637400, "category": "sp"},
    {"item": "Human Albumin for Burn", "layanan": "1", "cbgs": ["S416I", "S416II", "S416III", "L120I", "L120II", "L120III"], "diags": ["T203", "T207", "T213", "T217", "T223", "T227", "T233", "T237", "T243", "T247", "T253", "T257", "T293", "T297", "T314", "T315", "T316", "T317", "T318", "T319", "T324", "T325", "T326", "T327", "T328", "T329"], "tarif": 15673000, "category": "sp", "primaryOnly": True},
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
    {"item": "Knee Implant", "layanan": "1", "cbgs": ["M104I", "M104II", "M104III"], "procs": ["8151", "8152", "8153", "8154", "8155"], "tarif": 13000000, "category": "sr"},
    {"item": "CAPD (Consumables)", "layanan": "1", "procs": ["5498"], "tarif": 8000000, "category": "sd"},
    {"item": "Imunohistokimia", "layanan": "1", "tarif": 1170000, "category": "sd"},
    {"item": "EGFR Kanker Paru", "layanan": "1", "tarif": 1620000, "category": "sd"},
    {"item": "PET Scan", "layanan": "1", "tarif": 10000000, "category": "si"}
]

def normalize_code(c):
    return str(c or '').upper().replace(".", "").strip()

def check_audit_rule(row, rule):
    # Prepare diagnostic and procedural codes as sets for fast lookup
    diags = set(normalize_code(c) for c in str(row['DIAGLIST_TXT']).split(";"))
    procs = set(normalize_code(c) for c in str(row['PROCLIST_TXT']).split(";"))
    all_codes = diags.union(procs)

    cond = rule['condition']
    if cond['type'] == 'simple':
        rule_codes = set(normalize_code(c) for c in cond['codes'])
        return any(rc in all_codes for rc in rule_codes)
    
    if cond['type'] == 'grouped':
        group_results = []
        for group in cond['groups']:
            group_codes = set(normalize_code(c) for c in group['codes'])
            # Match if any code in group exists in patient codes
            # Handle special cases like "S-" which means prefix match
            match = False
            for gc in group_codes:
                if gc.endswith("-"):
                    prefix = gc[:-1]
                    if any(ac.startswith(prefix) for ac in all_codes):
                        match = True; break
                elif gc in all_codes:
                    match = True; break
            group_results.append(match)
        
        if cond['operator'] == 'AND':
            return all(group_results)
        return any(group_results)
    
    return False

def check_top_up(row, rule):
    diags = [normalize_code(c) for c in str(row['DIAGLIST_TXT']).split(";")]
    procs = [normalize_code(c) for c in str(row['PROCLIST_TXT']).split(";")]
    cbg = normalize_code(row['INACBG'])
    layanan = str(row['PTD']) # 1 RI, 2 RJ

    # Match Layanan
    if 'layanan' in rule and rule['layanan'] != layanan:
        return False
    
    # Match CBG
    if 'cbgs' in rule and cbg not in rule['cbgs']:
        return False
    
    # Match Diags (Primary only logic as per user request)
    if 'diags' in rule:
        primary_diag = diags[0] if diags else ""
        if primary_diag not in rule['diags']:
            return False
    
    # Match Procs (Anywhere in procs)
    if 'procs' in rule:
        if not any(pc in procs for pc in rule['procs']):
            return False
            
    # NEW LOGIC: Check if already filled in SD/SR/SI/SP
    cat = rule.get('category', '').lower()
    val = str(row.get(cat.upper(), '-')).strip()
    
    # If the category column already has a value (not empty or -), 
    # it's NOT a "potential" top up anymore, it's already claimed.
    if val and val != '-':
        return False
        
    return True

def process_audit_coding(return_data=False):
    target_dir = os.environ.get("AUDIT_TARGET_DIR", os.getcwd())
    os.chdir(target_dir)

    print("--- Memulai Pemrosesan Data Audit Coding (Enhanced) ---")

    # 1. Load TXT Files
    txt_files = glob.glob("*.TXT")
    if not txt_files:
        print("Error: Tidak ditemukan file .TXT")
        return

    all_txt_data = []
    for f in txt_files:
        print(f"Membaca file TXT: {f}")
        df_txt = pd.read_csv(f, sep='\t', header=None, dtype=str)
        cols = {
            50: 'SEP', 53: 'CODER_ID', 45: 'NAMA_PASIEN', 46: 'MRN', 19: 'INACBG',
            26: 'DESKRIPSI_INACBG', 39: 'TARIF_RS_TXT', 38: 'TARIF_INACBG_TXT',
            11: 'DIAGLIST_TXT', 12: 'PROCLIST_TXT', 5: 'TGL_MASUK', 6: 'TGL_PULANG',
            4: 'PTD', 82: 'IDRG_DRG_CODE', 83: 'IDRG_DRG_DESCRIPTION', 90: 'IDRG_TOTAL_TARIF',
            78: 'IDRG_DIAG_LISTS', 79: 'IDRG_PROC_LISTS',
            34: 'SR', 35: 'SD', 36: 'SI', 37: 'SP'
        }
        df_txt = df_txt[list(cols.keys())].rename(columns=cols)
        all_txt_data.append(df_txt)
    df_main = pd.concat(all_txt_data).drop_duplicates(subset=['SEP'], keep='last')
    print(f"Selesai membaca TXT: {len(df_main)} baris.")

    # 2. Load Excel Pending
    print("Membaca file Excel Pending...")
    pending_files = glob.glob("Data pending*.xlsx")
    dfs_pending = []
    for f in pending_files:
        temp_df = pd.read_excel(f).rename(columns={'No. SEP': 'SEP', 'Status': 'STATUS_PENDING', 'Keterangan': 'KETERANGAN_PENDING'})
        dfs_pending.append(temp_df[['SEP', 'STATUS_PENDING', 'KETERANGAN_PENDING']])
    
    if dfs_pending:
        df_pending_final = pd.concat(dfs_pending).drop_duplicates(subset=['SEP'])
    else:
        df_pending_final = pd.DataFrame(columns=['SEP', 'STATUS_PENDING', 'KETERANGAN_PENDING'])
    print(f"Selesai membaca Pending: {len(df_pending_final)} kasus.")

    # 3. Load Syamval Report
    print("Membaca laporan Syamval (HTML/XLS)...")
    syamval_files = glob.glob("LAPORAN_SYAMVAL*.xls")
    if syamval_files:
        latest_syamval = max(syamval_files, key=os.path.getmtime)
        try:
            # Use lxml flavor for better performance
            df_syamval = pd.read_html(latest_syamval, flavor='lxml')[0].rename(columns={'SEP': 'SEP', 'Nama Coder': 'NAMA_CODER', 'Coding ICD': 'CODING_ICD_SYAMVAL'})
            df_syamval_final = df_syamval[['SEP', 'NAMA_CODER', 'CODING_ICD_SYAMVAL']].drop_duplicates(subset=['SEP'])
        except Exception as e:
            print(f"Gagal membaca Syamval: {e}. Mencoba flavor standar...")
            df_syamval = pd.read_html(latest_syamval)[0].rename(columns={'SEP': 'SEP', 'Nama Coder': 'NAMA_CODER', 'Coding ICD': 'CODING_ICD_SYAMVAL'})
            df_syamval_final = df_syamval[['SEP', 'NAMA_CODER', 'CODING_ICD_SYAMVAL']].drop_duplicates(subset=['SEP'])
    else: df_syamval_final = pd.DataFrame(columns=['SEP', 'NAMA_CODER', 'CODING_ICD_SYAMVAL'])
    print(f"Selesai membaca Syamval: {len(df_syamval_final)} baris.")

    # 3.5 Load Persistent Resolutions
    res_file = "pending_resolutions.json"
    if os.path.exists(res_file):
        try:
            with open(res_file, 'r') as f:
                res_data = json.load(f)
            df_res = pd.DataFrame(res_data)
            if not df_res.empty:
                df_res = df_res[['SEP', 'JAWABAN', 'TINDAK_LANJUT']].drop_duplicates(subset=['SEP'])
            else:
                df_res = pd.DataFrame(columns=['SEP', 'JAWABAN', 'TINDAK_LANJUT'])
        except: df_res = pd.DataFrame(columns=['SEP', 'JAWABAN', 'TINDAK_LANJUT'])
    else:
        df_res = pd.DataFrame(columns=['SEP', 'JAWABAN', 'TINDAK_LANJUT'])

    # 4. Merging
    print("Menggabungkan data...")
    result = df_main.merge(df_pending_final, on='SEP', how='left')\
                   .merge(df_syamval_final, on='SEP', how='left')\
                   .merge(df_res, on='SEP', how='left')
    
    result['STATUS_PENDING'] = result['STATUS_PENDING'].fillna('Layak Klaim')
    result['KETERANGAN_PENDING'] = result['KETERANGAN_PENDING'].fillna('-')
    result['JAWABAN'] = result['JAWABAN'].fillna('-')
    result['TINDAK_LANJUT'] = result['TINDAK_LANJUT'].fillna('-')

    # 5. Run Audit Rules & Top Up
    # 5. Run Audit Rules & Top Up & Comparison
    print("Menjalankan Audit Coding Rules, Potensi Top Up & Perbandingan Kode...")
    audit_results = []
    topup_results = []
    topup_values = []
    discrepancy_flags = []
    
    def normalize_list(s):
        if pd.isna(s) or s == '-': return ""
        return "".join(sorted([normalize_code(c) for c in str(s).replace("+", ";").split(";") if c]))

    for _, row in result.iterrows():
        # Audit
        warnings = [r['warning'] for r in DEFAULT_AUDIT_RULES if check_audit_rule(row, r)]
        audit_results.append("; ".join(warnings) if warnings else "Clean")
        
        # Top Up
        matches = [r for r in TOP_UP_RULES if check_top_up(row, r)]
        topup_results.append("; ".join([r['item'] for r in matches]) if matches else "-")
        topup_values.append(sum([r.get('tarif', 0) for r in matches]))
        
        # Discrepancy (TXT vs Syamval)
        txt_codes = normalize_list(str(row['DIAGLIST_TXT']) + ";" + str(row['PROCLIST_TXT']))
        syamval_codes = normalize_list(row['CODING_ICD_SYAMVAL'])
        discrepancy_flags.append(txt_codes != syamval_codes)

    result['AUDIT_WARNINGS'] = audit_results
    result['POTENSI_TOPUP'] = topup_results
    result['POTENSI_NILAI'] = topup_values
    result['IS_DISCREPANT'] = discrepancy_flags

    # 5.5. Calculate Coder Performance
    print("Menghitung Performa Coder...")
    result['DISPLAY_CODER'] = result['NAMA_CODER'].fillna(result['CODER_ID']).fillna('Unknown')
    
    perf = result.groupby('DISPLAY_CODER').agg(
        Total_Kasus=('SEP', 'count'),
        Audit_Bersih=('AUDIT_WARNINGS', lambda x: (x == 'Clean').sum()),
        Temuan_Audit=('AUDIT_WARNINGS', lambda x: (x != 'Clean').sum()),
        Potensi_Topup_Kasus=('POTENSI_TOPUP', lambda x: (x != '-').sum()),
        Total_Nilai_Topup=('POTENSI_NILAI', 'sum'),
        Perbedaan_Kode=('IS_DISCREPANT', 'sum')
    ).reset_index().rename(columns={'DISPLAY_CODER': 'Nama Coder'})
    
    perf['Akurasi_%'] = (perf['Audit_Bersih'] / perf['Total_Kasus'] * 100).round(2)
    perf = perf[['Nama Coder', 'Total_Kasus', 'Audit_Bersih', 'Temuan_Audit', 'Potensi_Topup_Kasus', 'Total_Nilai_Topup', 'Perbedaan_Kode', 'Akurasi_%']]

    # 6. Final Formatting
    final_cols = [
        'SEP', 'NAMA_PASIEN', 'MRN', 'CODER_ID', 'NAMA_CODER', 
        'TGL_MASUK', 'TGL_PULANG', 'INACBG', 'DESKRIPSI_INACBG', 
        'TARIF_RS_TXT', 'TARIF_INACBG_TXT', 
        'IDRG_DRG_CODE', 'IDRG_DRG_DESCRIPTION', 'IDRG_TOTAL_TARIF',
        'STATUS_PENDING', 'KETERANGAN_PENDING', 'JAWABAN', 'TINDAK_LANJUT',
        'AUDIT_WARNINGS', 'POTENSI_TOPUP', 'POTENSI_NILAI',
        'SD', 'SR', 'SI', 'SP',
        'DIAGLIST_TXT', 'PROCLIST_TXT', 'IDRG_DIAG_LISTS', 'IDRG_PROC_LISTS', 'CODING_ICD_SYAMVAL'
    ]
    result = result[final_cols + ['IS_DISCREPANT', 'DISPLAY_CODER']]

    # 7. Save to Excel with Multiple Sheets & Styling (Optimized with xlsxwriter)
    output_file = "Kertas_Kerja_Audit_Coding_Merged.xlsx"
    print(f"Menyimpan hasil ke: {output_file}...")
    
    df_audit_findings = result[result['AUDIT_WARNINGS'] != "Clean"]
    df_topup_findings = result[result['POTENSI_TOPUP'] != "-"]
    df_discrepancy = result[result['IS_DISCREPANT'] == True]
    df_pending_cases = result[result['STATUS_PENDING'] != "Layak Klaim"]
    
    try:
        with pd.ExcelWriter(output_file, engine='xlsxwriter') as writer:
            # ... (existing saving logic) ...
            # Prepare dataframes without the internal columns
            drop_cols = ['IS_DISCREPANT', 'DISPLAY_CODER']
            main_df = result.drop(columns=drop_cols)
            
            # 1. Performa Coder
            perf.to_excel(writer, sheet_name='Performa Coder', index=False)
            
            # 2. Penyelesaian Pending
            df_pending_cases.drop(columns=drop_cols).to_excel(writer, sheet_name='Penyelesaian Pending', index=False)
            
            # 3. Temuan Audit Coding
            df_audit_findings.drop(columns=drop_cols).to_excel(writer, sheet_name='Temuan Audit Coding', index=False)
            
            # 4. Potensi Top Up
            df_topup_findings.drop(columns=drop_cols).to_excel(writer, sheet_name='Potensi Top Up', index=False)
            
            # 5. Perbedaan Kode
            df_discrepancy.drop(columns=drop_cols).to_excel(writer, sheet_name='Perbedaan Kode', index=False)
            
            # 6. Semua Data
            main_df.to_excel(writer, sheet_name='Semua Data', index=False)
            
            workbook = writer.book
            sheet = writer.sheets['Semua Data']
            bold_fmt = workbook.add_format({'bold': True})
            
            num_rows = len(result)
            num_cols = len(main_df.columns)
            
            # Write discrepancy flag to a column far to the right (hidden)
            for i, val in enumerate(result['IS_DISCREPANT']):
                sheet.write(i + 1, num_cols, 1 if val else 0)
            
            sheet.set_column(num_cols, num_cols, None, None, {'hidden': True})
            
            from xlsxwriter.utility import xl_col_to_name
            flag_col_letter = xl_col_to_name(num_cols)
            
            # Apply conditional formatting
            sheet.conditional_format(1, 0, num_rows, num_cols - 1, {
                'type':     'formula',
                'criteria': f'=${flag_col_letter}2=1',
                'format':   bold_fmt
            })
                        
        print("--- Selesai Menyiapkan Excel ---")
    except PermissionError:
        print(f"Peringatan: Tidak dapat menyimpan {output_file} karena file sedang dibuka. Dashboard akan tetap menampilkan hasil terbaru.")
    except Exception as e:
        print(f"Gagal menyimpan Excel: {e}")
        import traceback
        traceback.print_exc()

    if return_data:
        # Define drop_cols again in case Excel block failed
        drop_cols = ['IS_DISCREPANT', 'DISPLAY_CODER']
        
        # Fill NaNs to avoid JSON conversion errors
        def sanitize_df(df, drops):
            return df.drop(columns=drops).fillna('-').replace({pd.NA: '-', np.nan: '-'})

        return {
            "summary": {
                "total_cases": int(len(result)),
                "audit_findings": int(len(df_audit_findings)),
                "topup_findings": int(len(df_topup_findings)),
                "discrepancies": int(len(df_discrepancy)),
                "pending_cases": int(len(df_pending_cases)),
                "total_topup_value": float(result['POTENSI_NILAI'].fillna(0).sum())
            },
            "perf": perf.fillna(0).to_dict(orient='records'),
            "audit": sanitize_df(df_audit_findings, drop_cols).to_dict(orient='records'),
            "topup": sanitize_df(df_topup_findings, drop_cols).to_dict(orient='records'),
            "discrepancy": sanitize_df(df_discrepancy, drop_cols).to_dict(orient='records'),
            "pending": sanitize_df(df_pending_cases, drop_cols).to_dict(orient='records'),
            "all": sanitize_df(result.head(100), drop_cols).to_dict(orient='records')
        }

if __name__ == "__main__":
    process_audit_coding()
