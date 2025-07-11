defmodule Astrup.Ecgs.Databases.Ptbxl do
  use GenServer
  @behaviour Astrup.Ecgs.DatabaseBehavior

  alias Astrup.Ecgs.Databases.Ptbxl.Parser
  alias Astrup.Ecgs.Databases.Ptbxl.Query

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

  @impl Astrup.Ecgs.DatabaseBehavior
  def get_all_records, do: GenServer.call(__MODULE__, :get_all_records)

  @impl Astrup.Ecgs.DatabaseBehavior
  def get_by_filename(filename), do: GenServer.call(__MODULE__, {:get_by_filename, filename})

  @impl Astrup.Ecgs.DatabaseBehavior
  def get_random_record do
    try do
      records = get_all_records()
      
      if length(records) > 0 do
        random_record = Enum.random(records)
        {:ok, random_record.filename_lr}
      else
        {:error, "No PTB-XL records available"}
      end
    rescue
      e -> {:error, "Error accessing PTB-XL database: #{Exception.message(e)}"}
    end
  end

  @impl Astrup.Ecgs.DatabaseBehavior
  def get_metadata(record) do
    scp_codes_with_descriptions = 
      record.scp_codes
      |> Enum.map(fn {code, confidence} ->
        case Query.lookup_scp_code(code) do
          {kind, description, diagnostic_class} ->
            %{
              code: code,
              confidence: confidence,
              kind: kind,
              description: description,
              diagnostic_class: diagnostic_class
            }
          nil ->
            %{
              code: code,
              confidence: confidence,
              kind: :unknown,
              description: "Unknown SCP code",
              diagnostic_class: nil
            }
        end
      end)
      |> Enum.sort_by(& &1.confidence, :desc)

    %{
      type: :ptbxl,
      scp_codes: scp_codes_with_descriptions,
      report: record.report,
      raw_record: record
    }
  end
end
