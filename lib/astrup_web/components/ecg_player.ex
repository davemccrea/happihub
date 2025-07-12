defmodule AstrupWeb.Components.EcgPlayer do
  use AstrupWeb, :live_component

  def update(%{ecg_data: ecg_data} = assigns, socket) when not is_nil(ecg_data) do
    socket =
      socket
      |> assign(assigns)
      |> push_event("load_ecg_data", %{data: ecg_data})

    {:ok, socket}
  end

  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  attr :env, :string, required: true, doc: "Application environment"
  attr :ecg_data, :map, default: nil, doc: "ECG data to be pushed to the hook"

  slot :actions, doc: "Action buttons displayed in the header"
  slot :sidebar, doc: "Content displayed in the sidebar panel"
  slot :instructions, doc: "Help text displayed when ECG is loaded"


  def render(assigns) do
    lead_names = if is_nil(assigns.ecg_data), do: [], else: Map.get(assigns.ecg_data, "sig_name", [])
    assigns = assign(assigns, :lead_names, lead_names)
    
    ~H"""
    <div class="space-y-12 w-full">
      <div class="space-y-4 w-full">
        <%= if @actions != [] do %>
          <div class="flex justify-end gap-4">
            {render_slot(@actions)}
          </div>
        <% end %>

        <div class="relative py-8">
          <div
            id="ecg-player"
            phx-hook="ECGPlayer"
            phx-update="ignore"
            phx-target={@myself}
            class="w-full"
            data-env={@env}
            data-initial-lead="1"
            data-initial-display-mode="single"
            data-initial-grid-type="simple"
          >
            <div data-ecg-chart class="w-full"></div>
          </div>

          <%= if is_nil(@ecg_data) do %>
            <div class="absolute inset-0 flex items-center justify-center bg-base-100/90">
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
          <% end %>

          <%= if not is_nil(@ecg_data) do %>
            <div class="absolute bottom-2 left-2">
              <.button id="play-pause-button" class="btn btn-sm">
                <.icon name="hero-play" class="w-4 h-4" />
                <span class="ml-1">Play</span>
              </.button>
            </div>

            <div class="absolute bottom-2 right-2">
              <%= if @instructions != [] do %>
                {render_slot(@instructions)}
              <% else %>
                <AstrupWeb.Components.EcgInstructions.default_instructions />
              <% end %>
            </div>
          <% end %>
        </div>
      </div>

      <%= if not is_nil(@ecg_data) do %>
        <div class={if @sidebar != [], do: "grid grid-cols-1 lg:grid-cols-2 gap-8", else: "w-full"}>
          <%= if @sidebar != [] do %>
            <div>
              {render_slot(@sidebar)}
            </div>
          <% end %>

          <div class={if @sidebar != [], do: "", else: "w-full"}>
            <div class="space-y-6">
              <div class="card bg-base-200 shadow">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-adjustments-horizontal" class="w-5 h-5" /> ECG Controls
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>
              </div>

              <div class="card bg-base-200 shadow">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-cog-6-tooth" class="w-5 h-5" /> View Options
                  </h2>
                  <div class="space-y-6">
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

                    <div class="space-y-4 w-1/2">
                      <h3 class="text-sm font-medium text-base-content/70">Scale Adjustments</h3>

                      <div class="space-y-3">
                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Grid Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="grid-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="grid-scale-speed" class="text-xs text-base-content/50">
                                25.0 mm/s
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="grid-scale-slider"
                            name="grid-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Amplitude Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="amplitude-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="amplitude-scale-gain" class="text-xs text-base-content/50">
                                10.0 mm/mV
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="amplitude-scale-slider"
                            name="amplitude-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Height Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="height-scale-value" class="text-xs text-base-content/70">
                                1.20x
                              </span>
                              <span id="height-scale-pixels" class="text-xs text-base-content/50">
                                180px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="height-scale-slider"
                            name="height-scale"
                            min="0.95"
                            max="1.45"
                            step="0.01"
                            value="1.2"
                            class="range range-xs w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <h3 class="text-sm font-medium text-base-content/70">Playback Options</h3>

                      <div class="space-y-2">
                        <.input
                          type="checkbox"
                          id="loop-checkbox"
                          label="Loop playback"
                          name="loop"
                          value="true"
                          checked={true}
                        />

                        <.input
                          type="checkbox"
                          id="qrs-indicator-checkbox"
                          label="QRS pulse indicator"
                          name="qrs-indicator"
                          value="true"
                          checked={true}
                        />

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
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  def handle_event("playback_changed", _params, socket), do: {:noreply, socket}
  def handle_event("lead_changed", _params, socket), do: {:noreply, socket}
  def handle_event("playback_ended", _params, socket), do: {:noreply, socket}
end
