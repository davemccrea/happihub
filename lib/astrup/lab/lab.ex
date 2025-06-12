defmodule Astrup.Lab do
  @doc """
  A behaviour module for defining the contract for lab modules.
  """

  @callback get_reference_range(parameter :: atom(), context :: map()) ::
              {Decimal.t(), Decimal.t(), String.t(), atom()}
end
