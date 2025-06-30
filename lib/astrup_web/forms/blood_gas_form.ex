defmodule AstrupWeb.Forms.BloodGasForm do
  @moduledoc """
  Form schema for blood gas interpretation input validation.
  """
  use Ecto.Schema
  import Ecto.Changeset
  use Gettext, backend: AstrupWeb.Gettext

  @primary_key false
  embedded_schema do
    field :ph, :decimal
    field :pco2, :decimal
    field :bicarbonate, :decimal
  end

  @required_fields [:ph, :pco2, :bicarbonate]

  def changeset(params \\ %{}) do
    %__MODULE__{}
    |> cast(params, @required_fields)
    |> validate_required(@required_fields, message: gettext("is required"))
    |> validate_ph()
    |> validate_pco2()
    |> validate_bicarbonate()
  end

  defp validate_ph(changeset) do
    changeset
    |> validate_number(:ph,
      greater_than_or_equal_to: Decimal.new("6.0"),
      less_than_or_equal_to: Decimal.new("8.0"),
      message: gettext("pH must be between 6.0 and 8.0")
    )
  end

  defp validate_pco2(changeset) do
    changeset
    |> validate_number(:pco2,
      greater_than_or_equal_to: Decimal.new("1.0"),
      less_than_or_equal_to: Decimal.new("20.0"),
      message: gettext("pCO₂ must be between 1.0 and 20.0 kPa")
    )
  end

  defp validate_bicarbonate(changeset) do
    changeset
    |> validate_number(:bicarbonate,
      greater_than_or_equal_to: Decimal.new("5.0"),
      less_than_or_equal_to: Decimal.new("50.0"),
      message: gettext("HCO₃⁻ must be between 5.0 and 50.0 mmol/L")
    )
  end
end