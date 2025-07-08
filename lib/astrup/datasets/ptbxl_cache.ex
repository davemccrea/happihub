defmodule Astrup.Datasets.PTBXLCache do
  @moduledoc """
  GenServer that loads and caches PTB-XL database data in memory.

  This server loads the ptbxl_database.csv file on startup and keeps
  the parsed data in memory for fast access throughout the application.

  The cache only provides raw data storage and retrieval. Use the
  `Astrup.Datasets.PTBXL.Selector` module for querying and filtering
  the cached data.

  ## Usage

      # Get all records from cache
      records = Astrup.Datasets.PTBXLCache.get_all_records()
      
      # Use selector for querying
      selected = Astrup.Datasets.PTBXL.Selector.select_by_diagnosis(records, %{"MI" => 10})
      specific = Astrup.Datasets.PTBXL.Selector.get_by_scp_code(records, "NORM", 5)
  """

  use GenServer

  alias Astrup.Datasets.PTBXL

  # Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Get all cached PTB-XL records.

  Returns the full dataset that was loaded at startup.
  """
  def get_all_records do
    GenServer.call(__MODULE__, :get_all_records)
  end

  @doc """
  Reload the data from the CSV file.

  This can be useful during development or if the data file is updated.
  """
  def reload_data do
    GenServer.call(__MODULE__, :reload_data)
  end

  # Server callbacks

  @impl true
  def init(opts) do
    csv_file = Keyword.get(opts, :csv_file, "lib/astrup/datasets/ptbxl/ptbxl_database.csv")

    case load_ptbxl_data(csv_file) do
      {:ok, data} ->
        {:ok, %{records: data.rows, csv_file: csv_file}}

      {:error, reason} ->
        {:stop, {:error, "Failed to load PTB-XL data: #{reason}"}}
    end
  end

  @impl true
  def handle_call(:get_all_records, _from, state) do
    {:reply, state.records, state}
  end

  @impl true
  def handle_call(:reload_data, _from, state) do
    case load_ptbxl_data(state.csv_file) do
      {:ok, data} ->
        new_state = %{state | records: data.rows}
        {:reply, :ok, new_state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  # Private functions

  defp load_ptbxl_data(csv_file) do
    PTBXL.parse_file(csv_file)
  end
end
