defmodule Astrup.ECG.DatabaseRegistry do
  @moduledoc """
  Registry for ECG dataset adapters.

  This module manages the mapping between dataset names and their corresponding
  adapter modules. It provides a centralized way to access different ECG datasets.
  """

  alias Astrup.ECG.Datasets.Ptbxl

  @databases %{
    "ptbxl" => Ptbxl
  }

  @spec get_database(String.t()) :: module() | nil
  def get_database(db_name), do: Map.get(@databases, db_name)

  @spec list_databases() :: [String.t()]
  def list_databases, do: Map.keys(@databases)

  @spec database_exists?(String.t()) :: boolean()
  def database_exists?(db_name), do: Map.has_key?(@databases, db_name)
end
