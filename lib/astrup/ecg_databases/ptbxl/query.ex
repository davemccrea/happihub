defmodule Astrup.EcgDatabases.Ptbxl.Query do
  alias Astrup.Wfdb

  def get_record_data(record) do
    Wfdb.read("ptbxl", record.filename_lr)
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
  Get the primary diagnosis for a record based on highest confidence SCP code.
  """
  def get_primary_diagnosis(record) do
    case record.scp_codes do
      codes when map_size(codes) == 0 ->
        "OTHER"

      codes ->
        # TODO: what if there are two diagnoses with 100 confidence?
        {primary_code, _confidence} =
          Enum.max_by(codes, fn {_code, confidence} -> confidence end) |> dbg()

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

  defp has_scp_code(record, scp_code) do
    Map.has_key?(record.scp_codes, scp_code)
  end
end
