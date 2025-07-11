defmodule Astrup.ECG.Datasets.Ptbxl do
  @moduledoc """
  PTB-XL ECG dataset implementation.

  This module provides a dataset interface for the PTB-XL dataset,
  implementing the DatasetBehavior for consistent ECG dataset operations.
  """

  @behaviour Astrup.ECG.DatasetBehavior

  alias Astrup.ECG.Datasets.Ptbxl.Query

  @impl true
  def get_all_records, do: GenServer.call(__MODULE__.GenServer, :get_all_records)

  @impl true
  def get_by_filename(filename) do
    GenServer.call(__MODULE__.GenServer, {:get_by_filename, filename})
  end

  @impl true
  def get_random_record do
    records = get_all_records()

    case records do
      [] -> nil
      _ -> Enum.random(records)
    end
  end

  @impl true
  def get_metadata(record), do: Query.get_metadata(record)

  def start_link(opts \\ []) do
    Astrup.ECG.Datasets.Ptbxl.GenServer.start_link(opts)
  end
end
