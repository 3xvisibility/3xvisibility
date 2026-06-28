CREATE OR REPLACE FUNCTION public.get_campaign_csv_window(
  _campaign_id uuid,
  _start_row integer DEFAULT 0,
  _row_count integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file record;
  v_raw text;
  v_headers text[] := ARRAY[]::text[];
  v_rows jsonb := '[]'::jsonb;
  v_record text := '';
  v_records_seen integer := 0;
  v_data_index integer := 0;
  v_in_quotes boolean := false;
  v_char text;
  v_next text;
  v_len integer;
  v_i integer := 1;
  v_delimiter text := ',';
  v_values text[];
  v_obj jsonb;
  v_h integer;
  v_start integer := greatest(coalesce(_start_row, 0), 0);
  v_take integer := greatest(coalesce(_row_count, 25), 0);
BEGIN
  IF _campaign_id IS NULL THEN
    RAISE EXCEPTION 'campaign_id is required';
  END IF;

  SELECT raw_content, headers, row_count, workspace_id
    INTO v_file
  FROM public.campaign_csv_files
  WHERE campaign_id = _campaign_id
  LIMIT 1;

  IF NOT FOUND OR v_file.raw_content IS NULL THEN
    RETURN jsonb_build_object('headers', '[]'::jsonb, 'rows', '[]'::jsonb, 'row_count', 0);
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_workspace_member(auth.uid(), v_file.workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_raw := v_file.raw_content;
  v_len := length(v_raw);

  WHILE v_i <= v_len LOOP
    v_char := substr(v_raw, v_i, 1);
    v_next := CASE WHEN v_i < v_len THEN substr(v_raw, v_i + 1, 1) ELSE '' END;

    IF v_char = '"' THEN
      v_record := v_record || v_char;
      IF v_in_quotes AND v_next = '"' THEN
        v_record := v_record || v_next;
        v_i := v_i + 2;
        CONTINUE;
      ELSE
        v_in_quotes := NOT v_in_quotes;
        v_i := v_i + 1;
        CONTINUE;
      END IF;
    END IF;

    IF (v_char = E'\n' OR v_char = E'\r') AND NOT v_in_quotes THEN
      IF btrim(v_record) <> '' THEN
        IF v_records_seen = 0 THEN
          IF position(E'\t' in v_record) > 0 THEN
            v_delimiter := E'\t';
          ELSIF array_length(regexp_split_to_array(v_record, ';'), 1) > array_length(regexp_split_to_array(v_record, ','), 1) THEN
            v_delimiter := ';';
          ELSIF array_length(regexp_split_to_array(v_record, '\|'), 1) > array_length(regexp_split_to_array(v_record, ','), 1) THEN
            v_delimiter := '|';
          ELSE
            v_delimiter := ',';
          END IF;
          SELECT array_agg(trim(both '"' from replace(x, '""', '"'))) INTO v_headers
          FROM unnest(regexp_split_to_array(v_record, v_delimiter)) AS x;
        ELSE
          IF v_data_index >= v_start AND jsonb_array_length(v_rows) < v_take THEN
            SELECT array_agg(trim(both '"' from replace(x, '""', '"'))) INTO v_values
            FROM unnest(regexp_split_to_array(v_record, v_delimiter)) AS x;
            v_obj := '{}'::jsonb;
            FOR v_h IN 1..coalesce(array_length(v_headers, 1), 0) LOOP
              v_obj := v_obj || jsonb_build_object(v_headers[v_h], coalesce(v_values[v_h], ''));
            END LOOP;
            v_rows := v_rows || jsonb_build_array(v_obj);
          END IF;
          v_data_index := v_data_index + 1;
          IF jsonb_array_length(v_rows) >= v_take AND v_data_index >= v_start + v_take THEN
            EXIT;
          END IF;
        END IF;
        v_records_seen := v_records_seen + 1;
      END IF;
      v_record := '';
      IF v_char = E'\r' AND v_next = E'\n' THEN
        v_i := v_i + 2;
      ELSE
        v_i := v_i + 1;
      END IF;
      CONTINUE;
    END IF;

    v_record := v_record || v_char;
    v_i := v_i + 1;
  END LOOP;

  IF btrim(v_record) <> '' AND (v_take = 0 OR jsonb_array_length(v_rows) < v_take) THEN
    IF v_records_seen = 0 THEN
      SELECT array_agg(trim(both '"' from replace(x, '""', '"'))) INTO v_headers
      FROM unnest(regexp_split_to_array(v_record, v_delimiter)) AS x;
    ELSE
      IF v_data_index >= v_start THEN
        SELECT array_agg(trim(both '"' from replace(x, '""', '"'))) INTO v_values
        FROM unnest(regexp_split_to_array(v_record, v_delimiter)) AS x;
        v_obj := '{}'::jsonb;
        FOR v_h IN 1..coalesce(array_length(v_headers, 1), 0) LOOP
          v_obj := v_obj || jsonb_build_object(v_headers[v_h], coalesce(v_values[v_h], ''));
        END LOOP;
        v_rows := v_rows || jsonb_build_array(v_obj);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'headers', to_jsonb(coalesce(v_headers, ARRAY[]::text[])),
    'rows', v_rows,
    'row_count', coalesce(v_file.row_count, v_data_index)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_csv_window(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_csv_window(uuid, integer, integer) TO service_role;