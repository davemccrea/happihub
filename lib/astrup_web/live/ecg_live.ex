defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  alias Astrup.EcgDatabases.Ptbxl

  def get_random_record() do
    record =
      Ptbxl.get_all_records()
      |> Ptbxl.Query.filter_high_quality()
      |> Ptbxl.Query.filter_signal_quality()
      |> Enum.random()

    Astrup.Wfdb.read("ptbxl", record.filename_lr)
  end

  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       is_playing: false,
       current_lead: 1,
       elapsed_time: 0,
       display_mode: "single",
       grid_type: "simple",
       lead_names: ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"],
       env: Application.get_env(:astrup, :env),
       ecg_loaded: false
     )}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-12">
        <h1 class="text-2xl font-bold">ECG Test</h1>

        <%= if @ecg_loaded do %>
          <div class="flex gap-4">
            <form phx-change="change_lead">
              <.input
                type="select"
                name="lead"
                value={@current_lead}
                label="Current Lead"
                options={
                  Enum.with_index(@lead_names)
                  |> Enum.map(fn {name, index} -> {"Lead #{name}", index} end)
                }
              />
            </form>

            <form phx-change="change_display_mode">
              <.input
                type="select"
                name="display_mode"
                value={@display_mode}
                label="Display Mode"
                options={[
                  {"Single Lead", "single"},
                  {"All Leads", "multi"}
                ]}
              />
            </form>

            <form phx-change="change_grid_type">
              <.input
                type="select"
                name="grid_type"
                value={@grid_type}
                label="Grid Type"
                options={[
                  {"Medical Grid", "medical"},
                  {"Simple Grid", "simple"}
                ]}
              />
            </form>
          </div>
        <% end %>

        <div class="space-y-4">
          <div class="relative">
            <div
              id="ecg-playback"
              phx-hook="ECGPlayback"
              phx-update="ignore"
              class="w-full"
              data-grid-type={@grid_type}
              data-display-mode={@display_mode}
              data-current-lead={@current_lead}
              data-is-playing={to_string(@is_playing)}
              data-env={@env}
            >
              <div data-ecg-chart class="w-full"></div>
            </div>

            <%= if not @ecg_loaded do %>
              <div class="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-90">
                <div class="text-center space-y-4">
                  <div class="text-6xl opacity-30">
                    <svg
                      class="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      >
                      </path>
                    </svg>
                  </div>
                  <div class="space-y-2">
                    <p class="text-lg font-medium">No ECG Data Loaded</p>
                    <p class="text-sm text-gray-500">Click "Load Random ECG" to begin</p>
                  </div>
                </div>
              </div>
            <% end %>
          </div>

          <%= if @ecg_loaded do %>
            <div class="text-sm text-gray-500 flex items-center gap-2">
              <span>Click on the ECG chart and use</span>
              <kbd class="kbd kbd-sm">k</kbd>
              <kbd class="kbd kbd-sm">j</kbd>
              <span>to switch leads,</span>
              <kbd class="kbd kbd-sm">Space</kbd>
              <span>to play/pause</span>
            </div>
          <% end %>
        </div>

        <div class="flex gap-4 items-center">
          <%= if @ecg_loaded do %>
            <.button phx-click="toggle_playback" variant="primary">
              {if @is_playing, do: "Pause", else: "Play"}
            </.button>
          <% end %>

          <.button phx-click="load_random_ecg">
            {if @ecg_loaded, do: "Load Different ECG", else: "Load Random ECG"}
          </.button>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def handle_event("toggle_playback", _params, socket) do
    new_playing = !socket.assigns.is_playing

    socket =
      socket
      |> assign(is_playing: new_playing)
      |> push_event("playback_changed", %{is_playing: new_playing})

    {:noreply, socket}
  end

  def handle_event("change_lead", %{"lead" => lead_index_str}, socket) do
    case Integer.parse(lead_index_str) do
      {lead_index, ""} when lead_index >= 0 and lead_index < length(socket.assigns.lead_names) ->
        socket =
          socket
          |> assign(current_lead: lead_index)
          |> push_event("lead_changed", %{lead: lead_index})

        {:noreply, socket}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("lead_changed", %{"lead" => lead_index}, socket) when is_integer(lead_index) do
    if lead_index >= 0 and lead_index < length(socket.assigns.lead_names) do
      {:noreply, assign(socket, current_lead: lead_index)}
    else
      {:noreply, socket}
    end
  end

  def handle_event("playback_changed", %{"is_playing" => is_playing}, socket)
      when is_boolean(is_playing) do
    {:noreply, assign(socket, is_playing: is_playing)}
  end

  def handle_event("time_update", %{"elapsed_time" => elapsed_time}, socket) do
    {:noreply, assign(socket, elapsed_time: elapsed_time)}
  end

  def handle_event("playback_ended", _params, socket) do
    {:noreply, assign(socket, is_playing: false)}
  end

  def handle_event("change_display_mode", %{"display_mode" => display_mode}, socket) do
    if display_mode in ["single", "multi"] do
      socket =
        socket
        |> assign(display_mode: display_mode)
        |> push_event("display_mode_changed", %{display_mode: display_mode})

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("change_grid_type", %{"grid_type" => grid_type}, socket) do
    if grid_type in ["medical", "simple"] do
      socket =
        socket
        |> assign(grid_type: grid_type)
        |> push_event("grid_changed", %{grid_type: grid_type})

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("load_random_ecg", _params, socket) do
    record = get_random_record()

    socket =
      socket
      |> assign(ecg_loaded: true, is_playing: false)
      |> push_event("ecg_data_pushed", %{data: record})

    {:noreply, socket}
  end
end
