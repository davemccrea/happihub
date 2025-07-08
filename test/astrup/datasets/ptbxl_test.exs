defmodule Astrup.Datasets.PTBXLTest do
  use ExUnit.Case, async: true

  alias Astrup.Datasets.PTBXL

  describe "convenience module delegation" do
    test "delegates parse_string/1 to Parser" do
      content = PTBXLTestHelper.sample_csv_content()

      assert {:ok, %{header: header, rows: rows}} = PTBXL.parse_string(content)

      assert length(header) == 28
      assert length(rows) == 5
    end

    test "delegates parse_file/1 to Parser" do
      temp_file = PTBXLTestHelper.create_temp_csv_file()

      assert {:ok, %{header: header, rows: rows}} = PTBXL.parse_file(temp_file)

      assert length(header) == 28
      assert length(rows) == 5

      PTBXLTestHelper.cleanup_temp_file(temp_file)
    end

    test "delegates selection functions to Selector" do
      records = PTBXLTestHelper.sample_ecg_records()

      # Test multi-selection functions
      assert length(PTBXL.select_by_diagnosis(records, %{"NORM" => 1, "MI" => 1})) == 2
      assert length(PTBXL.select_by_scp_code(records, %{"NORM" => 1, "AMI" => 1})) == 2
      assert length(PTBXL.select_by_diagnostic_class(records, %{"NORM" => 1, "MI" => 1})) == 2
      assert length(PTBXL.select_by_rhythm_code(records, %{"SR" => 1})) <= 1
      assert length(PTBXL.select_by_form_code(records, %{"ABQRS" => 1})) <= 1

      # Test single-selection functions
      assert length(PTBXL.get_by_scp_code(records, "NORM", 1)) <= 1
      assert length(PTBXL.get_by_rhythm_code(records, "SR", 1)) <= 1
      assert length(PTBXL.get_by_form_code(records, "ABQRS", 1)) <= 1
    end

    test "delegates get_available_diagnoses/1 to Selector" do
      records = PTBXLTestHelper.sample_ecg_records()

      diagnoses = PTBXL.get_available_diagnoses(records)

      assert length(diagnoses) == 4

      assert Enum.all?(diagnoses, fn {diagnosis, count} ->
               is_binary(diagnosis) and is_integer(count)
             end)
    end

    test "delegates get_all_scp_codes/2 to Selector" do
      records = PTBXLTestHelper.sample_ecg_records()

      codes = PTBXL.get_all_scp_codes(records, :clean_signal)

      assert length(codes) > 0

      assert Enum.all?(codes, fn {code, count} ->
               is_binary(code) and is_integer(count)
             end)
    end

    test "delegates get_scp_code_details/2 to Selector" do
      records = PTBXLTestHelper.sample_ecg_records()

      details = PTBXL.get_scp_code_details(records, :clean_signal)

      assert length(details) > 0

      assert Enum.all?(details, fn detail ->
               Map.has_key?(detail, :code) and Map.has_key?(detail, :count)
             end)
    end

    test "delegates get_selection_summary/1 to Selector" do
      records = PTBXLTestHelper.sample_ecg_records()

      summary = PTBXL.get_selection_summary(records)

      assert Map.has_key?(summary, :total_count)
      assert Map.has_key?(summary, :diagnosis_distribution)
      assert Map.has_key?(summary, :age_statistics)
      assert Map.has_key?(summary, :sex_distribution)
    end

    test "delegates get_primary_diagnosis/1 to Selector" do
      record = PTBXLTestHelper.sample_ecg_record(%{scp_codes: %{"NORM" => 100.0}})

      diagnosis = PTBXL.get_primary_diagnosis(record)

      assert diagnosis == "NORM"
    end
  end

  describe "integration test" do
    test "full workflow using convenience module" do
      temp_file = PTBXLTestHelper.create_temp_csv_file()

      # Parse file
      assert {:ok, %{rows: rows}} = PTBXL.parse_file(temp_file)

      # Get available diagnoses
      diagnoses = PTBXL.get_available_diagnoses(rows)
      assert length(diagnoses) > 0

      # Select records
      max_counts = %{"NORM" => 2, "MI" => 1}
      selected = PTBXL.select_by_diagnosis(rows, max_counts)
      assert length(selected) <= 3

      # Get summary
      summary = PTBXL.get_selection_summary(selected)
      assert summary.total_count == length(selected)

      # Get SCP code details
      details = PTBXL.get_scp_code_details(selected, :clean_signal)
      assert length(details) > 0

      PTBXLTestHelper.cleanup_temp_file(temp_file)
    end

    test "demonstrates proper cache usage pattern" do
      # This test shows how to use the cache with the selector
      # In a real application, you would use:
      # records = Astrup.Datasets.PTBXLCache.get_all_records()

      # For testing, we use sample data
      records = PTBXLTestHelper.sample_ecg_records()

      # Use selector for querying
      selected = PTBXL.select_by_diagnosis(records, %{"NORM" => 1, "MI" => 1})
      assert length(selected) == 2

      # Use selector for single record selection
      specific = PTBXL.get_by_scp_code(records, "NORM", 1)
      assert length(specific) <= 1
    end
  end
end
