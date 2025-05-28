defmodule Astrup.Analyzer do
  @doc """
  A behaviour module for defining the contract for analyzer parameter modules.
  """

  @callback parameters() :: list(atom())
  @callback get_unit_by_parameter(parameter :: atom()) :: String.t()
  @callback blank_parameter_quiz_selections() :: %{nil => {nil, nil}}
end
