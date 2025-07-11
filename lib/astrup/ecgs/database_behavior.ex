defmodule Astrup.Ecgs.DatabaseBehavior do
  @moduledoc """
  Behavior for ECG database adapters.
  
  This behavior defines a common interface that all ECG database modules must implement
  to work with the ECGViewerLive component.
  """

  @type record :: map()
  @type filename :: String.t()
  @type metadata :: map()

  @doc """
  Retrieves a record by its filename.
  """
  @callback get_by_filename(filename) :: record | nil

  @doc """
  Retrieves all records from the database.
  """
  @callback get_all_records() :: [record]

  @doc """
  Gets a random record from the database.
  Returns {:ok, filename} or {:error, reason}.
  """
  @callback get_random_record() :: {:ok, filename} | {:error, String.t()}

  @doc """
  Extracts metadata from a database record.
  Returns a standardized metadata map.
  """
  @callback get_metadata(record) :: metadata
end