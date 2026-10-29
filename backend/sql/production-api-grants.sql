BEGIN;

DO $$
DECLARE
  role_can_login boolean;
  role_is_superuser boolean;
  role_inherits boolean;
BEGIN
  IF current_database() <> 'mtc' THEN
    RAISE EXCEPTION 'This script is restricted to mtc';
  END IF;

  SELECT rolcanlogin, rolsuper, rolinherit
    INTO role_can_login, role_is_superuser, role_inherits
    FROM pg_roles
    WHERE rolname = 'mtc_api_runtime';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Required API role mtc_api_runtime does not exist';
  END IF;
  IF NOT role_can_login THEN
    RAISE EXCEPTION 'mtc_api_runtime must be a LOGIN role';
  END IF;
  IF role_is_superuser THEN
    RAISE EXCEPTION 'mtc_api_runtime must not be a superuser';
  END IF;
  IF role_inherits THEN
    RAISE EXCEPTION 'mtc_api_runtime must be created with NOINHERIT';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_auth_members
      WHERE member = 'mtc_api_runtime'::regrole::oid
  ) THEN
    RAISE EXCEPTION 'mtc_api_runtime must not be a member of another role';
  END IF;
END;
$$;

GRANT CONNECT ON DATABASE mtc TO mtc_api_runtime;

GRANT USAGE ON SCHEMA public TO mtc_api_runtime;
GRANT USAGE ON SCHEMA extensions TO mtc_api_runtime;

GRANT INSERT (id, full_name, divisi, jabatan)
  ON TABLE public.profiles TO mtc_api_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.app_email_verification_tokens TO mtc_api_runtime;
GRANT SELECT, INSERT (token_hash, profile_id, expires_at), UPDATE (consumed_at), DELETE
  ON TABLE public.app_setup_tokens TO mtc_api_runtime;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.app_sessions TO mtc_api_runtime;
GRANT SELECT ON TABLE public.app_users TO mtc_api_runtime;
GRANT INSERT (profile_id, email, password_hash)
  ON TABLE public.app_users TO mtc_api_runtime;
GRANT UPDATE (password_hash, email_verified_at)
  ON TABLE public.app_users TO mtc_api_runtime;

GRANT SELECT ON TABLE
  public.profiles,
  public.chslr_items,
  public.chslr_log,
  public.chslr_mesin,
  public.chslr_result,
  public.clhmi,
  public.clhmi_machine,
  public.clhmi_items,
  public.clhmi_results,
  public.clpm_items,
  public.clpm_log,
  public.clpm_result,
  public.jpdo_approval,
  public.jpdo_approval_manager,
  public.jpdo_approval_ppc,
  public.jpdo_approval_produksi,
  public.jpdo_log,
  public.jpdo_result,
  public.kartu_riwayat_items,
  public."Lkmr_result",
  public.lkmr_repair,
  public.pmi_header,
  public.pmi_item_fields,
  public.pmi_items,
  public.pmi_machines,
  public.pmi_results,
  public.pmw_log,
  public.pmw_reports,
  public.pohm_items,
  public.pohm_log,
  public.pohm_machine,
  public.ppw_log,
  public.prslb_items,
  public.prslb_log,
  public.prslb_mesin,
  public.prslb_result
TO mtc_api_runtime;

GRANT SELECT, INSERT ON TABLE public.app_signature_files TO mtc_api_runtime;

GRANT INSERT (
  mesin_id, bulan, tahun, pelaksana_names, catatan_pelaksana
) ON TABLE public.chslr_log TO mtc_api_runtime;
GRANT UPDATE (
  pelaksana_names, catatan_pelaksana, koordinator_nama, signature_koordinator,
  status_verifikasi, remark_koordinator, superintendent_nama, remark_superintendent,
  signature_superintendent, status_final
) ON TABLE public.chslr_log TO mtc_api_runtime;
GRANT INSERT (
  log_id, item_id, tanggal, status, input_value, keterangan, signature
) ON TABLE public.chslr_result TO mtc_api_runtime;
GRANT DELETE ON TABLE public.chslr_result TO mtc_api_runtime;

