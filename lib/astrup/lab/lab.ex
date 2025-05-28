defmodule Astrup.Lab do
  @doc """
  A behaviour module for defining the contract for lab modules.
  """

  @callback get_reference_range(parameter :: atom(), context :: map()) ::
              {Decimal.t(), Decimal.t(), String.t(), atom()}

  @defaults %{age_range: "31-50", sex: "male"}

  @spec check_value_against_reference_range(module(), atom(), Decimal.t(), map()) :: atom()
  def check_value_against_reference_range(lab, parameter, value, context \\ @defaults) do
    {min, max, _unit, _display_type} = lab.get_reference_range(parameter, context)

    cond do
      Decimal.gt?(value, max) -> :high
      Decimal.lt?(value, min) -> :low
      Decimal.gte?(value, min) and Decimal.lte?(value, max) -> :normal
    end
  end

  @spec pretty_print_reference_range(module(), atom(), map()) :: String.t()
  def pretty_print_reference_range(lab, parameter, context \\ @defaults) do
    {min, max, unit, display_type} = lab.get_reference_range(parameter, context)

    case display_type do
      :decimal -> "#{min} - #{max} #{unit}"
      :integer -> "#{Decimal.to_integer(min)} - #{Decimal.to_integer(max)} #{unit}"
    end
  end
end
