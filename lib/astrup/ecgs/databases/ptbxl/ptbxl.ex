defmodule Astrup.Ecgs.Databases.Ptbxl do
  use GenServer

  alias Astrup.Ecgs.Databases.Ptbxl.Parser

  @impl true
  def init(_opts) do
    ecg_databases_path = Application.get_env(:astrup, :ecg_databases_path)
    csv_file = Path.join(ecg_databases_path, "/ptbxl/ptbxl_database.csv")

    case Parser.parse_file(csv_file) do
      {:ok, data} ->
        {:ok, %{records: data.rows, csv_file: csv_file}}

      {:error, reason} ->
        {:stop, {:error, "Failed to load PTB-XL data: #{reason}"}}
    end
  end

  @impl true
  def handle_call(:get_all_records, _from, state), do: {:reply, state.records, state}

  @impl true
  def handle_call({:get_by_filename, filename}, _from, state) do
    record =
      Enum.find(state.records, fn record ->
        record.filename_lr == filename
        # record.filename_lr == filename || record.filename_hr == filename
      end)

    dbg(record)

    {:reply, record, state}
  end

  # Client API

  def start_link(opts \\ []), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  def get_all_records, do: GenServer.call(__MODULE__, :get_all_records)
  def get_by_filename(filename), do: GenServer.call(__MODULE__, {:get_by_filename, filename})
end