GRANT INSERT (
  machine_id, merk_mesin, serial_no, pelaksana, paraf, status_form, tanggal_isi,
  bulan, tahun, catatan_pelaksana, tonage
) ON TABLE public.clhmi TO mtc_api_runtime;
GRANT UPDATE (
  paraf_coord, status_form, catatan_umum, verified_by, catatan_super, paraf_super
) ON TABLE public.clhmi TO mtc_api_runtime;
GRANT INSERT (
  clhmi_id, item_id, item_kode, status, value, temperature_oli, catatan_item, pelaksana
) ON TABLE public.clhmi_results TO mtc_api_runtime;

GRANT INSERT (
  kode_mold, tanggal_perawatan, produk, material_mold, type_mold, tanggal_akhir_shot,
  pic_perawatan, paraf_operator
) ON TABLE public.clpm_log TO mtc_api_runtime;
GRANT UPDATE (
  nama_spv, catatan_spv, paraf_spv, tanggal_validasi_spv,
  nama_superintendent, catatan_superintendent, paraf_superintendent,
  tanggal_validasi_superintendent
) ON TABLE public.clpm_log TO mtc_api_runtime;
GRANT INSERT (
  log_id, no_item, item_check, standart, kondisi, catatan, catatan_kondisi_mould
) ON TABLE public.clpm_result TO mtc_api_runtime;

GRANT INSERT (
  tanggal, status_hari, nama_supervisor, nama_mesin, nama_pic, tanda_tangan
) ON TABLE public.jpdo_log TO mtc_api_runtime;
GRANT INSERT (log_id, plan_status, actual_status)
  ON TABLE public.jpdo_result TO mtc_api_runtime;
GRANT INSERT (
  bulan, nama_superintendent, catatan_superintendent, tanda_tangan_superintendent
) ON TABLE public.jpdo_approval TO mtc_api_runtime;
GRANT INSERT (
  bulan, nama_manager, catatan_manager, tanda_tangan_manager
) ON TABLE public.jpdo_approval_manager TO mtc_api_runtime;
GRANT INSERT (
  bulan, nama_ppc, catatan_ppc, tanda_tangan_ppc
) ON TABLE public.jpdo_approval_ppc TO mtc_api_runtime;
GRANT INSERT (
  bulan, nama_produksi, catatan_produksi, tanda_tangan_produksi
) ON TABLE public.jpdo_approval_produksi TO mtc_api_runtime;

GRANT INSERT (
  no_mesin, lokasi_mesin, tahun_pembuatan, machine_name, entry_date, problem_desc,
  action_taken, spare_parts, remarks, pic_name, pic_signature
) ON TABLE public.kartu_riwayat_items TO mtc_api_runtime;
GRANT UPDATE (
  spv_name, spv_signature, spv_note,
  superintendent_name, superintendent_signature, superintendent_note
) ON TABLE public.kartu_riwayat_items TO mtc_api_runtime;

GRANT INSERT (
  tanggal, bulan, shift, pic, jenis_problem, deskripsi_masalah, waktu_mulai,
  waktu_selesai, target_waktu_pm, nama_mesin
) ON TABLE public."Lkmr_result" TO mtc_api_runtime;
GRANT UPDATE (feedback, superintendent_name, status)
  ON TABLE public."Lkmr_result" TO mtc_api_runtime;
GRANT INSERT (
  tanggal, shift, pic, nama_mold, code_mold, tipe_mold, jenis_problem,
  deskripsi_masalah, waktu_mulai, waktu_selesai, target_waktu_pm
) ON TABLE public.lkmr_repair TO mtc_api_runtime;
GRANT UPDATE (feedback, superintendent_name, status)
  ON TABLE public.lkmr_repair TO mtc_api_runtime;

