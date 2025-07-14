defmodule AstrupWeb.ECGViewerLive do
  alias Astrup.Settings
  use AstrupWeb, :live_view

  alias Astrup.ECG
  alias Astrup.ECG.DatasetRegistry

  def mount(params, _session, socket) do
    settings =
      Astrup.Settings.changeset(socket.assigns.current_scope.user.settings || %Settings{}, %{})

    socket =
      socket
      |> assign(:env, Application.get_env(:astrup, :env))
      |> assign(:ecg_saved, false)
      |> assign(:metadata, %{})
      |> assign(:ecg_data, nil)
      |> assign(:settings, settings)

    socket =
      if params["db"] && params["filename"] do
        load_ecg_from_params(socket, params["db"], params["filename"])
      else
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
        </div>

        <.live_component
          module={AstrupWeb.Components.EcgPlayer}
          id="ecg-player"
          env={@env}
          ecg_data={@ecg_data}
          settings={@settings}
        >
          <:actions>
            <.button phx-click="load_random_ecg" class="btn btn-primary" id="load-random-ecg-button">
              <.icon class="h-5 w-5" name="hero-arrow-path" /> Load Random ECG
            </.button>

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
          </:actions>

          <:sidebar>
            <AstrupWeb.Components.ClinicalInfoPanel.clinical_info_panel metadata={@metadata} />
          </:sidebar>

          <:instructions>
            <AstrupWeb.Components.EcgInstructions.default_instructions />
          </:instructions>

          <:empty_state>
            <div class="bg-base-100/90 rounded-lg p-8">
              <div class="text-center space-y-4">
                <div class="text-6xl opacity-30">
                  <.icon name="hero-heart" class="w-16 h-16 mx-auto" />
                </div>
                <div class="space-y-2">
                  <p class="text-lg font-medium">No ECG Data Loaded</p>
                  <p class="text-sm text-base-content/60">Click "Load Random ECG" to begin</p>
                </div>
              </div>
            </div>
          </:empty_state>
        </.live_component>
      </div>
    </Layouts.app>
    """
  end

  def handle_event("save_ecg", _params, socket) do
    case ECG.save_ecg(socket.assigns.current_scope, %{
           db_name: socket.assigns.dataset_name,
           filename: socket.assigns.filename
         }) do
      {:ok, _saved_ecg} ->
        socket = assign(socket, :ecg_saved, true)
        {:noreply, put_flash(socket, :info, "ECG saved successfully!")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to save ECG")}
    end
  end

  def handle_event("unsave_ecg", _params, socket) do
    {count, _} =
      ECG.unsave_ecg(
        socket.assigns.current_scope,
        socket.assigns.dataset_name,
        socket.assigns.filename
      )

    if count > 0 do
      socket = assign(socket, :ecg_saved, false)
      {:noreply, put_flash(socket, :info, "ECG unsaved successfully!")}
    else
      {:noreply, put_flash(socket, :error, "Failed to unsave ECG")}
    end
  end

  def handle_event("load_random_ecg", _params, socket) do
    dataset_name = Application.get_env(:astrup, :default_ecg_database, "ptbxl")

    case get_random_record(dataset_name) do
      {:ok, filename} ->
        socket = load_ecg_from_params(socket, dataset_name, filename)
        {:noreply, socket}

      {:error, reason} ->
        {:noreply, put_flash(socket, :error, "Failed to load random ECG: #{reason}")}
    end
  end

  defp load_ecg_from_params(socket, dataset_name, filename) do
    ecg_data = Astrup.Wfdb.read(dataset_name, filename)
    qrs = Astrup.Wfdb.detect_qrs(dataset_name, filename)
    record = Map.put(ecg_data, "qrs", qrs)

    # Check if ECG is already saved
    ecg_saved = ECG.is_ecg_saved?(socket.assigns.current_scope, dataset_name, filename)

    # Load dataset metadata if available
    metadata = load_dataset_metadata(dataset_name, filename)

    socket
    |> assign(:dataset_name, dataset_name)
    |> assign(:filename, filename)
    |> assign(:ecg_saved, ecg_saved)
    |> assign(:metadata, metadata)
    |> assign(:ecg_data, record)
  end

  defp load_dataset_metadata(dataset_name, filename) do
    with dataset_module when not is_nil(dataset_module) <-
           DatasetRegistry.get_dataset(dataset_name),
         record when not is_nil(record) <- dataset_module.get_by_filename(filename) do
      dataset_module.get_metadata(record)
    else
      _ -> %{}
    end
  end

  defp get_random_record(dataset_name) do
    with dataset_module when not is_nil(dataset_module) <-
           DatasetRegistry.get_dataset(dataset_name),
         record when not is_nil(record) <- dataset_module.get_random_record() do
      {:ok, record.filename_lr}
    else
      nil -> {:error, "Database #{dataset_name} not found"}
      _ -> {:error, "No records available"}
    end
  end
end
