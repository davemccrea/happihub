defmodule Astrup.Datasets.PTBXL.Selector do
  @doc """
  Selects ECGs by diagnosis category (NORM, MI, STTC, CD, HYP, OTHER).
  """
  def select_by_diagnosis(records, max_diagnosis_counts) when is_map(max_diagnosis_counts) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_diagnosis/1)
    |> select_from_each_diagnosis(max_diagnosis_counts)
  end

  @doc """
  Selects ECGs by individual SCP codes (NORM, LVH, AMI, 3AVB, etc.).
  """
  def select_by_scp_code(records, max_scp_counts) when is_map(max_scp_counts) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_scp_code/1)
    |> select_from_each_scp_code(max_scp_counts)
  end

  @doc """
  Selects ECGs by diagnostic class (MI, HYP, CD, STTC, NORM).
  """
  def select_by_diagnostic_class(records, max_class_counts) when is_map(max_class_counts) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_diagnostic_class/1)
    |> select_from_each_diagnostic_class(max_class_counts)
  end

  @doc """
  Selects ECGs by rhythm codes (SR, SARRH, PSVT, AFIB, AFLT, etc.).
  """
  def select_by_rhythm_code(records, max_rhythm_counts) when is_map(max_rhythm_counts) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_rhythm/1)
    |> select_from_each_rhythm(max_rhythm_counts)
  end

  @doc """
  Selects ECGs by form codes (ABQRS, PVC, STD_, VCLVH, QWAVE, etc.).
  """
  def select_by_form_code(records, max_form_counts) when is_map(max_form_counts) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_form/1)
    |> select_from_each_form(max_form_counts)
  end

  @doc """
  Get ECGs by specific SCP code.
  """
  def get_by_scp_code(records, scp_code, count \\ 1) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.filter(&has_scp_code(&1, scp_code))
    |> Enum.shuffle()
    |> Enum.take(count)
  end

  @doc """
  Get ECGs by specific rhythm code.
  """
  def get_by_rhythm_code(records, rhythm_code, count \\ 1) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.filter(&has_scp_code(&1, rhythm_code))
    |> Enum.shuffle()
    |> Enum.take(count)
  end

  @doc """
  Get ECGs by specific form code.
  """
  def get_by_form_code(records, form_code, count \\ 1) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.filter(&has_scp_code(&1, form_code))
    |> Enum.shuffle()
    |> Enum.take(count)
  end

  @doc """
  Get available diagnosis categories and their counts from high-quality records.
  """
  def get_available_diagnoses(records) do
    records
    |> filter_high_quality()
    |> filter_signal_quality()
    |> Enum.group_by(&get_primary_diagnosis/1)
    |> Enum.map(fn {diagnosis, records} -> {diagnosis, length(records)} end)
    |> Enum.sort_by(fn {_diagnosis, count} -> count end, :desc)
  end

  @doc """
  Get all unique SCP codes with their frequencies.
  Filter levels: :all_records, :high_quality, :clean_signal
  """
  def get_all_scp_codes(records, filter_level \\ :all_records) do
    filtered_records =
      case filter_level do
        :all_records -> records
        :high_quality -> records |> filter_high_quality()
        :clean_signal -> records |> filter_high_quality() |> filter_signal_quality()
      end

    filtered_records
    |> Enum.flat_map(fn record ->
      Map.keys(record.scp_codes)
    end)
    |> Enum.frequencies()
    |> Enum.sort_by(fn {_code, count} -> count end, :desc)
  end

  @doc """
  Get detailed SCP code statistics with confidence values.
  """
  def get_scp_code_details(records, filter_level \\ :all_records) do
    filtered_records =
      case filter_level do
        :all_records -> records
        :high_quality -> records |> filter_high_quality()
        :clean_signal -> records |> filter_high_quality() |> filter_signal_quality()
      end

    filtered_records
    |> Enum.flat_map(fn record ->
      Enum.map(record.scp_codes, fn {code, confidence} ->
        %{
          code: code,
          confidence: confidence,
          ecg_id: record.ecg_id
        }
      end)
    end)
    |> Enum.group_by(& &1.code)
    |> Enum.map(fn {code, entries} ->
      confidences = Enum.map(entries, & &1.confidence)

      %{
        code: code,
        count: length(entries),
        avg_confidence: Enum.sum(confidences) / length(confidences),
        min_confidence: Enum.min(confidences),
        max_confidence: Enum.max(confidences)
      }
    end)
    |> Enum.sort_by(& &1.count, :desc)
  end

  @doc """
  Get summary statistics for selected ECGs including count, diagnosis distribution, age/sex stats.
  """
  def get_selection_summary(selected_ecgs) do
    total_count = length(selected_ecgs)

    diagnosis_counts =
      selected_ecgs
      |> Enum.group_by(&get_primary_diagnosis/1)
      |> Enum.map(fn {diagnosis, records} -> {diagnosis, length(records)} end)
      |> Enum.into(%{})

    age_stats =
      selected_ecgs
      |> Enum.map(& &1.age)
      |> Enum.filter(&(&1 != nil))
      |> case do
        [] ->
          %{mean: nil, min: nil, max: nil}

        ages ->
          %{
            mean: Enum.sum(ages) / length(ages),
            min: Enum.min(ages),
            max: Enum.max(ages)
          }
      end

    sex_distribution =
      selected_ecgs
      |> Enum.group_by(& &1.sex)
      |> Enum.map(fn {sex, records} ->
        sex_label =
          case sex do
            0 -> "Female"
            1 -> "Male"
            _ -> "Unknown"
          end

        {sex_label, length(records)}
      end)
      |> Enum.into(%{})

    %{
      total_count: total_count,
      diagnosis_distribution: diagnosis_counts,
      age_statistics: age_stats,
      sex_distribution: sex_distribution
    }
  end

  @doc """
  Get the primary diagnosis for a record based on highest confidence SCP code.
  """
  def get_primary_diagnosis(record) do
    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        "OTHER"

      codes ->
        {primary_code, _confidence} = Enum.max_by(codes, fn {_code, confidence} -> confidence end)

        case primary_code do
          "NORM" ->
            "NORM"

          code
          when code in [
                 "AMI",
                 "IMI",
                 "ALMI",
                 "ASMI",
                 "ILMI",
                 "INJAL",
                 "INJAS",
                 "INJIL",
                 "INJIN",
                 "INJLA",
                 "IPLMI",
                 "IPMI",
                 "LMI",
                 "PMI"
               ] ->
            "MI"

          code
          when code in [
                 "NST_",
                 "NDT",
                 "DIG",
                 "LNGQT",
                 "ANEUR",
                 "EL",
                 "ISC_",
                 "ISCAL",
                 "ISCAS",
                 "ISCIL",
                 "ISCIN",
                 "ISCLA",
                 "ISCAN"
               ] ->
            "STTC"

          code
          when code in [
                 "1AVB",
                 "2AVB",
                 "3AVB",
                 "IRBBB",
                 "CLBBB",
                 "CRBBB",
                 "ILBBB",
                 "IVCD",
                 "LAFB",
                 "LPFB",
                 "WPW"
               ] ->
            "CD"

          code when code in ["LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP"] ->
            "HYP"

          _ ->
            "OTHER"
        end
    end
  end

  defp filter_high_quality(records) do
    records
    |> Enum.filter(fn record ->
      (record.strat_fold == 9 or record.strat_fold == 10) and
        record.validated_by_human == true
    end)
  end

  defp filter_signal_quality(records) do
    records
    |> Enum.filter(fn record ->
      (record.electrodes_problems == "" or record.electrodes_problems == nil) and
        (record.baseline_drift == "" or record.baseline_drift == nil) and
        (record.pacemaker == "" or record.pacemaker == nil)
    end)
  end

  defp select_from_each_diagnosis(grouped_records, max_diagnosis_counts) do
    max_diagnosis_counts
    |> Enum.flat_map(fn {diagnosis, max_count} ->
      case Map.get(grouped_records, diagnosis, []) do
        [] ->
          []

        records ->
          records
          |> Enum.shuffle()
          |> Enum.take(max_count)
      end
    end)
  end

  defp get_primary_scp_code(record) do
    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        nil

      codes ->
        {primary_code, _confidence} = Enum.max_by(codes, fn {_code, confidence} -> confidence end)
        primary_code
    end
  end

  defp select_from_each_scp_code(grouped_records, max_scp_counts) do
    max_scp_counts
    |> Enum.flat_map(fn {scp_code, max_count} ->
      case Map.get(grouped_records, scp_code, []) do
        [] ->
          []

        records ->
          records
          |> Enum.shuffle()
          |> Enum.take(max_count)
      end
    end)
  end

  defp get_primary_diagnostic_class(record) do
    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        nil

      codes ->
        {primary_code, _confidence} = Enum.max_by(codes, fn {_code, confidence} -> confidence end)
        scp_code_to_diagnostic_class(primary_code)
    end
  end

  defp select_from_each_diagnostic_class(grouped_records, max_class_counts) do
    max_class_counts
    |> Enum.flat_map(fn {diagnostic_class, max_count} ->
      case Map.get(grouped_records, diagnostic_class, []) do
        [] ->
          []

        records ->
          records
          |> Enum.shuffle()
          |> Enum.take(max_count)
      end
    end)
  end

  defp get_primary_rhythm(record) do
    rhythm_codes = [
      "SR",
      "SARRH",
      "SVARR",
      "BIGU",
      "TRIGU",
      "PVC",
      "PAC",
      "PRC(S)",
      "AFIB",
      "AFLT",
      "STACH",
      "SBRAD",
      "PSVT",
      "SVTAC"
    ]

    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        nil

      codes ->
        rhythm_entries =
          Enum.filter(codes, fn {code, _confidence} ->
            code in rhythm_codes
          end)

        case rhythm_entries do
          [] ->
            nil

          entries ->
            {primary_rhythm, _confidence} =
              Enum.max_by(entries, fn {_code, confidence} -> confidence end)

            primary_rhythm
        end
    end
  end

  defp select_from_each_rhythm(grouped_records, max_rhythm_counts) do
    max_rhythm_counts
    |> Enum.flat_map(fn {rhythm, max_count} ->
      case Map.get(grouped_records, rhythm, []) do
        [] ->
          []

        records ->
          records
          |> Enum.shuffle()
          |> Enum.take(max_count)
      end
    end)
  end

  defp scp_code_to_diagnostic_class(code) do
    case code do
      "NORM" ->
        "NORM"

      code
      when code in [
             "AMI",
             "IMI",
             "ALMI",
             "ASMI",
             "ILMI",
             "INJAL",
             "INJAS",
             "INJIL",
             "INJIN",
             "INJLA",
             "IPLMI",
             "IPMI",
             "LMI",
             "PMI"
           ] ->
        "MI"

      code
      when code in [
             "NST_",
             "NDT",
             "DIG",
             "LNGQT",
             "ANEUR",
             "EL",
             "ISC_",
             "ISCAL",
             "ISCAS",
             "ISCIL",
             "ISCIN",
             "ISCLA",
             "ISCAN"
           ] ->
        "STTC"

      code
      when code in [
             "1AVB",
             "2AVB",
             "3AVB",
             "IRBBB",
             "CLBBB",
             "CRBBB",
             "ILBBB",
             "IVCD",
             "LAFB",
             "LPFB",
             "WPW"
           ] ->
        "CD"

      code when code in ["LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP"] ->
        "HYP"

      _ ->
        "OTHER"
    end
  end

  defp get_primary_form(record) do
    form_codes = [
      "ABQRS",
      "PVC",
      "STD_",
      "VCLVH",
      "QWAVE",
      "LOWT",
      "NT_",
      "PAC",
      "LPR",
      "INVT",
      "LVOLT",
      "HVOLT",
      "TAB_",
      "STE_",
      "PRC(S)"
    ]

    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        nil

      codes ->
        form_entries =
          Enum.filter(codes, fn {code, _confidence} ->
            code in form_codes
          end)

        case form_entries do
          [] ->
            nil

          entries ->
            {primary_form, _confidence} =
              Enum.max_by(entries, fn {_code, confidence} -> confidence end)

            primary_form
        end
    end
  end

  defp select_from_each_form(grouped_records, max_form_counts) do
    max_form_counts
    |> Enum.flat_map(fn {form, max_count} ->
      case Map.get(grouped_records, form, []) do
        [] ->
          []

        records ->
          records
          |> Enum.shuffle()
          |> Enum.take(max_count)
      end
    end)
  end

  defp has_scp_code(record, scp_code) do
    Map.has_key?(record.scp_codes, scp_code)
  end
end
