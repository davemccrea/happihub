defmodule Astrup.EcgDatabases.Ptbxl.QueryTest do
  use ExUnit.Case, async: true

  alias Astrup.EcgDatabases.Ptbxl.Query

  describe "get_primary_diagnosis/1" do
    test "returns NORM for normal ECG" do
      record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{"NORM" => 100.0}})
      assert Query.get_primary_diagnosis(record) == "NORM"
    end

    test "returns MI for myocardial infarction codes" do
      mi_codes = [
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
      ]

      Enum.each(mi_codes, fn code ->
        record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{code => 90.0}})
        assert Query.get_primary_diagnosis(record) == "MI"
      end)
    end

    test "returns STTC for ST-T change codes" do
      sttc_codes = [
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
      ]

      Enum.each(sttc_codes, fn code ->
        record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{code => 80.0}})
        assert Query.get_primary_diagnosis(record) == "STTC"
      end)
    end

    test "returns CD for conduction disturbance codes" do
      cd_codes = [
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
      ]

      Enum.each(cd_codes, fn code ->
        record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{code => 85.0}})
        assert Query.get_primary_diagnosis(record) == "CD"
      end)
    end

    test "returns HYP for hypertrophy codes" do
      hyp_codes = ["LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP"]

      Enum.each(hyp_codes, fn code ->
        record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{code => 75.0}})
        assert Query.get_primary_diagnosis(record) == "HYP"
      end)
    end

    test "returns OTHER for rhythm and morphology codes" do
      other_codes = [
        "SR",
        "AFIB",
        "STACH",
        "SBRAD",
        "PVC",
        "PAC",
        "ABQRS",
        "LVOLT",
        "HVOLT",
        "QWAVE"
      ]

      Enum.each(other_codes, fn code ->
        record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{code => 70.0}})
        assert Query.get_primary_diagnosis(record) == "OTHER"
      end)
    end

    test "returns OTHER for empty SCP codes" do
      record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{}})
      assert Query.get_primary_diagnosis(record) == "OTHER"
    end

    test "uses highest confidence code for diagnosis" do
      record =
        PtbxlTestHelper.sample_ecg_record(%{
          scp_codes: %{"NORM" => 30.0, "AMI" => 90.0, "SR" => 50.0}
        })

      # Should return MI because AMI has highest confidence
      assert Query.get_primary_diagnosis(record) == "MI"
    end

    test "returns OTHER for unknown codes" do
      record = PtbxlTestHelper.sample_ecg_record(%{scp_codes: %{"UNKNOWN_CODE" => 100.0}})
      assert Query.get_primary_diagnosis(record) == "OTHER"
    end
  end

  describe "get_available_diagnoses/1" do
    test "returns diagnosis counts for high-quality records" do
      records = PtbxlTestHelper.sample_ecg_records()

      diagnoses = Query.get_available_diagnoses(records)

      # Should only include high-quality records (strat_fold 9-10, validated_by_human=true, clean signal)
      assert length(diagnoses) == 4

      # Check that results are sorted by count (descending)
      counts = Enum.map(diagnoses, fn {_diagnosis, count} -> count end)
      assert counts == Enum.sort(counts, :desc)

      # Verify specific diagnoses
      diagnosis_map = Enum.into(diagnoses, %{})
      assert diagnosis_map["NORM"] == 1
      assert diagnosis_map["MI"] == 1
      assert diagnosis_map["CD"] == 1
      assert diagnosis_map["STTC"] == 1
    end

    test "filters out low-quality records" do
      records = PtbxlTestHelper.sample_ecg_records()

      # The sample includes one low-quality record (ID 5) which should be filtered out
      diagnoses = Query.get_available_diagnoses(records)

      # Should not include the low-quality NORM record
      total_count = Enum.reduce(diagnoses, 0, fn {_diagnosis, count}, acc -> acc + count end)
      # Only high-quality records
      assert total_count == 4
    end
  end

  describe "get_all_scp_codes/2" do
    test "returns all SCP codes with frequencies" do
      records = PtbxlTestHelper.sample_ecg_records()

      codes = Query.get_all_scp_codes(records, :all_records)

      # Should include all codes from all records
      assert length(codes) > 0

      # Check format: list of {code, count} tuples
      assert Enum.all?(codes, fn {code, count} ->
               is_binary(code) and is_integer(count) and count > 0
             end)

      # Should be sorted by count (descending)
      counts = Enum.map(codes, fn {_code, count} -> count end)
      assert counts == Enum.sort(counts, :desc)
    end

    test "filters by quality level" do
      records = PtbxlTestHelper.sample_ecg_records()

      all_codes = Query.get_all_scp_codes(records, :all_records)
      high_quality_codes = Query.get_all_scp_codes(records, :high_quality)
      clean_signal_codes = Query.get_all_scp_codes(records, :clean_signal)

      # Should have fewer codes as we apply stricter filtering
      assert length(clean_signal_codes) <= length(high_quality_codes)
      assert length(high_quality_codes) <= length(all_codes)
    end
  end

  describe "get_scp_code_details/2" do
    test "returns detailed statistics for SCP codes" do
      records = PtbxlTestHelper.sample_ecg_records()

      details = Query.get_scp_code_details(records, :clean_signal)

      assert length(details) > 0

      # Check format
      Enum.each(details, fn detail ->
        assert Map.has_key?(detail, :code)
        assert Map.has_key?(detail, :count)
        assert Map.has_key?(detail, :avg_confidence)
        assert Map.has_key?(detail, :min_confidence)
        assert Map.has_key?(detail, :max_confidence)

        assert is_binary(detail.code)
        assert is_integer(detail.count)
        assert is_float(detail.avg_confidence)
        assert is_float(detail.min_confidence)
        assert is_float(detail.max_confidence)
      end)

      # Should be sorted by count (descending)
      counts = Enum.map(details, & &1.count)
      assert counts == Enum.sort(counts, :desc)
    end

    test "calculates statistics correctly" do
      # Create a record with specific SCP codes for testing
      record =
        PtbxlTestHelper.sample_ecg_record(%{
          scp_codes: %{"NORM" => 100.0, "SR" => 50.0},
          strat_fold: 9,
          validated_by_human: true,
          electrodes_problems: nil,
          baseline_drift: nil,
          pacemaker: nil
        })

      details = Query.get_scp_code_details([record], :clean_signal)

      # Find NORM code details
      norm_details = Enum.find(details, &(&1.code == "NORM"))
      assert norm_details.count == 1
      assert norm_details.avg_confidence == 100.0
      assert norm_details.min_confidence == 100.0
      assert norm_details.max_confidence == 100.0

      # Find SR code details
      sr_details = Enum.find(details, &(&1.code == "SR"))
      assert sr_details.count == 1
      assert sr_details.avg_confidence == 50.0
      assert sr_details.min_confidence == 50.0
      assert sr_details.max_confidence == 50.0
    end
  end

  describe "single selection functions" do
    test "get_by_scp_code/3 gets specific count of records by SCP code" do
      records = PtbxlTestHelper.sample_ecg_records()

      selected = Query.get_by_scp_code(records, "NORM", 1)

      assert length(selected) <= 1

      if length(selected) == 1 do
        record = List.first(selected)
        assert Map.has_key?(record.scp_codes, "NORM")
      end
    end

    test "returns empty list for non-existent codes" do
      records = PtbxlTestHelper.sample_ecg_records()

      assert Query.get_by_scp_code(records, "NON_EXISTENT", 5) == []
    end
  end
end