GRANT INSERT (
  machine_id, nama_pelaksana, tanggal, tahun, target_selesai, start_jam, finish_jam,
  running_hours, signature_pelaksana, status_verifikasi
) ON TABLE public.pmi_header TO mtc_api_runtime;
GRANT UPDATE (
  nama_koordinator, catatan_koordinator, signature_koordinator, status_verifikasi,
  verified_at, nama_superintendent, signature_superintendent, catatan_superintendent
) ON TABLE public.pmi_header TO mtc_api_runtime;
GRANT INSERT (
  pmi_header_id, pmi_item_id, pmi_item_field_id, status, nilai_aktual, keterangan
) ON TABLE public.pmi_results TO mtc_api_runtime;

GRANT INSERT (tanggal, mesin, pic, ttd_operator)
  ON TABLE public.pmw_log TO mtc_api_runtime;
GRANT UPDATE (spv_name, ttd_spv, supt_name, ttd_supt)
  ON TABLE public.pmw_log TO mtc_api_runtime;
GRANT INSERT (
  catatan, mesin, dept, tanggal, prosedur_preventive, standart, kondisi, action_text
) ON TABLE public.pmw_reports TO mtc_api_runtime;

GRANT INSERT (
  machine_name, work_type, start_time, end_time, problem_desc, action_taken,
  spare_parts, recommendations, engineer_name, engineer_signature
) ON TABLE public.pohm_items TO mtc_api_runtime;
GRANT UPDATE (spv_name, spv_signature, manager_name, manager_signature)
  ON TABLE public.pohm_items TO mtc_api_runtime;
GRANT INSERT (item_id, engineer_status, engineer_note)
  ON TABLE public.pohm_log TO mtc_api_runtime;
GRANT UPDATE (spv_status, spv_note, manager_status, manager_note)
  ON TABLE public.pohm_log TO mtc_api_runtime;

GRANT INSERT (
  nama_operator, status_hasil, qc_check, keterangan, nama_spv, catatan_akhir, ttd_spv,
  bagian, tanggal, nama_part, job_desc, estimasi_waktu
) ON TABLE public.ppw_log TO mtc_api_runtime;
GRANT UPDATE (
  waktu_mulai, waktu_selesai, nama_operator, keterangan, status_hasil,
  nama_superintendent, catatan_superintendent, ttd_superintendent, status_approval
) ON TABLE public.ppw_log TO mtc_api_runtime;

GRANT INSERT (
  mesin_id, pelaksana_nama, signature_pelaksana, start_jam, finish_jam,
  running_hours, target_selesai
) ON TABLE public.prslb_log TO mtc_api_runtime;
GRANT UPDATE (
  koordinator_nama, koordinator_note, status_verifikasi, signature_koordinator,
  superintendent_nama, superintendent_note, status_final, signature_superintendent,
  updated_at
) ON TABLE public.prslb_log TO mtc_api_runtime;
GRANT INSERT (log_id, item_id, status, keterangan)
  ON TABLE public.prslb_result TO mtc_api_runtime;
GRANT UPDATE (status_koordinator, keterangan_koordinator)
  ON TABLE public.prslb_result TO mtc_api_runtime;

DO $$
DECLARE
  table_name text;
  sequence_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'chslr_log', 'chslr_result', 'clhmi', 'clhmi_results',
    'clpm_log', 'clpm_result', 'jpdo_log', 'jpdo_result',
    'jpdo_approval', 'jpdo_approval_manager', 'jpdo_approval_ppc',
    'jpdo_approval_produksi', 'kartu_riwayat_items', 'Lkmr_result',
    'lkmr_repair', 'pmi_header', 'pmi_results', 'pmw_log', 'pmw_reports',
    'pohm_items', 'pohm_log', 'ppw_log', 'prslb_log', 'prslb_result'
  ]
  LOOP
    sequence_name := pg_get_serial_sequence(
      format('%I.%I', 'public', table_name),
      'id'
    );
    IF sequence_name IS NOT NULL THEN
      EXECUTE format(
        'GRANT USAGE, SELECT ON SEQUENCE %s TO %I',
        sequence_name,
        'mtc_api_runtime'
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
