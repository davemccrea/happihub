defmodule Astrup.PatientCase do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Astrup.{Repo, PatientCase}

  schema "patient_cases" do
    # From Case schema (abg_cases)
    field :scenario, :string
    field :case_summary, :string
    field :primary_disorder, :string
    field :compensation, :string

    # Shared fields from both schemas
    field :ph, :decimal
    field :pco2, :decimal
    field :po2, :decimal
    field :bicarbonate, :decimal
    field :base_excess, :decimal
    field :age, :integer
    field :sex, :string

    # From Printout schema (additional lab values)
    field :anion_gap, :decimal
    field :hemoglobin, :decimal
    field :oxygen_content, :decimal
    field :oxygen_saturation, :decimal
    field :carboxyhemoglobin, :decimal
    field :methemoglobin, :decimal
    field :potassium, :decimal
    field :sodium, :decimal
    field :ionized_calcium, :decimal
    field :ionized_calcium_corrected_to_ph_7_4, :decimal
    field :chloride, :decimal
    field :glucose, :decimal
    field :lactate, :decimal
    field :checked_at, :utc_datetime

    # New field for case type
    # "reference", "interpretation", "mixed"
    field :case_type, :string, default: "reference"

    timestamps(type: :utc_datetime)
  end

  @required_fields [
    :ph,
    :pco2,
    :po2,
    :bicarbonate,
    :base_excess
  ]

  @optional_fields [
    :scenario,
    :case_summary,
    :primary_disorder,
    :compensation,
    :age,
    :sex,
    :anion_gap,
    :hemoglobin,
    :oxygen_content,
    :oxygen_saturation,
    :carboxyhemoglobin,
    :methemoglobin,
    :potassium,
    :sodium,
    :ionized_calcium,
    :ionized_calcium_corrected_to_ph_7_4,
    :chloride,
    :glucose,
    :lactate,
    :checked_at,
    :case_type
  ]

  def changeset(patient_case, attrs \\ %{}, _metadata \\ []) do
    patient_case
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_inclusion(:case_type, ["reference", "interpretation", "mixed"])
  end

  @doc """
  Returns a random patient case from the database.
  """
  def get_random_case do
    case_count = Repo.aggregate(PatientCase, :count, :id)

    if case_count > 0 do
      offset = :rand.uniform(case_count) - 1

      PatientCase
      |> limit(1)
      |> offset(^offset)
      |> Repo.one()
    else
      nil
    end
  end

  @doc """
  Returns a random patient case by type.
  """
  def get_random_case_by_type(case_type) do
    PatientCase
    |> from(order_by: fragment("RANDOM()"), limit: 1)
    |> where([p], p.case_type == ^case_type)
    |> Repo.one()
  end

  @doc """
  Returns a random checked patient case (for printout-style cases).
  """
  def get_random_checked_case do
    PatientCase
    |> from(order_by: fragment("RANDOM()"), limit: 1)
    |> where([p], not is_nil(p.checked_at))
    |> Repo.one()
  end

  @doc """
  Mark a patient case as checked.
  """
  def mark_as_checked(patient_case) do
    patient_case
    |> changeset(%{checked_at: DateTime.utc_now()}, [])
    |> Repo.update()
  end

  @doc """
  Returns all patient cases.
  """
  def list_cases do
    Repo.all(PatientCase)
  end

  @doc """
  Gets a single patient case.
  """
  def get_case!(id) do
    Repo.get!(PatientCase, id)
  end

  @doc """
  Creates a patient case.
  """
  def create_case(attrs \\ %{}) do
    %PatientCase{}
    |> changeset(attrs, [])
    |> Repo.insert()
  end

  @doc """
  Updates a patient case.
  """
  def update_case(%PatientCase{} = case, attrs) do
    case
    |> changeset(attrs, [])
    |> Repo.update()
  end

  @doc """
  Deletes a patient case.
  """
  def delete_case(%PatientCase{} = case) do
    Repo.delete(case)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking patient case changes.
  """
  def change_case(%PatientCase{} = case, attrs \\ %{}) do
    changeset(case, attrs, [])
  end
end
