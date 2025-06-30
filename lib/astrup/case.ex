defmodule Astrup.Case do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Astrup.{Repo, Case}

  schema "abg_cases" do
    field :scenario, :string
    field :ph, :decimal
    field :pco2, :decimal
    field :po2, :decimal
    field :bicarbonate, :decimal
    field :base_excess, :decimal
    field :age, :integer
    field :sex, :string
    field :case_summary, :string
    field :primary_disorder, :string
    field :compensation, :string

    timestamps(type: :utc_datetime)
  end

  @required_fields [
    :scenario,
    :ph,
    :pco2,
    :po2,
    :bicarbonate,
    :base_excess,
    :age,
    :sex,
    :case_summary,
    :primary_disorder,
    :compensation
  ]

  def changeset(abg_case, attrs \\ %{}) do
    abg_case
    |> cast(attrs, @required_fields)
    |> validate_required(@required_fields)
  end

  @doc """
  Returns a random ABG case from the database.
  """
  def get_random_case do
    case_count = Repo.aggregate(Case, :count, :id)
    
    if case_count > 0 do
      offset = :rand.uniform(case_count) - 1
      
      Case
      |> limit(1)
      |> offset(^offset)
      |> Repo.one()
    else
      nil
    end
  end

  @doc """
  Returns all ABG cases.
  """
  def list_cases do
    Repo.all(Case)
  end

  @doc """
  Gets a single ABG case.
  """
  def get_case!(id) do
    Repo.get!(Case, id)
  end

  @doc """
  Creates an ABG case.
  """
  def create_case(attrs \\ %{}) do
    %Case{}
    |> changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an ABG case.
  """
  def update_case(%Case{} = case, attrs) do
    case
    |> changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes an ABG case.
  """
  def delete_case(%Case{} = case) do
    Repo.delete(case)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking ABG case changes.
  """
  def change_case(%Case{} = case, attrs \\ %{}) do
    changeset(case, attrs)
  end
end
