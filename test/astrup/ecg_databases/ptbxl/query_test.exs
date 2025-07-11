defmodule Astrup.EcgDatabases.Ptbxl.QueryTest do
  use ExUnit.Case, async: true

  alias Astrup.Ecgs.Databases.Ptbxl.Query

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




  describe "lookup_scp_code/1" do
    test "returns diagnostic codes with correct classifications" do
      assert Query.lookup_scp_code("NORM") == {:diagnostic, "normal ECG", "NORM"}
      assert Query.lookup_scp_code("AMI") == {:diagnostic, "anterior myocardial infarction", "MI"}
      assert Query.lookup_scp_code("LVH") == {:diagnostic, "left ventricular hypertrophy", "HYP"}
      assert Query.lookup_scp_code("1AVB") == {:diagnostic, "first degree AV block", "CD"}
      assert Query.lookup_scp_code("LNGQT") == {:diagnostic, "long QT-interval", "STTC"}
    end

    test "returns form codes with nil diagnostic class" do
      assert Query.lookup_scp_code("PVC") == {:form, "ventricular premature complex", nil}
      assert Query.lookup_scp_code("QWAVE") == {:form, "Q waves present", nil}
      assert Query.lookup_scp_code("INVT") == {:form, "inverted T-waves", nil}
    end

    test "returns rhythm codes with nil diagnostic class" do
      assert Query.lookup_scp_code("SR") == {:rhythm, "sinus rhythm", nil}
      assert Query.lookup_scp_code("AFIB") == {:rhythm, "atrial fibrillation", nil}
      assert Query.lookup_scp_code("STACH") == {:rhythm, "sinus tachycardia", nil}
    end

    test "returns nil for unknown codes" do
      assert Query.lookup_scp_code("UNKNOWN") == nil
      assert Query.lookup_scp_code("FAKE_CODE") == nil
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
