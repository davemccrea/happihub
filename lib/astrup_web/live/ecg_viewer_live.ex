defmodule AstrupWeb.ECGViewerLive do
  use AstrupWeb, :live_view

  alias Astrup.Ecgs
  alias Astrup.Ecgs.Databases.Ptbxl
  alias Astrup.Ecgs.Databases.Ptbxl.Query
  alias Astrup.ClaudeAPI

  def mount(params, _session, socket) do
    socket =
      assign(socket,
        lead_names: [],
        env: Application.get_env(:astrup, :env),
        ecg_loaded: false,
        ecg_saved: false,
        ptbxl_record: nil,
        scp_codes_with_descriptions: [],
        translated_report: nil
      )

    socket =
      case {params["db"], params["filename"]} do
        {db_name, filename} when is_binary(db_name) and is_binary(filename) ->
          load_ecg_from_params(socket, db_name, filename)

        _ ->
          socket
      end

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-8">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">{gettext("ECG Viewer")}</h1>
          <div class="flex gap-4 items-center">
            <.button
              phx-click="load_random_ecg"
              class="btn btn-primary"
              id="load-random-ecg-button"
            >
              <.icon class="h-5 w-5" name="hero-arrow-path" />
              Load Random ECG
            </.button>

            <%= if @ecg_loaded do %>
              <.button
                phx-click={if @ecg_saved, do: "unsave_ecg", else: "save_ecg"}
                class="btn btn-square"
                id="save-ecg-button"
              >
                <%= if @ecg_saved do %>
                  Unsave <.icon class="h-5 w-5" name="hero-trash" />
                <% else %>
                  Save <.icon class="h-5 w-5" name="hero-document-arrow-down" />
                <% end %>
              </.button>

              <.button id="play-pause-button">
                Play
              </.button>
            <% end %>
          </div>
        </div>

        <.live_component
          module={AstrupWeb.Components.EcgPlayer}
          id="ecg-player"
          ecg_loaded={@ecg_loaded}
          env={@env}
          lead_names={@lead_names}
          ptbxl_record={@ptbxl_record}
          scp_codes_with_descriptions={@scp_codes_with_descriptions}
          translated_report={@translated_report}
        />
      </div>
    </Layouts.app>
    """
  end

  def handle_event("save_ecg", _params, socket) do
    case Ecgs.save_ecg(socket.assigns.current_scope, %{
           db_name: socket.assigns.db_name,
           filename: socket.assigns.filename
         }) do
      {:ok, _saved_ecg} ->
        socket = assign(socket, ecg_saved: true)
        {:noreply, put_flash(socket, :info, "ECG saved successfully!")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to save ECG")}
    end
  end

  def handle_event("unsave_ecg", _params, socket) do
    {count, _} =
      Ecgs.unsave_ecg(
        socket.assigns.current_scope,
        socket.assigns.db_name,
        socket.assigns.filename
      )

    if count > 0 do
      socket = assign(socket, ecg_saved: false)
      {:noreply, put_flash(socket, :info, "ECG unsaved successfully!")}
    else
      {:noreply, put_flash(socket, :error, "Failed to unsave ECG")}
    end
  end

  def handle_event("load_random_ecg", _params, socket) do
    case get_random_ptbxl_record() do
      {:ok, filename} ->
        socket = load_ecg_from_params(socket, "ptbxl", filename)
        {:noreply, socket}
      
      {:error, reason} ->
        {:noreply, put_flash(socket, :error, "Failed to load random ECG: #{reason}")}
    end
  end

  defp load_ecg_from_params(socket, db_name, filename) do
    ecg_data = Astrup.Wfdb.read(db_name, filename)
    qrs = Astrup.Wfdb.detect_qrs(db_name, filename)
    record = Map.put(ecg_data, "qrs", qrs)
    lead_names = Map.get(record, "sig_name", [])

    # Check if ECG is already saved
    ecg_saved = Ecgs.is_ecg_saved?(socket.assigns.current_scope, db_name, filename)

    # Load PTB-XL record data if available
    {ptbxl_record, scp_codes_with_descriptions, translated_report} = 
      if db_name == "ptbxl" do
        case Ptbxl.get_by_filename(filename) do
          nil -> {nil, [], nil}
          ptbxl_record -> 
            scp_codes_with_descriptions = 
              ptbxl_record.scp_codes
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
            
            # Translate the report if it exists and is not empty
            translated_report = 
              if ptbxl_record.report && ptbxl_record.report != "" do
                case ClaudeAPI.translate_text(ptbxl_record.report, "English") do
                  {:ok, translation} -> translation
                  {:error, _} -> nil
                end
              else
                nil
              end
            
            {ptbxl_record, scp_codes_with_descriptions, translated_report}
        end
      else
        {nil, [], nil}
      end

    socket
    |> assign(ecg_loaded: true)
    |> assign(lead_names: lead_names)
    |> assign(db_name: db_name)
    |> assign(filename: filename)
    |> assign(ecg_saved: ecg_saved)
    |> assign(ptbxl_record: ptbxl_record)
    |> assign(scp_codes_with_descriptions: scp_codes_with_descriptions)
    |> assign(translated_report: translated_report)
    |> push_event("ecg_data_pushed", %{data: record})
  end

  defp get_random_ptbxl_record() do
    try do
      records = Ptbxl.get_all_records()
      
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
end
