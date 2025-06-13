defmodule Astrup.Printout do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Astrup.{Repo, Printout}

  schema "printouts" do
    field :ph, :decimal
    field :pco2, :decimal
    field :po2, :decimal
    field :bicarbonate, :decimal
    field :base_excess, :decimal
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
    field :age, :integer
    field :sex, :string
    field :checked_at, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @required_fields [
    :ph,
    :pco2,
    :po2,
    :bicarbonate,
    :base_excess,
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
    :lactate
  ]

  @optional_fields [
    :age,
    :sex,
    :checked_at
  ]

  def changeset(printout, params \\ %{}, _metadata \\ []) do
    printout
    |> cast(params, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
  end

  def mark_as_checked(printout) do
    printout
    |> changeset(%{checked_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Get a random printout that has been checked.
  """
  def get_random_printout() do
    Printout
    |> from(order_by: fragment("RANDOM()"), limit: 1)
    |> where([p], not is_nil(p.checked_at))
    |> Repo.one()
  end
end
