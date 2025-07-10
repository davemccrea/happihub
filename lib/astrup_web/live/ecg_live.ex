defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  alias Astrup.EcgDatabases.Ptbxl

  def get_random_record() do
    record =
      Ptbxl.get_all_records()
      |> Ptbxl.Query.filter_high_quality()
      |> Ptbxl.Query.filter_signal_quality()
      |> Enum.random()

    db_name = "ptbxl"
    filename = record.filename_lr

    ecg_data = Astrup.Wfdb.read(db_name, filename)
    qrs = Astrup.Wfdb.detect_qrs(db_name, filename) |> dbg()

    Map.put(ecg_data, "qrs", qrs)
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
      <div class="space-y-8">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">ECG Test</h1>
          <div class="flex gap-4 items-center">
            <%= if @ecg_loaded do %>
              <.button id="play-pause-button" variant="primary">
                Play
              </.button>
            <% end %>

            <.button variant="primary" phx-click="load_random_ecg">
              {if @ecg_loaded, do: "Load Different ECG", else: "Load Random ECG"}
            </.button>
          </div>
        </div>
        
    <!-- ECG Chart - Top Priority -->
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
              <span>Use</span>
              <kbd class="kbd kbd-sm">↑</kbd>
              <kbd class="kbd kbd-sm">↓</kbd>
              <span>or</span>
              <kbd class="kbd kbd-sm">k</kbd>
              <kbd class="kbd kbd-sm">j</kbd>
              <span>to switch leads,</span>
              <kbd class="kbd kbd-sm">Space</kbd>
              <span>to play/pause</span>
            </div>
          <% end %>
        </div>
        
    <!-- Controls - Below ECG -->
        <%= if @ecg_loaded do %>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Primary Controls - Left Section -->
            <div class="lg:col-span-2">
              <div class="bg-base-200 border border-base-300 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-base-content mb-3">ECG Controls</h3>
                <div class="flex gap-4 items-end">
                  <div class="flex-1">
                    <.input
                      type="select"
                      id="display-mode-selector"
                      label="Display Mode"
                      name="display-mode"
                      value="single"
                      options={[{"Single Lead", "single"}, {"All Leads", "multi"}]}
                    />
                  </div>

                  <div id="lead-selector-container" class="flex-1">
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
                </div>
              </div>
            </div>
            
    <!-- Secondary Controls - Right Section -->
            <div class="lg:col-span-1">
              <div class="bg-base-200 border border-base-300 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-base-content mb-3">View Options</h3>
                <div class="space-y-3">
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
                      type="range"
                      id="grid-scale-slider"
                      label="Grid Scale"
                      name="grid-scale"
                      min="0.75"
                      max="1.25"
                      step="0.01"
                      value="1.0"
                      class="range range-sm w-full"
                    />
                    <div class="text-xs text-base-content/60 mt-1 text-center">
                      <span id="grid-scale-value">1.0x</span> (25 mm/s → <span id="grid-scale-speed">25 mm/s</span>)
                    </div>
                  </div>

                  <div>
                    <.input
                      type="range"
                      id="amplitude-scale-slider"
                      label="Amplitude Scale"
                      name="amplitude-scale"
                      min="0.75"
                      max="1.25"
                      step="0.01"
                      value="1.0"
                      class="range range-sm w-full"
                    />
                    <div class="text-xs text-base-content/60 mt-1 text-center">
                      <span id="amplitude-scale-value">1.0x</span> (10 mm/mV → <span id="amplitude-scale-gain">10 mm/mV</span>)
                    </div>
                  </div>

                  <div>
                    <.input
                      type="range"
                      id="height-scale-slider"
                      label="Height Scale"
                      name="height-scale"
                      min="0.95"
                      max="1.45"
                      step="0.01"
                      value="1.2"
                      class="range range-sm w-full"
                    />
                    <div class="text-xs text-base-content/60 mt-1 text-center">
                      <span id="height-scale-value">1.2x</span> (Chart height: <span id="height-scale-pixels">180px</span>)
                    </div>
                  </div>

                  <div class="flex flex-col gap-1">
                    <div>
                      <.input
                        type="checkbox"
                        id="loop-checkbox"
                        label="Loop playback"
                        name="loop"
                        value="true"
                        checked={true}
                      />
                    </div>

                    <div>
                      <.input
                        type="checkbox"
                        id="qrs-indicator-checkbox"
                        label="QRS pulse indicator"
                        name="qrs-indicator"
                        value="true"
                        checked={true}
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
                </div>
              </div>
            </div>
          </div>
        <% end %>
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
