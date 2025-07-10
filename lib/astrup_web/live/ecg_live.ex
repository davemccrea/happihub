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
    socket =
      assign(socket,
        lead_names: [],
        env: Application.get_env(:astrup, :env),
        ecg_loaded: false
      )

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-12">
        <h1 class="text-2xl font-bold">ECG Test</h1>

        <%= if @ecg_loaded do %>
          <div class="flex gap-4">
            <div>
              <.input
                type="select"
                id="display-mode-selector"
                label="Display Mode"
                name="display-mode"
                value="single"
                options={[{"Single Lead", "single"}, {"All Leads", "multi"}]}
              />
            </div>

            <div id="lead-selector-container">
              <.input
                type="select"
                id="lead-selector"
                label="Current Lead"
                name="lead"
                value={1}
                options={
                  for {name, index} <- Enum.with_index(@lead_names) do
                    {"Lead #{name}", index}
                  end
                }
              />
            </div>

            <div>
              <.input
                type="select"
                id="grid-type-selector"
                label="Grid Type"
                name="grid-type"
                value="simple"
                options={[{"Medical Grid", "medical"}, {"Simple Grid", "simple"}]}
              />
            </div>

            <div>
              <.input
                type="checkbox"
                id="loop-checkbox"
                label="Loop playback"
                name="loop"
                value="false"
              />
            </div>

            <div>
              <.input
                type="checkbox"
                id="debug-checkbox"
                label="Show diagnostics"
                name="debug"
                value="false"
              />
            </div>
          </div>
        <% end %>

        <div class="space-y-4">
          <div class="relative">
            <div
              id="ecg-playback"
              phx-hook="ECGPlayback"
              phx-update="ignore"
              class="w-full"
              data-env={@env}
              data-initial-lead="1"
              data-initial-display-mode="single"
              data-initial-grid-type="simple"
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
            <.button id="play-pause-button" variant="primary">
              Play
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


  def handle_event("load_random_ecg", _params, socket) do
    record = get_random_record()
    lead_names = Map.get(record, "sig_name", [])

    socket =
      socket
      |> assign(ecg_loaded: true, lead_names: lead_names)
      |> push_event("ecg_data_pushed", %{data: record})

    {:noreply, socket}
  end

  def handle_event("playback_changed", _params, socket), do: {:noreply, socket}
  def handle_event("lead_changed", _params, socket), do: {:noreply, socket}
  def handle_event("playback_ended", _params, socket), do: {:noreply, socket}
end
