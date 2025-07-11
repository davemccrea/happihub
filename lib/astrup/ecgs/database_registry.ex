defmodule Astrup.Ecgs.DatabaseRegistry do
  @moduledoc """
  Registry for ECG database adapters.
  
  This module manages the mapping between database names and their corresponding
  adapter modules. It provides a centralized way to access different ECG databases.
  """

  alias Astrup.Ecgs.Databases.Ptbxl

  @databases %{
    "ptbxl" => Ptbxl
  }

  @doc """
  Retrieves the database module for a given database name.
  
  ## Examples
  
      iex> DatabaseRegistry.get_database("ptbxl")
      Astrup.Ecgs.Databases.Ptbxl
      
      iex> DatabaseRegistry.get_database("unknown")
      nil
  """
  @spec get_database(String.t()) :: module() | nil
  def get_database(db_name) do
    Map.get(@databases, db_name)
  end

  @doc """
  Lists all available database names.
  
  ## Examples
  
      iex> DatabaseRegistry.list_databases()
      ["ptbxl"]
  """
  @spec list_databases() :: [String.t()]
  def list_databases do
    Map.keys(@databases)
  end

  @doc """
  Checks if a database is registered.
  
  ## Examples
  
      iex> DatabaseRegistry.database_exists?("ptbxl")
      true
      
      iex> DatabaseRegistry.database_exists?("unknown")
      false
  """
  @spec database_exists?(String.t()) :: boolean()
  def database_exists?(db_name) do
    Map.has_key?(@databases, db_name)
  end
end