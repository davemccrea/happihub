defmodule Astrup.PatientCaseTest do
  use Astrup.DataCase

  alias Astrup.PatientCase

  @valid_attrs %{
    summary: "Test case summary",
    quiz_description: "Test quiz description",
    explanation: "Test explanation",
    primary_disorder: :normal,
    compensation: :uncompensated,
    time_course: :acute,
    ph: Decimal.new("7.40"),
    pco2: Decimal.new("5.3"),
    po2: Decimal.new("12.0"),
    bicarbonate: Decimal.new("24"),
    base_excess: Decimal.new("0"),
    age: 45,
    sex: "male",
    anion_gap: Decimal.new("12"),
    hemoglobin: Decimal.new("140"),
    oxygen_content: Decimal.new("20"),
    oxygen_saturation: Decimal.new("98"),
    carboxyhemoglobin: Decimal.new("1.0"),
    methemoglobin: Decimal.new("1.0"),
    potassium: Decimal.new("4.0"),
    sodium: Decimal.new("140"),
    ionized_calcium: Decimal.new("1.25"),
    ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.25"),
    chloride: Decimal.new("104"),
    glucose: Decimal.new("5.0"),
    lactate: Decimal.new("1.0")
  }

  @invalid_attrs %{
    summary: nil,
    quiz_description: nil,
    explanation: nil,
    primary_disorder: nil,
    compensation: nil,
    ph: nil,
    pco2: nil,
    po2: nil,
    bicarbonate: nil,
    base_excess: nil
  }

  describe "changeset/3" do
    test "changeset with valid attributes" do
      changeset = PatientCase.changeset(%PatientCase{}, @valid_attrs)
      assert changeset.valid?
    end

    test "changeset with invalid attributes" do
      changeset = PatientCase.changeset(%PatientCase{}, @invalid_attrs)
      refute changeset.valid?
    end

    test "changeset requires summary" do
      attrs = Map.delete(@valid_attrs, :summary)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "can't be blank" in errors_on(changeset).summary
    end

    test "changeset requires quiz_description" do
      attrs = Map.delete(@valid_attrs, :quiz_description)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "can't be blank" in errors_on(changeset).quiz_description
    end

    test "changeset requires explanation" do
      attrs = Map.delete(@valid_attrs, :explanation)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "can't be blank" in errors_on(changeset).explanation
    end

    test "changeset requires primary_disorder" do
      attrs = Map.delete(@valid_attrs, :primary_disorder)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "can't be blank" in errors_on(changeset).primary_disorder
    end

    test "changeset requires compensation" do
      attrs = Map.delete(@valid_attrs, :compensation)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "can't be blank" in errors_on(changeset).compensation
    end

    test "changeset validates primary_disorder inclusion" do
      attrs = Map.put(@valid_attrs, :primary_disorder, :invalid_disorder)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "is invalid" in errors_on(changeset).primary_disorder
    end

    test "changeset validates compensation inclusion" do
      attrs = Map.put(@valid_attrs, :compensation, :invalid_compensation)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "is invalid" in errors_on(changeset).compensation
    end

    test "changeset validates time_course inclusion" do
      attrs = Map.put(@valid_attrs, :time_course, :invalid_time_course)
      changeset = PatientCase.changeset(%PatientCase{}, attrs)
      assert "is invalid" in errors_on(changeset).time_course
    end

    test "changeset allows valid primary_disorder values" do
      valid_disorders = [
        :normal,
        :respiratory_acidosis,
        :respiratory_alkalosis,
        :metabolic_acidosis,
        :metabolic_alkalosis,
        :not_determined
      ]

      for disorder <- valid_disorders do
        attrs = Map.put(@valid_attrs, :primary_disorder, disorder)
        changeset = PatientCase.changeset(%PatientCase{}, attrs)
        assert changeset.valid?, "#{disorder} should be valid"
      end
    end

    test "changeset allows valid compensation values" do
      valid_compensations = [:uncompensated, :partially_compensated, :fully_compensated]

      for compensation <- valid_compensations do
        attrs = Map.put(@valid_attrs, :compensation, compensation)
        changeset = PatientCase.changeset(%PatientCase{}, attrs)
        assert changeset.valid?, "#{compensation} should be valid"
      end
    end

    test "changeset allows valid time_course values" do
      valid_time_courses = [:acute, :chronic, :acute_on_chronic]

      for time_course <- valid_time_courses do
        attrs = Map.put(@valid_attrs, :time_course, time_course)
        changeset = PatientCase.changeset(%PatientCase{}, attrs)
        assert changeset.valid?, "#{time_course} should be valid"
      end
    end
  end

  describe "create_case/1" do
    test "creates case with valid attributes" do
      assert {:ok, %PatientCase{} = case} = PatientCase.create_case(@valid_attrs)
      assert case.summary == @valid_attrs.summary
      assert case.quiz_description == @valid_attrs.quiz_description
      assert case.primary_disorder == @valid_attrs.primary_disorder
      assert case.compensation == @valid_attrs.compensation
    end

    test "returns error with invalid attributes" do
      assert {:error, %Ecto.Changeset{}} = PatientCase.create_case(@invalid_attrs)
    end
  end

  describe "list_cases/0" do
    test "returns all cases" do
      # Clear existing data
      Repo.delete_all(PatientCase)

      {:ok, case1} = PatientCase.create_case(@valid_attrs)
      {:ok, case2} = PatientCase.create_case(Map.put(@valid_attrs, :summary, "Second case"))

      cases = PatientCase.list_cases()
      assert length(cases) == 2
      assert Enum.any?(cases, fn c -> c.id == case1.id end)
      assert Enum.any?(cases, fn c -> c.id == case2.id end)
    end

    test "returns empty list when no cases exist" do
      # Clear existing data
      Repo.delete_all(PatientCase)
      assert PatientCase.list_cases() == []
    end
  end

  describe "get_case!/1" do
    test "returns case with given id" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      retrieved_case = PatientCase.get_case!(case.id)
      assert retrieved_case.id == case.id
      assert retrieved_case.summary == case.summary
    end

    test "raises when case not found" do
      assert_raise Ecto.NoResultsError, fn ->
        PatientCase.get_case!(999)
      end
    end
  end

  describe "update_case/2" do
    test "updates case with valid attributes" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      update_attrs = %{summary: "Updated summary"}
      assert {:ok, %PatientCase{} = updated_case} = PatientCase.update_case(case, update_attrs)
      assert updated_case.summary == "Updated summary"
    end

    test "returns error with invalid attributes" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      assert {:error, %Ecto.Changeset{}} = PatientCase.update_case(case, @invalid_attrs)
    end
  end

  describe "delete_case/1" do
    test "deletes case" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      assert {:ok, %PatientCase{}} = PatientCase.delete_case(case)

      assert_raise Ecto.NoResultsError, fn ->
        PatientCase.get_case!(case.id)
      end
    end
  end

  describe "change_case/2" do
    test "returns changeset for case" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      changeset = PatientCase.change_case(case)
      assert %Ecto.Changeset{} = changeset
    end

    test "returns changeset with given attributes" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)

      changeset = PatientCase.change_case(case, %{summary: "New summary"})
      assert changeset.changes.summary == "New summary"
    end
  end

  describe "mark_as_checked/1" do
    test "marks case as checked" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)
      assert is_nil(case.checked_at)

      assert {:ok, updated_case} = PatientCase.mark_as_checked(case)
      assert updated_case.checked_at != nil
    end
  end

  describe "get_random_case/0" do
    test "returns nil when no cases exist" do
      # Clear existing data
      Repo.delete_all(PatientCase)
      assert PatientCase.get_random_case() == nil
    end

    test "returns case when cases exist" do
      {:ok, _case} = PatientCase.create_case(@valid_attrs)

      random_case = PatientCase.get_random_case()
      assert %PatientCase{} = random_case
    end
  end

  describe "get_random_checked_case/0" do
    test "returns nil when no checked cases exist" do
      {:ok, _case} = PatientCase.create_case(@valid_attrs)

      assert PatientCase.get_random_checked_case() == nil
    end

    test "returns checked case when checked cases exist" do
      {:ok, case} = PatientCase.create_case(@valid_attrs)
      {:ok, checked_case} = PatientCase.mark_as_checked(case)

      random_checked_case = PatientCase.get_random_checked_case()
      assert %PatientCase{} = random_checked_case
      assert random_checked_case.id == checked_case.id
    end
  end
end
