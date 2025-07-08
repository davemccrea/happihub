defmodule Astrup.Datasets.PTBXL.SelectorTest do
  use ExUnit.Case, async: true

  alias Astrup.Datasets.PTBXL.Selector

  describe "get_primary_diagnosis/1" do
    test "returns NORM for normal ECG" do
      record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"NORM" => 100.0}})
      assert Selector.get_primary_diagnosis(record) == "NORM"
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
        record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{code => 90.0}})
        assert Selector.get_primary_diagnosis(record) == "MI"
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
        record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{code => 80.0}})
        assert Selector.get_primary_diagnosis(record) == "STTC"
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
        record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{code => 85.0}})
        assert Selector.get_primary_diagnosis(record) == "CD"
      end)
    end

    test "returns HYP for hypertrophy codes" do
      hyp_codes = ["LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP"]

      Enum.each(hyp_codes, fn code ->
        record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{code => 75.0}})
        assert Selector.get_primary_diagnosis(record) == "HYP"
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
        record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{code => 70.0}})
        assert Selector.get_primary_diagnosis(record) == "OTHER"
      end)
    end

    test "returns OTHER for empty SCP codes" do
      record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{}})
      assert Selector.get_primary_diagnosis(record) == "OTHER"
    end

    test "uses highest confidence code for diagnosis" do
      record =
        PTBXLTestHelper.sample_ecg_record(%{
          scp_codes: %{"NORM" => 30.0, "AMI" => 90.0, "SR" => 50.0}
        })

      # Should return MI because AMI has highest confidence
      assert Selector.get_primary_diagnosis(record) == "MI"
    end

    test "returns OTHER for unknown codes" do
      record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"UNKNOWN_CODE" => 100.0}})
      assert Selector.get_primary_diagnosis(record) == "OTHER"
    end
  end

  describe "get_available_diagnoses/1" do
    test "returns diagnosis counts for high-quality records" do
      records = PTBXLTestHelper.sample_ecg_records()

      diagnoses = Selector.get_available_diagnoses(records)

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
      records = PTBXLTestHelper.sample_ecg_records()

      # The sample includes one low-quality record (ID 5) which should be filtered out
      diagnoses = Selector.get_available_diagnoses(records)

      # Should not include the low-quality NORM record
      total_count = Enum.reduce(diagnoses, 0, fn {_diagnosis, count}, acc -> acc + count end)
      # Only high-quality records
      assert total_count == 4
    end
  end

  describe "select_by_diagnosis/2" do
    test "selects specified number of records per diagnosis" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{
        "NORM" => 1,
        "MI" => 1,
        "CD" => 1,
        "STTC" => 1
      }

      selected = Selector.select_by_diagnosis(records, max_counts)

      assert length(selected) == 4

      # Check that each diagnosis is represented
      diagnoses = Enum.map(selected, &Selector.get_primary_diagnosis/1)
      assert "NORM" in diagnoses
      assert "MI" in diagnoses
      assert "CD" in diagnoses
      assert "STTC" in diagnoses
    end

    test "returns fewer records when not enough available" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{
        # Only 1 available
        "NORM" => 10,
        # Only 1 available
        "MI" => 5,
        # Only 1 available
        "CD" => 2,
        # Only 1 available
        "STTC" => 3
      }

      selected = Selector.select_by_diagnosis(records, max_counts)

      # Should return all available records (4 total)
      assert length(selected) == 4
    end

    test "handles empty diagnosis requests" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.select_by_diagnosis(records, %{})

      assert selected == []
    end

    test "handles non-existent diagnosis" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.select_by_diagnosis(records, %{"NON_EXISTENT" => 10})

      assert selected == []
    end
  end

  describe "get_all_scp_codes/2" do
    test "returns all SCP codes with frequencies" do
      records = PTBXLTestHelper.sample_ecg_records()

      codes = Selector.get_all_scp_codes(records, :all_records)

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
      records = PTBXLTestHelper.sample_ecg_records()

      all_codes = Selector.get_all_scp_codes(records, :all_records)
      high_quality_codes = Selector.get_all_scp_codes(records, :high_quality)
      clean_signal_codes = Selector.get_all_scp_codes(records, :clean_signal)

      # Should have fewer codes as we apply stricter filtering
      assert length(clean_signal_codes) <= length(high_quality_codes)
      assert length(high_quality_codes) <= length(all_codes)
    end
  end

  describe "get_scp_code_details/2" do
    test "returns detailed statistics for SCP codes" do
      records = PTBXLTestHelper.sample_ecg_records()

      details = Selector.get_scp_code_details(records, :clean_signal)

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
        PTBXLTestHelper.sample_ecg_record(%{
          scp_codes: %{"NORM" => 100.0, "SR" => 50.0},
          strat_fold: 9,
          validated_by_human: true,
          electrodes_problems: nil,
          baseline_drift: nil,
          pacemaker: nil
        })

      details = Selector.get_scp_code_details([record], :clean_signal)

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

  describe "get_selection_summary/1" do
    test "returns comprehensive statistics" do
      records = PTBXLTestHelper.sample_ecg_records()
      selected = Enum.take(records, 3)

      summary = Selector.get_selection_summary(selected)

      # Check structure
      assert Map.has_key?(summary, :total_count)
      assert Map.has_key?(summary, :diagnosis_distribution)
      assert Map.has_key?(summary, :age_statistics)
      assert Map.has_key?(summary, :sex_distribution)

      # Check values
      assert summary.total_count == 3
      assert is_map(summary.diagnosis_distribution)
      assert is_map(summary.age_statistics)
      assert is_map(summary.sex_distribution)
    end

    test "calculates age statistics correctly" do
      records = [
        PTBXLTestHelper.sample_ecg_record(%{age: 30.0}),
        PTBXLTestHelper.sample_ecg_record(%{age: 40.0}),
        PTBXLTestHelper.sample_ecg_record(%{age: 50.0})
      ]

      summary = Selector.get_selection_summary(records)

      assert summary.age_statistics.mean == 40.0
      assert summary.age_statistics.min == 30.0
      assert summary.age_statistics.max == 50.0
    end

    test "handles missing age values" do
      records = [
        PTBXLTestHelper.sample_ecg_record(%{age: nil}),
        PTBXLTestHelper.sample_ecg_record(%{age: nil})
      ]

      summary = Selector.get_selection_summary(records)

      assert summary.age_statistics.mean == nil
      assert summary.age_statistics.min == nil
      assert summary.age_statistics.max == nil
    end

    test "calculates sex distribution correctly" do
      records = [
        # Female
        PTBXLTestHelper.sample_ecg_record(%{sex: 0}),
        # Male
        PTBXLTestHelper.sample_ecg_record(%{sex: 1}),
        # Male
        PTBXLTestHelper.sample_ecg_record(%{sex: 1}),
        # Unknown
        PTBXLTestHelper.sample_ecg_record(%{sex: nil})
      ]

      summary = Selector.get_selection_summary(records)

      assert summary.sex_distribution["Female"] == 1
      assert summary.sex_distribution["Male"] == 2
      assert summary.sex_distribution["Unknown"] == 1
    end

    test "calculates diagnosis distribution correctly" do
      records = [
        PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"NORM" => 100.0}}),
        PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"NORM" => 90.0}}),
        PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"AMI" => 95.0}})
      ]

      summary = Selector.get_selection_summary(records)

      assert summary.diagnosis_distribution["NORM"] == 2
      assert summary.diagnosis_distribution["MI"] == 1
    end
  end

  describe "select_by_scp_code/2" do
    test "selects records by specific SCP codes" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{"NORM" => 1, "AMI" => 1}
      selected = Selector.select_by_scp_code(records, max_counts)

      assert length(selected) == 2

      # Check that selected records have the requested SCP codes
      scp_codes = Enum.flat_map(selected, fn record -> Map.keys(record.scp_codes) end)
      assert "NORM" in scp_codes
      assert "AMI" in scp_codes
    end

    test "handles empty requests" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.select_by_scp_code(records, %{})

      assert selected == []
    end
  end

  describe "new selection functions" do
    test "select_by_diagnostic_class/2 selects records by diagnostic class" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{"NORM" => 1, "MI" => 1}
      selected = Selector.select_by_diagnostic_class(records, max_counts)

      assert length(selected) == 2
    end

    test "select_by_rhythm_code/2 selects records by rhythm codes" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{"SR" => 1}
      selected = Selector.select_by_rhythm_code(records, max_counts)

      assert length(selected) <= 1
    end

    test "select_by_form_code/2 selects records by form codes" do
      records = PTBXLTestHelper.sample_ecg_records()

      max_counts = %{"ABQRS" => 1}
      selected = Selector.select_by_form_code(records, max_counts)

      assert length(selected) <= 1
    end
  end

  describe "single selection functions" do
    test "get_by_scp_code/3 gets specific count of records by SCP code" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.get_by_scp_code(records, "NORM", 1)

      assert length(selected) <= 1

      if length(selected) == 1 do
        record = List.first(selected)
        assert Map.has_key?(record.scp_codes, "NORM")
      end
    end

    test "get_by_rhythm_code/3 gets specific count of records by rhythm code" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.get_by_rhythm_code(records, "SR", 1)

      assert length(selected) <= 1

      if length(selected) == 1 do
        record = List.first(selected)
        assert Map.has_key?(record.scp_codes, "SR")
      end
    end

    test "get_by_form_code/3 gets specific count of records by form code" do
      records = PTBXLTestHelper.sample_ecg_records()

      selected = Selector.get_by_form_code(records, "ABQRS", 1)

      assert length(selected) <= 1

      if length(selected) == 1 do
        record = List.first(selected)
        assert Map.has_key?(record.scp_codes, "ABQRS")
      end
    end

    test "returns empty list for non-existent codes" do
      records = PTBXLTestHelper.sample_ecg_records()

      assert Selector.get_by_scp_code(records, "NON_EXISTENT", 5) == []
      assert Selector.get_by_rhythm_code(records, "NON_EXISTENT", 5) == []
      assert Selector.get_by_form_code(records, "NON_EXISTENT", 5) == []
    end
  end
end
